/* MMM-MyPackageTracker v5.0.3 */
const NodeHelper = require('node_helper');
const fetch = require('node-fetch');
const dayjs = require('dayjs');

const CANDIDATE_BASES = (override)=>[override,'https://api.ship24.com/public/v1','https://api.ship24.com/v1','https://api.ship24.com'].filter(Boolean);
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));

function extractResult(obj){
  const d = obj && obj.data ? obj.data : obj;
  if (d && (d.tracker || d.shipment || Array.isArray(d?.events))) {
    return { tracker: d.tracker||{}, shipment: d.shipment||{}, events: Array.isArray(d.events)?d.events:[] };
  }
  const t0 = Array.isArray(d?.trackings) ? d.trackings[0] : null;
  if (t0) {
    return { tracker: t0.tracker||{}, shipment: t0.shipment||{}, events: Array.isArray(t0.events)?t0.events:[] };
  }
  return { tracker:{}, shipment:{}, events:[] };
}

module.exports = NodeHelper.create({
  start(){ this.cfg=null; this.base=null; this.timer=null; },
  stop(){ if (this.timer) clearInterval(this.timer); },

  socketNotificationReceived(n,p){ if(n==='CONFIG'){ this.cfg=p||{}; if(!this.cfg.ship24ApiKey){ this.sendSocketNotification('ERROR',{message:'Missing ship24ApiKey'}); return; }
    this.autodiscoverBase().then(()=>{ this.sendSocketNotification('BASE_SELECTED',{base:this.base}); this.cycle(); if(this.timer) clearInterval(this.timer); const iv=Math.max(60*1000, Number(this.cfg.pollIntervalMs)||(5*60*1000)); this.timer=setInterval(()=>this.cycle(), iv); }).catch(err=> this.sendSocketNotification('ERROR',{message:'Auto-discovery failed: '+(err&&err.message||err)})); } },

  async autodiscoverBase(){ for(const b of CANDIDATE_BASES(this.cfg.ship24BaseUrl)){ try{ const url=`${b}/trackers?page=1&size=1`; const res=await fetch(url,{headers:{'Authorization':`Bearer ${this.cfg.ship24ApiKey}`,'Accept':'application/json'}}); const ct=(res.headers.get('content-type')||'').toLowerCase(); if(res.ok && ct.includes('application/json')){ this.base=b; return; } }catch(_){} } throw new Error('No Ship24 route accepted this key (tried /public/v1, /v1, unversioned)'); },

  async cycle(){ try{ const items=(this.cfg.mode==='seed')?await this.seedMode():await this.listMode(); this.sendSocketNotification('DATA',{items, meta:{base:this.base, lastRunAt:dayjs().toISOString()}});}catch(err){ this.sendSocketNotification('ERROR',{message:(err&&err.message)||String(err)}) } },

  mapMilestone(ms){ const m=(ms||'').toLowerCase(); switch(m){ case 'delivered': return 'Delivered'; case 'out_for_delivery': return 'Out for delivery'; case 'in_transit': return 'In transit'; case 'info_received': case 'pending': return 'Pending'; case 'available_for_pickup': return 'To pick up'; case 'failed_attempt': return 'Failed attempt'; case 'exception': return 'Exception'; default: return 'Other'; } },

  asItem(from){ const tn=from.trackingNumber||null; const cc0=Array.isArray(from.courierCode)&&from.courierCode.length?from.courierCode[0]:(from.courier||null); const desc=from.description||null; const link=tn?`https://www.ship24.com/trackings/${encodeURIComponent(tn)}`:null; return { trackingNumber:tn, courier:cc0, description:desc, group:this.mapMilestone(from.statusMilestone), link }; },

  async listMode(){
    const page=1, size=Math.max(1, Number(this.cfg.listPageSize)||50);
    const url=`${this.base}/trackers?page=${page}&size=${size}`;
    const json=await this.httpJson('GET', url);

    const root=(json&&json.data)?json.data:json;
    const dataArr=Array.isArray(root)?root: (Array.isArray(root?.trackers)?root.trackers: (Array.isArray(root?.items)?root.items: []));
    if(this.cfg.debug) console.log('[MMM-MyPackageTracker] list: trackers_count =', dataArr.length);

    const index=new Map();
    for(const entry of dataArr){ const id=entry.trackerId||entry.id||entry?.tracker?.trackerId; if(!id) continue; index.set(id, { trackingNumber: entry.trackingNumber||entry?.tracker?.trackingNumber||null, courierCode: Array.isArray(entry.courierCode)?entry.courierCode:(Array.isArray(entry?.tracker?.courierCode)?entry.tracker.courierCode:[]), title: entry.shipmentReference||entry?.tracker?.shipmentReference||null }); }

    const items=[];
    for(const [id, fb] of index.entries()){
      const resJson=await this.httpJson('GET', `${this.base}/trackers/${encodeURIComponent(id)}/results`);
      const {tracker, shipment, events} = extractResult(resJson);

      // Robust milestone: shipment -> latest event -> statusCategory -> pending
      let ms = shipment.statusMilestone || null;
      if(!ms && Array.isArray(events) && events.length){
        const latest = events.reduce((best,e)=>{ const bt=Date.parse(best?.occurrenceDatetime||'')||0; const et=Date.parse(e?.occurrenceDatetime||'')||0; return et>=bt?e:best; }, events[0]);
        ms = latest?.statusMilestone || null;
      }
      if(!ms && shipment.statusCategory){
        const cat = (shipment.statusCategory||'').toLowerCase();
        const known = ['in_transit','out_for_delivery','available_for_pickup','failed_attempt','exception','delivered','pending','info_received'];
        if(known.includes(cat)) ms = cat;
      }
      if(!ms && (!events || events.length===0)) ms = 'pending';

      const tn = tracker.trackingNumber || fb.trackingNumber || null;
      const ccs = Array.isArray(tracker.courierCode)&&tracker.courierCode.length?tracker.courierCode:(Array.isArray(fb.courierCode)?fb.courierCode:[]);
      const title = tracker.shipmentReference || fb.title || null;

      const item=this.asItem({ trackingNumber: tn, courierCode: ccs, description: title, statusMilestone: ms });
      if(this.cfg.debug && items.length<2) console.log('[MMM-MyPackageTracker] chosen milestone:', ms, '| shipment:', shipment.statusMilestone, '| events:', events.length);
      items.push(item);
    }
    return items;
  },

  async seedMode(){ const items=[]; const list=Array.isArray(this.cfg.seedTrackers)?this.cfg.seedTrackers:[]; for(const t of list){ const body={trackingNumber:t.trackingNumber, courier:t.courier||undefined, description:t.description||undefined}; const json=await this.httpJson('POST', `${this.base}/trackers/track`, body); const trackings=json?.data?.trackings||json?.data||[]; const first=Array.isArray(trackings)?trackings[0]:trackings; const tracker=(first?.tracker)||first||{}; const shipment=first?.shipment||{}; const events=first?.events||[]; let ms=shipment.statusMilestone||null; if(!ms && Array.isArray(events)&&events.length){ const latest=events.reduce((b,e)=>{const bt=Date.parse(b?.occurrenceDatetime||'')||0; const et=Date.parse(e?.occurrenceDatetime||'')||0; return et>=bt?e:b;}, events[0]); ms=latest?.statusMilestone||null; } if(!ms && (!events||events.length===0)) ms='pending'; const item=this.asItem({ trackingNumber: tracker.trackingNumber, courierCode: tracker.courierCode, description: tracker.shipmentReference, statusMilestone: ms }); items.push(item);} return items; },

  async httpJson(method,url,body){ const headers={'Authorization':`Bearer ${this.cfg.ship24ApiKey}`,'Accept':'application/json'}; if(body) headers['Content-Type']='application/json'; let attempt=0; while(true){ attempt++; const res=await fetch(url,{method,headers,body: body?JSON.stringify(body):undefined}); const ct=(res.headers.get('content-type')||'').toLowerCase(); if(res.status===429){ const base=1000*Math.pow(2, Math.min(attempt,5)); const wait=Math.floor(base+Math.random()*500); if(this.cfg.debug) console.log('[MMM-MyPackageTracker] 429; backing off', wait,'ms'); await sleep(wait); continue; } if(!res.ok){ const text=await res.text().catch(()=> ''); throw new Error(`HTTP ${res.status} for ${url} — ${text.substring(0,200)}`); } if(!ct.includes('application/json')){ const text=await res.text().catch(()=> ''); throw new Error(`Non-JSON response for ${url}: ${text.substring(0,120)}`); } return await res.json(); } }
});
