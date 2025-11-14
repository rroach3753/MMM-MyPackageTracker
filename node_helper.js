/*
 * MMM-MyPackageTracker v5.0.0 — node_helper
 */
const NodeHelper = require('node_helper');
const fetch = require('node-fetch');
const dayjs = require('dayjs');

const CANDIDATE_BASES = (override) => [
  override,
  'https://api.ship24.com/public/v1',
  'https://api.ship24.com/v1',
  'https://api.ship24.com'
].filter(Boolean);

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

module.exports = NodeHelper.create({
  start() {
    this.cfg = null;
    this.base = null;
    this.timer = null;
  },

  stop() {
    if (this.timer) clearInterval(this.timer);
  },

  socketNotificationReceived(notification, payload) {
    if (notification === 'CONFIG') {
      this.cfg = payload || {};
      if (!this.cfg.ship24ApiKey) {
        this.sendSocketNotification('ERROR', { message: 'Missing ship24ApiKey' });
        return;
      }
      this.autodiscoverBase()
        .then(() => {
          this.sendSocketNotification('BASE_SELECTED', { base: this.base });
          this.cycle();
          if (this.timer) clearInterval(this.timer);
          const interval = Math.max(60*1000, Number(this.cfg.pollIntervalMs)|| (5*60*1000));
          this.timer = setInterval(() => this.cycle(), interval);
        })
        .catch(err => {
          this.sendSocketNotification('ERROR', { message: 'Auto-discovery failed: ' + (err && err.message || err) });
        });
    }
  },

  async autodiscoverBase() {
    for (const b of CANDIDATE_BASES(this.cfg.ship24BaseUrl)) {
      try {
        const url = `${b}/trackers?page=1&size=1`;
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${this.cfg.ship24ApiKey}`, 'Accept':'application/json' }});
        const ct = (res.headers.get('content-type')||'').toLowerCase();
        if (res.ok && ct.includes('application/json')) {
          this.base = b; return;
        }
      } catch (e) { /* try next */ }
    }
    throw new Error('No Ship24 route accepted this key (tried /public/v1, /v1, unversioned)');
  },

  async cycle() {
    try {
      const items = (this.cfg.mode === 'seed') ?
        await this.seedMode() : await this.listMode();
      this.sendSocketNotification('DATA', {
        items,
        meta: { base: this.base, lastRunAt: dayjs().toISOString() }
      });
    } catch (err) {
      this.sendSocketNotification('ERROR', { message: (err && err.message) || String(err) });
    }
  },

  mapMilestone(ms) {
    const m = (ms || '').toLowerCase();

    // Map Ship24 normalized milestones to your display buckets:
    // https://docs.ship24.com/status/
    switch (m) {
      case 'delivered':
        return 'Delivered';

      case 'out_for_delivery':
        return 'Out for delivery';

      case 'in_transit':
        return 'In transit';

      // Newly recognized milestones → keep them visible and meaningful:
      case 'info_received':      // label created / preparing by shipper
      case 'pending':            // no events yet or not found
        return 'Pending';

      case 'available_for_pickup':
        return 'To pick up';

      case 'failed_attempt':
        return 'Failed attempt';

      case 'exception':
        return 'Exception';

      default:
        return 'Other';
    }
  },
  
  asItem(from) {
    const link = from && from.trackingNumber ? `https://www.ship24.com/trackings/${encodeURIComponent(from.trackingNumber)}` : null;
    return {
      trackingNumber: from.trackingNumber,
      courier: (from.courierCode && from.courierCode[0]) || from.courier || null,
      description: from.description || from.shipmentReference || null,
      group: this.mapMilestone(from.statusMilestone),
      link
    };
  },

  async listMode() {
    const page = 1, size = Math.max(1, Number(this.cfg.listPageSize)||50);
    const url = `${this.base}/trackers?page=${page}&size=${size}`;
    const json = await this.httpJson('GET', url);

    // --- FIX: normalize array across response shapes ---
    const root = (json && json.data) ? json.data : json;
    const dataArr = Array.isArray(root) ? root
                  : Array.isArray(root?.trackers) ? root.trackers
                  : Array.isArray(root?.items) ? root.items
                  : [];
    // ---------------------------------------------------

    const ids = [];
    const items = [];
    for (const entry of dataArr) {
      const trackerId = entry.trackerId || entry.id || (entry.tracker && entry.tracker.trackerId);
      if (trackerId) ids.push(trackerId);
    }

    for (const id of ids) {
      const resJson = await this.httpJson('GET', `${this.base}/trackers/${encodeURIComponent(id)}/results`);
      const tracker = (resJson && (resJson.tracker || resJson.data?.tracker)) || {};
      const shipment = (resJson && (resJson.shipment || resJson.data?.shipment)) || {};
      const item = this.asItem({
        trackingNumber: tracker.trackingNumber,
        courierCode: tracker.courierCode,
        description: tracker.shipmentReference,
        statusMilestone: shipment.statusMilestone
      });
      items.push(item);
    }
    return items;
  },

  async seedMode() {
    const items = [];
    const list = Array.isArray(this.cfg.seedTrackers) ? this.cfg.seedTrackers : [];
    for (const t of list) {
      const body = {
        trackingNumber: t.trackingNumber,
        courier: t.courier || undefined,
        description: t.description || undefined
      };
      const json = await this.httpJson('POST', `${this.base}/trackers/track`, body);
      // The response can include an array under data.trackings[]. Use first.
      const trackings = json && json.data && (json.data.trackings || json.data || []);
      const first = Array.isArray(trackings) ? trackings[0] : trackings;
      const tracker = (first && (first.tracker || first)) || {};
      const shipment = (first && first.shipment) || {};
      const item = this.asItem({
        trackingNumber: tracker.trackingNumber,
        courierCode: tracker.courierCode,
        description: tracker.shipmentReference,
        statusMilestone: shipment.statusMilestone
      });
      items.push(item);
    }
    return items;
  },

  async httpJson(method, url, body) {
    const headers = {
      'Authorization': `Bearer ${this.cfg.ship24ApiKey}`,
      'Accept': 'application/json'
    };
    if (body) headers['Content-Type'] = 'application/json';

    let attempt = 0;
    while (true) {
      attempt++;
      const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
      const ct = (res.headers.get('content-type') || '').toLowerCase();
      if (res.status === 429) {
        // backoff with jitter
        const base = 1000 * Math.pow(2, Math.min(attempt, 5));
        const wait = Math.floor(base + Math.random() * 500);
        if (this.cfg.debug) console.log('[MMM-MyPackageTracker] 429; backing off', wait, 'ms');
        await sleep(wait); continue;
      }
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status} for ${url} — ${text.substring(0,200)}`);
      }
      if (!ct.includes('application/json')) {
        const text = await res.text().catch(() => '');
        throw new Error(`Non-JSON response for ${url}: ${text.substring(0,120)}`);
      }
      return await res.json();
    }
  }
});
