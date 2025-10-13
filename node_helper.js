
const NodeHelper = require("node_helper");
const fetch = require("node-fetch");
const dayjs = require("dayjs");

const API_BASE = "https://api.onetracker.app";
const AUTH_URL = `${API_BASE}/auth/token`;
const PARCELS_URL = `${API_BASE}/parcels`;

// Map common carriers to icon filenames
const ICONS = {/* deprecated */
  "FedEx": "fedex.svg",
  "UPS": "ups.svg",
  "USPS": "usps.svg",
  "DHL": "dhl.svg",
  "Amazon Logistics": "amazon.svg",
  "Canada Post": "canadapost.svg"
};


// Map carriers to Simple Icons slugs (https://simpleicons.org)
const SIMPLE_ICONS = {"FedEx":"fedex","UPS":"ups","USPS":"unitedstatespostalservice","DHL":"dhl","Amazon Logistics":"amazon","Amazon":"amazon","Canada Post":"canadapost"};
function resolveLogo(p){
  const slug = SIMPLE_ICONS[p.carrier] || null;
  return slug ? `https://cdn.simpleicons.org/${slug}` : null;
}

module.exports = NodeHelper.create({
  start() {
    this.config = null;
    this.timer = null;
    this.session = { token: null, expiration: null };
    this.lastSnapshot = new Map(); // parcel_id -> tracking_status
  },

  stop() {
    if (this.timer) clearTimeout(this.timer);
  },

  socketNotificationReceived(notification, payload) {
    if (notification === "OT_CONFIG") {
      this.config = payload;
      this.scheduleNow();
    }
  },

  scheduleNow() {
    if (this.timer) clearTimeout(this.timer);
    this.bootstrap().finally(() => this.scheduleNext());
  },

  scheduleNext() {
    const interval = Math.max(60_000, Number(this.config?.refreshInterval || 300_000));
    this.timer = setTimeout(() => this.scheduleNow(), interval);
  },

  tokenExpiredSoon() {
    if (!this.session.expiration) return true;
    const exp = new Date(this.session.expiration).getTime();
    return (Date.now() + 60 * 1000) >= exp; // refresh if <60s left
  },

  async ensureAuth() {
    if (this.session.token && !this.tokenExpiredSoon()) return;

    const { email, password } = this.config || {};
    if (!email || !password) throw new Error("OneTracker email/password missing in config.");

    const res = await fetch(AUTH_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Auth failed (${res.status}): ${text}`);
    }

    const data = await res.json();
    this.session.token = data?.session?.token || null;
    this.session.expiration = data?.session?.expiration || null;
    if (!this.session.token) throw new Error("No token returned by OneTracker.");
  },

  async fetchParcels() {
    await this.ensureAuth();

    const res = await fetch(PARCELS_URL, {
      headers: { "accept": "application/json", "x-api-token": this.session.token }
    });

    if (res.status === 401) {
      // Token invalid/expired: re-auth once and retry
      this.session.token = null;
      await this.ensureAuth();
      return this.fetchParcels();
    }

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Fetch parcels failed (${res.status}): ${text}`);
    }

    const data = await res.json();
    let items = Array.isArray(data?.parcels) ? data.parcels : [];

    const showArchived = !!this.config?.showArchived;
    const allowed = (this.config?.statusFilter || []).map(s => String(s).toLowerCase());

    items = items.filter(p => showArchived || p.is_archived === 0);
    if (allowed.length) {
      items = items.filter(p => allowed.includes(String(p.tracking_status || "").toLowerCase()));
    }

    // Decorate items with computed fields used by the UI
    const now = dayjs();
    const todayStart = now.startOf('day');
    const todayEnd = now.endOf('day');

    items.forEach(p => {
      // icon path
      const iconFile = ICONS[p.carrier] || null;
      p._iconPath = resolveLogo(p, this.config);

      // delivered today flag
      const delivered = p.tracking_time_delivered ? dayjs(p.tracking_time_delivered) : null;
      p._deliveredToday = delivered ? delivered.isAfter(todayStart) && delivered.isBefore(todayEnd) : false;

      // display time: prefer delivered time, then ETA, then last updated
      const pick = p.tracking_time_delivered || p.tracking_time_estimated || p.time_updated;
      if (pick) {
        const d = dayjs(pick);
        p._displayTime = d.format('MMM D, h:mm A');
      } else {
        p._displayTime = '';
      }
    });

    // Sort: out_for_delivery first, then by chosen sort
    const sortBy = this.config?.sortBy || 'time_updated';
    items.sort((a, b) => {
      const s = (x) => (x.tracking_status || '').toLowerCase();
      if (s(a) === 'out_for_delivery' && s(b) !== 'out_for_delivery') return -1;
      if (s(a) !== 'out_for_delivery' && s(b) === 'out_for_delivery') return 1;

      const pick = (obj) => (
        sortBy === 'eta' ? obj.tracking_time_estimated :
        sortBy === 'status' ? obj.tracking_status :
        obj.time_updated
      );
      const av = pick(a) || '';
      const bv = pick(b) || '';
      return String(bv).localeCompare(String(av));
    });

    return items;
  },

  detectDeliveries(current) {
    const delivered = [];
    const map = new Map();

    current.forEach(p => {
      map.set(p.id, p.tracking_status || "");
      const before = this.lastSnapshot.get(p.id);
      const now = (p.tracking_status || '').toLowerCase();
      if (now === 'delivered' && before && before.toLowerCase() !== 'delivered') {
        delivered.push(p);
      }
    });

    this.lastSnapshot = map;
    return delivered;
  },

  async bootstrap() {
    try {
      const parcels = await this.fetchParcels();
      const deliveredTodayCount = parcels.filter(p => p._deliveredToday).length;
      const newlyDelivered = this.detectDeliveries(parcels);
      newlyDelivered.forEach(p => this.sendSocketNotification('OT_DELIVERED', {
        id: p.id, carrier: p.carrier, description: p.description,
        tracking_id: p.tracking_id, when: p.tracking_time_delivered
      }));

      this.sendSocketNotification('OT_DATA', {
        parcels,
        totalCount: parcels.length,
        deliveredTodayCount
      });
    } catch (e) {
      this.sendSocketNotification('OT_ERROR', e?.message || String(e));
    }
  }
});
