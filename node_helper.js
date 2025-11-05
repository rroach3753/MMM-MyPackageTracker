/* node_helper.js — Ship24 edition (v4.0.0)
 * Fresh v4 architecture for MagicMirror².
 * - Backends: Ship24 Tracking API (Bearer)
 * - Modes: "seed" (POST /v1/trackers/track idempotent) and "list" (GET /v1/trackers + GET /v1/trackers/:id/results)
 * - Robust 429 handling with exponential backoff & jitter
 * - Optional webhook receiver with simple shared-secret verification
 */

const NodeHelper = require('node_helper');
const fetch = require('node-fetch');
const http = require('http');

const S24_BASE = 'https://api.ship24.com';

// -------- utilities --------
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const jitter = (base) => base + Math.floor(Math.random() * 350);

function nowIso(){ return new Date().toISOString(); }

module.exports = NodeHelper.create({
  start(){
    this.config = null;
    this._tmr = null;
    this._busy = false;
    this._webhookServer = null;
    console.log(`[MMM-MyPackageTracker] node_helper v4.0.0 started @ ${nowIso()}`);
  },

  stop(){
    if (this._tmr) clearInterval(this._tmr);
    if (this._webhookServer) try { this._webhookServer.close(); } catch(_){}
  },

  socketNotificationReceived(n, p){
    if (n === 'MMM-MYPACKAGETRACKER_INIT'){
      this.config = p || {};
      if (!this._hasKey()){
        this._emitError('Missing config.ship24ApiKey');
        return;
      }
      this._maybeStartWebhook();
      const every = Math.max(60*1000, Number(this.config.pollIntervalMs || this.config.refreshInterval || 300000));
      this.fetchSafe();
      if (this._tmr) clearInterval(this._tmr);
      this._tmr = setInterval(()=> this.fetchSafe(), every);
      return;
    }
    if(n==='MMM-MYPACKAGETRACKER_FETCH_NOW') this.fetchSafe();
  },

  _hasKey(){ return !!(this.config && typeof this.config.ship24ApiKey === 'string' && this.config.ship24ApiKey.trim()); },

  _headers(){ return { 'Authorization': `Bearer ${this.config.ship24ApiKey}`, 'Content-Type':'application/json', 'Accept':'application/json' }; },

  async _fx(url, opts={}, attempt=1){
    const res = await fetch(url, { ...opts, headers: { ...(opts.headers||{}), ...this._headers() } });
    if (res.status === 429 && attempt < 5){
      const wait = jitter((2**attempt) * 1000);
      if (this.config.debug) console.warn('[MMM-MyPackageTracker] 429 → retry in', wait,'ms', url);
      await sleep(wait);
      return this._fx(url, opts, attempt+1);
    }
    return res;
  },

  async fetchSafe(){
    if (!this._hasKey()) return this._emitError('Missing config.ship24ApiKey');
    if (this._busy) return;
    this._busy = true;
    try{
      const mode = (this.config.mode || '').toLowerCase();
      let parcels = [];
      if (mode === 'seed' || (Array.isArray(this.config.seedTrackers) && this.config.seedTrackers.length>0)){
        parcels = await this._seedMode();
      } else {
        parcels = await this._listMode();
      }
      const deliveredTodayCount = parcels.filter(p => this._deliveredToday(p)).length;
      this.sendSocketNotification('MMM-MYPACKAGETRACKER_DATA', { parcels, deliveredTodayCount, fetchedAt: Date.now() });
    } catch (err){
      console.error('[MMM-MyPackageTracker] Ship24 error:', err?.message || err);
      this._emitError(String(err?.message || err));
    } finally {
      this._busy = false;
    }
  },

  async _seedMode(){
    const seeds = Array.isArray(this.config.seedTrackers) ? this.config.seedTrackers : [];
    const out = [];
    for (const s of seeds){
      const tn = String(s.trackingNumber || s.tracking_number || '').trim();
      if (!tn) continue;
      try{
        const res = await this._trackOnce({
          trackingNumber: tn,
          courierCode: s.courier || s.courierCode || s.courier_code || undefined,
          originCountryCode: s.originCountryCode || s.origin || undefined,
          destinationCountryCode: s.destinationCountryCode || s.destination || undefined,
          clientTrackerId: s.clientTrackerId || undefined,
          shipmentReference: s.shipmentReference || s.description || undefined
        });
        const parcel = this._normalize(res, s);
        if (parcel) out.push(parcel);
      }catch(e){ console.warn('[MMM-MyPackageTracker] seed track error', e?.message || e); }
      await sleep(120);
    }
    return out;
  },

  async _listMode(){
    const out = [];
    let page = 1, more = true;
    const size = Number(this.config.listPageSize || this.config.pageSize || 50);

    while (more){
      const j = await this._listPage(page, size);
      const trackers = j?.data?.items || j?.data || [];
      if (!Array.isArray(trackers) || trackers.length === 0) break;

      for (const t of trackers){
        try{
          const rid = t.trackerId || t.id; if (!rid) continue;
          const rj = await this._trackerResults(rid);
          const parcel = this._normalize({ data: { tracker: t, shipment: rj?.data?.shipment || rj?.shipment } }, { description: t.shipmentReference });
          if (parcel) out.push(parcel);
        }catch(e){ console.warn('[MMM-MyPackageTracker] list results error', e?.message || e); }
        await sleep(80);
      }

      more = trackers.length >= size;
      page += 1;
    }
    return out;
  },

  async _trackOnce(payload){
    const url = `${S24_BASE}/v1/trackers/track`;
    const body = { trackingNumber: payload.trackingNumber };
    if (payload.courierCode) body.courierCode = payload.courierCode;
    if (payload.originCountryCode) body.originCountryCode = payload.originCountryCode;
    if (payload.destinationCountryCode) body.destinationCountryCode = payload.destinationCountryCode;
    if (payload.clientTrackerId) body.clientTrackerId = payload.clientTrackerId;
    if (payload.shipmentReference) body.shipmentReference = payload.shipmentReference;
    const res = await this._fx(url, { method:'POST', body: JSON.stringify(body) });
    if (!res.ok){ const t = await res.text(); throw new Error(`track failed: ${res.status} ${res.statusText} ${t}`); }
    return res.json().catch(()=>({}));
  },

  async _listPage(page, size){
    const url = `${S24_BASE}/v1/trackers?page=${page}&size=${size}`;
    const res = await this._fx(url);
    if (!res.ok){ const t = await res.text(); throw new Error(`list trackers failed: ${res.status} ${res.statusText} ${t}`); }
    return res.json().catch(()=>({}));
  },

  async _trackerResults(trackerId){
    const url = `${S24_BASE}/v1/trackers/${encodeURIComponent(trackerId)}/results`;
    const res = await this._fx(url);
    if (!res.ok){ const t = await res.text(); throw new Error(`results failed: ${res.status} ${res.statusText} ${t}`); }
    return res.json().catch(()=>({}));
  },

  _normalize(json, seed){
    const data = json?.data || json;
    const tr = data?.tracker || {};
    const sh = data?.shipment || {};

    const milestone = String(sh?.statusMilestone || '').toLowerCase();
    const evs = Array.isArray(sh?.events) ? sh.events : [];
    const last = evs.length ? evs[evs.length - 1] : null;

    const status = (milestone==='delivered') ? 'delivered'
                 : (milestone==='out_for_delivery') ? 'out_for_delivery'
                 : (milestone==='in_transit') ? 'in_transit'
                 : 'other';

    const tn = tr.trackingNumber || seed?.trackingNumber || seed?.tracking_number || null;
    const courier = tr.courierCode || seed?.courier || seed?.courierCode || seed?.courier_code || null;
    const s24Url = (tn && courier) ? `https://www.ship24.com/trackings?courier=${encodeURIComponent(courier)}&trackingNumber=${encodeURIComponent(tn)}` : null;

    return {
      carrier: courier || null,
      description: seed?.description || tr.shipmentReference || seed?.shipmentReference || '',
      tracking_status: status,
      tracking_location: last?.location || last?.address || '',
      tracking_url: s24Url,
      tracking_time_estimated: null,
      tracking_time_delivered: status==='delivered' ? (last?.occurrenceDatetime || null) : null,
      time_updated: last?.occurrenceDatetime || null
    };
  },

  _deliveredToday(p){
    if (!p?.tracking_time_delivered) return false;
    const d = new Date(p.tracking_time_delivered);
    const n = new Date();
    return d.getFullYear()===n.getFullYear() && d.getMonth()===n.getMonth() && d.getDate()===n.getDate();
  },

  _emitError(message){ this.sendSocketNotification('MMM-MYPACKAGETRACKER_ERROR', { message }); },

  // ---- webhook (optional) ----
  _maybeStartWebhook(){
    if (!this.config.webhooks || this._webhookServer) return;
    const port = Number(this.config.webhooks.port || 0) || 0;
    const path = String(this.config.webhooks.path || '/ship24/webhook');
    const secret = String(this.config.webhooks.secret || '');
    if (!port){ if (this.config.debug) console.warn('[MMM-MyPackageTracker] webhooks enabled but no port'); return; }

    this._webhookServer = http.createServer((req, res) => {
      if (req.method !== 'POST' || !req.url.startsWith(path)) { res.statusCode=404; return res.end('not found'); }
      // simple shared-secret check via header or query-string (?secret=)
      const url = new URL(req.url, `http://localhost:${port}`);
      const provided = req.headers['x-ship24-secret'] || url.searchParams.get('secret') || '';
      if (secret && provided !== secret){ res.statusCode=401; return res.end('unauthorized'); }

      let raw='';
      req.on('data', c => raw += c);
      req.on('end', () => {
               try {
          const payload = JSON.parse(raw || '{}');

          // Accept both formats:
          // A) Standard: { trackings: [ { tracker, shipment, events } ... ] }
          // B) Simple  : { data: { tracker, shipment, events? } }
          let items = [];

          if (Array.isArray(payload?.trackings) && payload.trackings.length > 0) {
            items = payload.trackings;
          } else if (payload?.data && (payload.data.tracker || payload.data.shipment)) {
            items = [ payload.data ];
          }

          if (this.config.debug) {
            console.log('[MMM-MyPackageTracker] webhook received items:',
              Array.isArray(items) ? items.length : 0);
          }

          const parcels = [];
          for (const it of items) {
            const tracker  = it.tracker  || null;
            const shipment = it.shipment || null;

            // minimal guard — only process when both are present
            if (!tracker || !shipment) continue;

            const parcel = this._normalize({ data: { tracker, shipment } }, {});
            if (parcel) parcels.push(parcel);
          }

          // Emit to UI if we built any parcel(s)
          if (parcels.length > 0) {
            const deliveredTodayCount = parcels.filter(p => this._deliveredToday(p)).length;
            this.sendSocketNotification('MMM-MYPACKAGETRACKER_DATA', {
              parcels, deliveredTodayCount, fetchedAt: Date.now()
            });
          }

          res.statusCode = 200; res.end('ok');
        } catch (e) {
          res.statusCode = 400; res.end('bad json');
        }
      });
    });

    this._webhookServer.listen(port, () => {
      console.log(`[MMM-MyPackageTracker] webhook listening on :${port}${path}`);
    });
  }
});
