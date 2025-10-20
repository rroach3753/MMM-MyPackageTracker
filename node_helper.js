/* MMM-MyPackageTracker v2.0.0 - node_helper.js */
const NodeHelper = require("node_helper");
const fetch = require("node-fetch");
const dayjs = require("dayjs");

const API_BASE = "https://api.onetracker.app";

// Coerce undefined/null/empty/"unknown" -> null
function coerce(v){
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return !s || s.toLowerCase()==="unknown" ? null : s;
}

function normalizeParcel(p){
  const out = { ...p };
  out.carrier = coerce(p.carrier);
  out.description = coerce(p.description);
  out.tracking_status = coerce(p.tracking_status);
  out.tracking_location = coerce(p.tracking_location);
  out.tracking_url = coerce(p.tracking_url);
  out.tracking_time_estimated = p.tracking_time_estimated || null;
  out.tracking_time_delivered = p.tracking_time_delivered || null;
  out.time_updated = p.time_updated || p.updated_at || null;
  return out;
}

module.exports = NodeHelper.create({
  start(){
    this.config = null;
    this.debug = false;
    this.session = { token:null, expiration:null };
    this._fetching = false;
    console.log("[MMM-MyPackageTracker] helper v2.0.0 started");
  },

  socketNotificationReceived(n,p){
    if(n==="MMM-MYPACKAGETRACKER_INIT"){
      this.config = p||{}; this.debug = !!this.config.debug;
      this.fetchSafe();
    }
    if(n==="MMM-MYPACKAGETRACKER_FETCH_NOW") this.fetchSafe();
  },

  async ensureToken(){
    const now = Date.now();
    const exp = this.session.expiration ? new Date(this.session.expiration).getTime() : 0;
    if (this.session.token && exp - now > 60*1000) return this.session.token;

    const { email, password } = this.config;
    if (!email || !password) throw new Error("Missing OneTracker credentials");

    const res = await fetch(`${API_BASE}/auth/token`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ email, password }) });
    if(!res.ok){ const t = await res.text(); throw new Error(`Auth failed: ${res.status} ${res.statusText} ${t}`); }
    const data = await res.json();
    this.session = { token: data?.session?.token, expiration: data?.session?.expiration || null };
    if(!this.session.token) throw new Error("Auth response missing session.token");
    if(this.debug) console.log("[MMM-MyPackageTracker] token exp:", this.session.expiration);
    return this.session.token;
  },

  async fetch(){
    const token = await this.ensureToken();
    let res = await fetch(`${API_BASE}/parcels`, { headers:{ 'x-api-token': token }});
    if(res.status===401){ await this.ensureToken(); res = await fetch(`${API_BASE}/parcels`, { headers:{ 'x-api-token': this.session.token }}); }
    if(!res.ok){ const t = await res.text(); throw new Error(`Parcels failed: ${res.status} ${res.statusText} ${t}`); }
    const body = await res.json();
    const list = Array.isArray(body) ? body : (body?.parcels || []);

    const lowered = (this.config.statusFilter || []).map(s=>String(s).toLowerCase());
    const filtered = list.filter(p=>{
      if(!this.config.showArchived && p.is_archived) return false;
      if(lowered.length){ const st = String(p.tracking_status||"").toLowerCase(); if(!lowered.includes(st)) return false; }
      return true;
    }).map(normalizeParcel);

    const today = dayjs();
    const deliveredTodayCount = filtered.filter(p=> p.tracking_time_delivered && dayjs(p.tracking_time_delivered).isSame(today,'day')).length;

    this.sendSocketNotification("MMM-MYPACKAGETRACKER_DATA", { parcels: filtered, deliveredTodayCount, fetchedAt: Date.now() });
  },

  async fetchSafe(){
    if(this._fetching) return; this._fetching = true;
    try{ await this.fetch(); }
    catch(e){ console.error("[MMM-MyPackageTracker] fetch error:", e.message); this.sendSocketNotification("MMM-MYPACKAGETRACKER_ERROR", { message: e.message }); }
    finally{ this._fetching = false; }
  }
});
