/* MMM-MyPackageTracker v5.0.3 */
Module.register("MMM-MyPackageTracker", {
  defaults: {
    ship24ApiKey: "",
    ship24BaseUrl: null,
    mode: "list",
    seedTrackers: [],
    listPageSize: 50,
    pollIntervalMs: 5 * 60 * 1000,
    maxItems: 14,
    groupByStatus: true,
    showHeaderCount: true,
    showCarrierIcons: true,
    iconSize: 20,
    iconColor: null,
    openOnClick: false,
    showTrackingLinks: false,
    debug: false
  },
  statusOrder(m){const k=(m||'').toLowerCase();const pri={out_for_delivery:0,in_transit:1,available_for_pickup:2,failed_attempt:3,info_received:4,pending:4,exception:5,delivered:6};return (pri[k]??99)},
  start(){this.items=[];this.meta={base:null,lastRunAt:null,lastError:null};this.sendSocketNotification('CONFIG',this.config)},
  getStyles(){return ["MMM-MyPackageTracker.css"]},
  socketNotificationReceived(n,p){if(n==='DATA'){this.items=p.items||[];this.meta=Object.assign({},this.meta,p.meta||{});this.updateDom(0)}else if(n==='ERROR'){this.meta.lastError=(p&&p.message)||'Unknown error';this.updateDom(0)}else if(n==='BASE_SELECTED'){this.meta.base=p&&p.base;if(this.config.debug)console.log('[MMM-MyPackageTracker] base selected:',this.meta.base);this.updateDom(0)}},
  getHeader(){const base=this.meta.base?` \u2014 ${this.meta.base.replace('https://','')}`:'';const count=(this.config.showHeaderCount&&Array.isArray(this.items))?` (${this.items.length})`:'';return (this.data.header||'Packages')+count+(this.config.debug&&base?base:'')},
  getDom(){const w=document.createElement('div');w.className='MMM-MyPackageTracker';if(!this.config.ship24ApiKey){const e=document.createElement('div');e.className='error';e.innerHTML='Missing <code>ship24ApiKey</code> in config';w.appendChild(e);return w}if((this.items||[]).length===0){const e=document.createElement('div');e.className='empty';e.innerHTML=this.config.mode==='list'?'No trackers returned yet. If your Ship24 dashboard has trackers, ensure the API base is correct or increase listPageSize; try seed mode to test.':'No results yet. Verify seedTrackers or wait for first scan.';w.appendChild(e);if(this.config.debug&&this.meta.lastError){const d=document.createElement('div');d.className='error';d.textContent=this.meta.lastError;w.appendChild(d)}return w}
    let items=this.items.slice(0,this.config.maxItems||this.items.length);
    items.sort((a,b)=>{const sa=this.statusOrder(a.group),sb=this.statusOrder(b.group);if(sa!==sb)return sa-sb;const ca=(a.courier||'').localeCompare(b.courier||'',undefined,{sensitivity:'base'});if(ca!==0)return ca;const ta=(a.description||'').localeCompare(b.description||'',undefined,{sensitivity:'base'});if(ta!==0)return ta;return (a.trackingNumber||'').localeCompare(b.trackingNumber||'',undefined,{sensitivity:'base'})});
    if(this.config.groupByStatus){const groups=items.reduce((acc,it)=>{acc[it.group||'Other']=acc[it.group||'Other']||[];acc[it.group||'Other'].push(it);return acc},{});Object.keys(groups).sort((a,b)=>this.statusOrder(a)-this.statusOrder(b)).forEach(g=>{const t=document.createElement('div');t.className='group-title';t.textContent=g;w.appendChild(t);groups[g].forEach(it=>w.appendChild(this.renderItem(it)))})}
    else{items.forEach((it,idx)=>{try{w.appendChild(this.renderItem(it))}catch(e){if(this.config.debug){const er=document.createElement('div');er.className='error';er.textContent=`Render error on item #${idx}: ${e&&e.message||e}`;w.appendChild(er);console.error('[MMM-MyPackageTracker] renderItem failed:',e,it)}})}
    return w},
  renderItem(it){const r=document.createElement('div');r.className='item';if(this.config.showCarrierIcons){const img=document.createElement('img');img.className='carrier-icon';img.width=img.height=(this.config.iconSize||20);img.src=this.file('public/icons/fallback-package.svg');r.appendChild(img)}const m=document.createElement('span');const dbg=this.config.debug&&it.group?` [${it.group}]`:'';const parts=[];if(it.courier)parts.push(it.courier);if(it.description)parts.push(it.description+dbg);if(it.trackingNumber)parts.push(it.trackingNumber);const label=parts.join(' \u2014 ');m.textContent=label||it.trackingNumber||'Unknown';r.appendChild(m);if(this.config.openOnClick&&it.link){r.style.cursor='pointer';r.addEventListener('click',()=>window.open(it.link,'_blank'))}return r}
});
