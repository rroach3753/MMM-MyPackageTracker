/* node_helper.js — Ship24 edition (v3.0.0)
 * Uses Ship24 Tracking API with Bearer token auth.
 * Default mode: idempotent polling via POST /v1/trackers/track for each configured seed tracker.
 * Optional webhook receiver (disabled by default).
 */

const NodeHelper = require('node_helper');
const fetch = require('node-fetch');
const http = require('http');

const S24_BASE = 'https://api.ship24.com';

module.exports = NodeHelper.create({
  start() {
    this.config = null;
    this._fetching = false;
    this._tmr = null;
    this._webhookServer = null;
    console.log('[MMM-MyPackageTracker] node_helper (Ship24) v3.0.0 started');
  },

  stop() {
    if (this._tmr) clearInterval(this._tmr);
    if (this._webhookServer) try { this._webhookServer.close(); } catch(e) {}
  },

  socketNotificationReceived(n, p) {
    if (n === 'MMM-MYPACKAGETRACKER_INIT') {
      this.config = p || {};
      this._ensureWebhook();
      const every = Math.max(60 * 1000, this.config.refreshInterval || 300000);
      this.fetchSafe();
      if (this._tmr) clearInterval(this._tmr);
      this._tmr = setInterval(() => this.fetchSafe(), every);
      return;
    }
    if (n === 'MMM-MYPACKAGETRACKER_FETCH_NOW') {
      this.fetchSafe();
    }
  },

  _headers() {
    const key = this.config.ship24ApiKey;
    if (!key) throw new Error('Missing config.ship24ApiKey');
    return {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  },

  async fetchSafe() {
    if (this._fetching) return;
    this._fetching = true;
    try {
      const parcels = await this._collectParcels();
      const deliveredTodayCount = parcels.filter(p => this._deliveredToday(p)).length;
      this.sendSocketNotification('MMM-MYPACKAGETRACKER_DATA', {
        parcels,
        deliveredTodayCount,
        fetchedAt: Date.now()
      });
    } catch (err) {
      console.error('[MMM-MyPackageTracker] Ship24 error:', err?.message || err);
      this.sendSocketNotification('MMM-MYPACKAGETRACKER_ERROR', { message: String(err?.message || err) });
    } finally {
      this._fetching = false;
    }
  },

  async _collectParcels() {
    const seeds = Array.isArray(this.config.seedTrackers) ? this.config.seedTrackers : [];

    if (seeds.length === 0) {
      if (this.config.debug) console.log('[MMM-MyPackageTracker] No seedTrackers configured; returning empty list');
      return [];
    }

    const parcels = [];
    for (const s of seeds) {
      const tn = String(s.trackingNumber || s.tracking_number || '').trim();
      if (!tn) continue;
      try {
        const res = await this._trackOnce({
          trackingNumber: tn,
          courierCode: s.courier || s.courierCode || s.courier_code || undefined,
          originCountryCode: s.originCountryCode || s.origin || undefined,
          destinationCountryCode: s.destinationCountryCode || s.destination || undefined,
          clientTrackerId: s.clientTrackerId || undefined,
          shipmentReference: s.shipmentReference || s.description || undefined
        });
        const parcel = this._normalizeFromShip24Result(res, s);
        if (parcel) parcels.push(parcel);
      } catch (e) {
        console.warn('[MMM-MyPackageTracker] track error for', tn, e?.message || e);
      }
      await new Promise(r => setTimeout(r, 150));
    }
    return parcels;
  },

  async _trackOnce(payload) {
    const url = `${S24_BASE}/v1/trackers/track`;
    const body = { trackingNumber: payload.trackingNumber };
    if (payload.courierCode) body.courierCode = payload.courierCode;
    if (payload.originCountryCode) body.originCountryCode = payload.originCountryCode;
    if (payload.destinationCountryCode) body.destinationCountryCode = payload.destinationCountryCode;
    if (payload.clientTrackerId) body.clientTrackerId = payload.clientTrackerId;
    if (payload.shipmentReference) body.shipmentReference = payload.shipmentReference;

    const res = await fetch(url, { method: 'POST', headers: this._headers(), body: JSON.stringify(body) });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Ship24 track failed: ${res.status} ${res.statusText} ${txt}`);
    }
    return res.json().catch(() => ({}));
  },

  _normalizeFromShip24Result(json, seed) {
    const data = json?.data || json;

    const courier = data?.tracker?.courierCode || seed?.courier || seed?.courierCode || seed?.courier_code || null;
    const shipment = data?.shipment || {};
    const milestone = (shipment?.statusMilestone || '').toLowerCase();
    const tracking_status = this._mapMilestone(milestone);

    const evs = Array.isArray(shipment?.events) ? shipment.events : [];
    const last = evs.length ? evs[evs.length - 1] : null;

    const location = last?.location || last?.address || '';
    const deliveredAt = tracking_status === 'delivered' ? (last?.occurrenceDatetime || null) : null;
    const updatedAt = last?.occurrenceDatetime || null;

    return {
      carrier: courier,
      description: seed?.description || seed?.shipmentReference || '',
      tracking_status,
      tracking_location: location,
      tracking_url: null,
      tracking_time_estimated: null,
      tracking_time_delivered: deliveredAt,
      time_updated: updatedAt
    };
  },

  _mapMilestone(m) {
    if (m === 'delivered') return 'delivered';
    if (m === 'out_for_delivery') return 'out_for_delivery';
    if (m === 'in_transit') return 'in_transit';
    return 'other';
  },

  _deliveredToday(p) {
    if (!p?.tracking_time_delivered) return false;
    const d = new Date(p.tracking_time_delivered);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  },

  _ensureWebhook() {
    if (!this.config.useWebhooks) return;
    const port = Number(this.config.webhookPort || 0) || 0;
    const path = String(this.config.webhookPath || '/ship24/webhook');
    if (!port) { console.warn('[MMM-MyPackageTracker] useWebhooks=true but no webhookPort configured; skipping server'); return; }
    if (this._webhookServer) return;

    this._webhookServer = http.createServer((req, res) => {
      if (req.method !== 'POST' || !req.url.startsWith(path)) { res.statusCode = 404; return res.end('not found'); }
      let raw='';
      req.on('data', chunk => raw += chunk);
      req.on('end', () => {
        try {
          const payload = JSON.parse(raw || '{}');
          const d = payload?.data || payload;
          const shipment = d?.shipment || null;
          const tracker = d?.tracker || null;
          if (shipment && tracker) {
            const parcel = this._normalizeFromShip24Result({ data: { shipment, tracker } }, {});
            const deliveredTodayCount = parcel && this._deliveredToday(parcel) ? 1 : 0;
            this.sendSocketNotification('MMM-MYPACKAGETRACKER_DATA', { parcels: parcel ? [parcel] : [], deliveredTodayCount, fetchedAt: Date.now() });
          }
          res.statusCode = 200; res.end('ok');
        } catch(e) { res.statusCode = 400; res.end('bad json'); }
      });
    });
    this._webhookServer.listen(port, () => console.log(`[MMM-MyPackageTracker] webhook receiver listening on :${port}${path}`));
  }
});
