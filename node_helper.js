/* node_helper.js — Ship24 edition (v3.5.0)
 * Fixes & polish carried forward from 3.0.2:
 * - Early validation of ship24ApiKey; emit UI error if missing
 * - Graceful 429 handling with exponential backoff + jitter
 * - Better error surfaces to UI
 */

const NodeHelper = require('node_helper');
const fetch = require('node-fetch');
const http = require('http');

const S24_BASE = 'https://api.ship24.com';

function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }
function jitter(base){ return base + Math.floor(Math.random()*350); }

module.exports = NodeHelper.create({
  start(){
    this.config = null;
    this._fetching = false;
    this._tmr = null;
    this._webhookServer = null;
    console.log('[MMM-MyPackageTracker] node_helper (Ship24) v3.5.0 started');
  },

  stop(){ if(this._tmr) clearInterval(this._tmr); if(this._webhookServer) try{ this._webhookServer.close(); }catch(e){} },

  socketNotificationReceived(n,p){
    if(n==='MMM-MYPACKAGETRACKER_INIT'){
      this.config = p || {};
      if(!this.config.ship24ApiKey){
        this.sendSocketNotification('MMM-MYPACKAGETRACKER_ERROR', { message: 'Missing ship24ApiKey in config' });
        return;
      }
      this._ensureWebhook();
      const every = Math.max(60*1000, this.config.refreshInterval || 300000);
      this.fetchSafe();
      if(this._tmr) clearInterval(this._tmr);
      this._tmr = setInterval(()=> this.fetchSafe(), every);
    }
    if(n==='MMM-MYPACKAGETRACKER_FETCH_NOW') this.fetchSafe();
  },

  _headers(){ return { 'Authorization': `Bearer ${this.config.ship24ApiKey}`, 'Content-Type':'application/json','Accept':'application/json' }; },

  async _fetchWith429(url, opts={}, attempt=1){
    const res = await fetch(url, { ...opts, headers: { ...(opts.headers||{}), ...this._headers() } });
    if(res.status===429 && attempt<5){
      const wait = jitter( (2**attempt) * 1000 );
      if(this.config.debug) console.warn('[MMM-MyPackageTracker] 429, retry in', wait,'ms', url);
      await sleep(wait);
      return this._fetchWith429(url, opts, attempt+1);
    }
    return res;
  },

  async fetchSafe(){
    if(this._fetching) return; this._fetching=true;
    try{
      const parcels = await this._collectParcels();
      const deliveredTodayCount = parcels.filter(p=> this._deliveredToday(p)).length;
      this.sendSocketNotification('MMM-MYPACKAGETRACKER_DATA', { parcels, deliveredTodayCount, fetchedAt: Date.now() });
    }catch(err){
      console.error('[MMM-MyPackageTracker] Ship24 error:', err?.message||err);
      this.sendSocketNotification('MMM-MYPACKAGETRACKER_ERROR', { message: String(err?.message||err) });
    }finally{ this._fetching=false; }
  },

  async _collectParcels(){
    const seeds = Array.isArray(this.config.seedTrackers)? this.config.seedTrackers: [];

    if(seeds.length>0){
      const out=[]; for(const s of seeds){
        const tn = String(s.trackingNumber || s.tracking_number || '').trim(); if(!tn) continue;
        try{
          const res = await this._trackOnce({
            trackingNumber: tn,
            courierCode: s.courier || s.courierCode || s.courier_code || undefined,
            originCountryCode: s.originCountryCode || s.origin || undefined,
            destinationCountryCode: s.destinationCountryCode || s.destination || undefined,
            clientTrackerId: s.clientTrackerId || undefined,
            shipmentReference: s.shipmentReference || s.description || undefined
          });
          const parcel = this._normalizeFromShip24Result(res, s);
          if(parcel) out.push(parcel);
        }catch(e){ console.warn('[MMM-MyPackageTracker] track error for', tn, e?.message||e); }
        await sleep(120);
      } return out;
    }

    if(this.config.listAllTrackers){
      const out=[]; let page=1, more=true; const size= Number(this.config.listPageSize||50);
      while(more){
        const pageJson = await this._listTrackersPage(page,size);
        const trackers = pageJson?.data?.items || pageJson?.data || [];
        if(!Array.isArray(trackers) || trackers.length===0) break;
        for(const t of trackers){
          try{
            const rid = t.trackerId || t.id; if(!rid) continue;
            const results = await this._getTrackerResultsById(rid);
            const parcel = this._normalizeFromShip24Result({ data: { tracker: t, shipment: results?.data?.shipment || results?.shipment } }, { description: t.shipmentReference });
            if(parcel) out.push(parcel);
          }catch(e){ console.warn('[MMM-MyPackageTracker] results error', e?.message||e); }
          await sleep(80);
        }
        more = trackers.length>=size; page+=1;
      } return out;
    }

    if(this.config.debug) console.log('[MMM-MyPackageTracker] No seedTrackers and listAllTrackers=false');
    return [];
  },

  async _trackOnce(payload){
    const url = `${S24_BASE}/v1/trackers/track`;
    const body = { trackingNumber: payload.trackingNumber };
    if(payload.courierCode) body.courierCode = payload.courierCode;
    if(payload.originCountryCode) body.originCountryCode = payload.originCountryCode;
    if(payload.destinationCountryCode) body.destinationCountryCode = payload.destinationCountryCode;
    if(payload.clientTrackerId) body.clientTrackerId = payload.clientTrackerId;
    if(payload.shipmentReference) body.shipmentReference = payload.shipmentReference;
    const res = await this._fetchWith429(url, { method:'POST', body: JSON.stringify(body) });
    if(!res.ok){ const txt = await res.text(); throw new Error(`Ship24 track failed: ${res.status} ${res.statusText} ${txt}`); }
    return res.json().catch(()=>({}));
  },

  async _listTrackersPage(page=1,size=50){
    const url = `${S24_BASE}/v1/trackers?page=${page}&size=${size}`;
    const res = await this._fetchWith429(url);
    if(!res.ok){ const txt=await res.text(); throw new Error(`Ship24 list trackers failed: ${res.status} ${res.statusText} ${txt}`); }
    return res.json().catch(()=>({}));
  },

  async _getTrackerResultsById(trackerId){
    const url = `${S24_BASE}/v1/trackers/${encodeURIComponent(trackerId)}/results`;
    const res = await this._fetchWith429(url);
    if(!res.ok){ const txt=await res.text(); throw new Error(`Ship24 tracker results failed: ${res.status} ${res.statusText} ${txt}`); }
    return res.json().catch(()=>({}));
  },

  _normalizeFromShip24Result(json, seed){
    const data = json?.data || json; const tr = data?.tracker || {}; const sh = data?.shipment || {};
    const milestone = String(sh?.statusMilestone || '').toLowerCase();
    const evs = Array.isArray(sh?.events) ? sh.events : []; const last = evs.length? evs[evs.length-1]: null;
    const tracking_status = (milestone==='delivered')? 'delivered' : (milestone==='out_for_delivery')? 'out_for_delivery' : (milestone==='in_transit')? 'in_transit' : 'other';
    const location = last?.location || last?.address || '';
    const deliveredAt = tracking_status==='delivered' ? (last?.occurrenceDatetime || null) : null;
    const updatedAt = last?.occurrenceDatetime || null;

    const tn = tr.trackingNumber || seed?.trackingNumber || seed?.tracking_number || null;
    const courier = tr.courierCode || seed?.courier || seed?.courierCode || seed?.courier_code || null;
    const s24Url = (tn && courier) ? `https://www.ship24.com/trackings?courier=${encodeURIComponent(courier)}&trackingNumber=${encodeURIComponent(tn)}` : null;

    return {
      carrier: courier,
      description: seed?.description || tr.shipmentReference || seed?.shipmentReference || '',
      tracking_status,
      tracking_location: location,
      tracking_url: s24Url,
      tracking_time_estimated: null,
      tracking_time_delivered: deliveredAt,
      time_updated: updatedAt
    };
  },

  _deliveredToday(p){ if(!p?.tracking_time_delivered) return false; const d=new Date(p.tracking_time_delivered); const n=new Date(); return d.getFullYear()===n.getFullYear() && d.getMonth()===n.getMonth() && d.getDate()===n.getDate(); },

  _ensureWebhook(){
    if(!this.config.useWebhooks) return; const port=Number(this.config.webhookPort||0)||0; const path=String(this.config.webhookPath||'/ship24/webhook');
    if(!port){ console.warn('[MMM-MyPackageTracker] useWebhooks=true but no webhookPort configured'); return; }
    if(this._webhookServer) return;
    this._webhookServer = http.createServer((req,res)=>{
      if(req.method!=='POST' || !req.url.startsWith(path)){ res.statusCode=404; return res.end('not found'); }
      let raw=''; req.on('data',c=>raw+=c); req.on('end',()=>{
        try{
          const payload = JSON.parse(raw||'{}'); const d=payload?.data||payload; const shipment=d?.shipment||null; const tracker=d?.tracker||null;
          if(shipment && tracker){ const parcel=this._normalizeFromShip24Result({ data:{ shipment, tracker } },{}); const deliveredTodayCount= parcel && this._deliveredToday(parcel) ? 1:0; this.sendSocketNotification('MMM-MYPACKAGETRACKER_DATA',{ parcels: parcel?[parcel]:[], deliveredTodayCount, fetchedAt: Date.now() }); }
          res.statusCode=200; res.end('ok');
        }catch(e){ res.statusCode=400; res.end('bad json'); }
      });
    });
    this._webhookServer.listen(port, ()=> console.log(`[MMM-MyPackageTracker] webhook receiver listening on :${port}${path}`));
  }
});
