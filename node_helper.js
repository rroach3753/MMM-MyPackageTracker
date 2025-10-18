
const NodeHelper = require("node_helper");
const fetch = require("node-fetch");
const dayjs = require("dayjs");

const API_BASE = "https://api.onetracker.app";
const AUTH_URL = `${API_BASE}/auth/token`;
const PARCELS_URL = `${API_BASE}/parcels`;

// Map carriers to Simple Icons slugs (https://simpleicons.org)
const SLUGS = new Map([
  ['fedex','fedex'], ['ups','ups'], ['usps','usps'], ['united states postal service','usps'],
  ['dhl','dhl'], ['amazon logistics','amazon'], ['amazon','amazon'], ['canada post','canadapost']
]);
function resolveLogo(p){ try { const key=String(p.carrier||'').trim().toLowerCase(); const slug=SLUGS.get(key); return slug?`https://cdn.simpleicons.org/${slug}`:null; } catch(e){ return null; } }

// --- Time utils: supports ms, s, numeric strings, ISO; plausibility guard ---
function isPlausible(d){ if(!d||!d.isValid()) return false; const y=d.year(); return y>=1975 && y<=2100; }
function parseTimeToDayjs(v, dayjs){ if(v==null) return null; if(typeof v==='number'){ const ms=v>1e12?v:v*1000; return dayjs(ms); } if(typeof v==='string'){ const n=Number(v); if(!Number.isNaN(n)&&n>0){ const ms=n>1e12?n:n*1000; return dayjs(ms);} return dayjs(v);} return null; }

module.exports = NodeHelper.create({
  start(){ this.config=null; this.timer=null; this.session={token:null, expiration:null}; this.lastSnapshot=new Map(); },
  stop(){ if(this.timer) clearTimeout(this.timer); },
  socketNotificationReceived(n,p){ if(n==='OT_CONFIG'){ this.config=p; this.scheduleNow(); } },
  scheduleNow(){ if(this.timer) clearTimeout(this.timer); this.bootstrap().finally(()=>this.scheduleNext()); },
  scheduleNext(){ const interval=Math.max(60_000, Number(this.config?.refreshInterval||300_000)); this.timer=setTimeout(()=>this.scheduleNow(), interval); },
  tokenExpiredSoon(){ if(!this.session.expiration) return true; const exp=new Date(this.session.expiration).getTime(); return (Date.now()+60*1000)>=exp; },
  async ensureAuth(){ if(this.session.token && !this.tokenExpiredSoon()) return; const {email,password}=this.config||{}; if(!email||!password) throw new Error('OneTracker email/password missing in config.'); const res=await fetch(AUTH_URL,{method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({email,password})}); if(!res.ok){ const text=await res.text(); throw new Error(`Auth failed (${res.status}): ${text}`);} const data=await res.json(); this.session.token=data?.session?.token||null; this.session.expiration=data?.session?.expiration||null; if(!this.session.token) throw new Error('No token returned by OneTracker.'); },
  async fetchParcels(){ await this.ensureAuth(); const res=await fetch(PARCELS_URL,{headers:{'accept':'application/json','x-api-token':this.session.token}}); if(res.status===401){ this.session.token=null; await this.ensureAuth(); return this.fetchParcels(); } if(!res.ok){ const text=await res.text(); throw new Error(`Fetch parcels failed (${res.status}): ${text}`);} const data=await res.json(); let items=Array.isArray(data?.parcels)?data.parcels:[];
    const showArchived=!!this.config?.showArchived; const allowed=(this.config?.statusFilter||[]).map(s=>String(s).toLowerCase());
    items=items.filter(p=>showArchived || p.is_archived===0); if(allowed.length){ items=items.filter(p=>allowed.includes(String(p.tracking_status||'').toLowerCase())); }
    const now=dayjs(); const todayStart=now.startOf('day'); const todayEnd=now.endOf('day');
    items.forEach(p=>{
      p._iconPath=resolveLogo(p);
      const deliveredD=parseTimeToDayjs(p.tracking_time_delivered, dayjs);
      p._deliveredToday=deliveredD? deliveredD.isAfter(todayStart)&&deliveredD.isBefore(todayEnd) : false;
      const etaD=parseTimeToDayjs(p.tracking_time_estimated, dayjs);
      const updatedD=parseTimeToDayjs(p.time_updated, dayjs);
      let pick=null, labelPrefix='';
      if(isPlausible(deliveredD)){ labelPrefix='Delivered'; pick=deliveredD; }
      else if(isPlausible(etaD)){ labelPrefix='ETA'; pick=etaD; }
      else if(isPlausible(updatedD)){ labelPrefix='Updated'; pick=updatedD; }
      p._displayTime = pick ? `${labelPrefix} ${pick.format('MMM D, h:mm A')}` : '';
    });
    const sortBy=this.config?.sortBy||'time_updated';
    items.sort((a,b)=>{ const s=x=>(x.tracking_status||'').toLowerCase(); if(s(a)==='out_for_delivery'&&s(b)!=='out_for_delivery') return -1; if(s(a)!=='out_for_delivery'&&s(b)==='out_for_delivery') return 1; const pick=obj=> (sortBy==='eta'?obj.tracking_time_estimated: sortBy==='status'?obj.tracking_status: obj.time_updated); return String(pick(b)||'').localeCompare(String(pick(a)||'')); });
    return items; },
  detectDeliveries(current){ const delivered=[]; const map=new Map(); current.forEach(p=>{ map.set(p.id, p.tracking_status||''); const before=this.lastSnapshot.get(p.id); const now=(p.tracking_status||'').toLowerCase(); if(now==='delivered' && before && before.toLowerCase()!=='delivered') delivered.push(p); }); this.lastSnapshot=map; return delivered; },
  async bootstrap(){ try{ const parcels=await this.fetchParcels(); const deliveredTodayCount=parcels.filter(p=>p._deliveredToday).length; const newlyDelivered=this.detectDeliveries(parcels); newlyDelivered.forEach(p=> this.sendSocketNotification('OT_DELIVERED',{id:p.id,carrier:p.carrier,description:p.description,tracking_id:p.tracking_id,when:p.tracking_time_delivered})); this.sendSocketNotification('OT_DATA',{parcels,totalCount:parcels.length,deliveredTodayCount}); } catch(e){ this.sendSocketNotification('OT_ERROR', e?.message||String(e)); } }
});
