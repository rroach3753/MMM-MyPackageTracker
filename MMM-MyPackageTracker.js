/* MMM-MyPackageTracker.js — v3.0.0 (icons via Simple Icons CDN for all carriers) */
Module.register("MMM-MyPackageTracker", {
  defaults: {
    // Ship24 config (read by node_helper)
    ship24ApiKey: "",
    seedTrackers: [],
    useWebhooks: false,
    webhookPort: 0,
    webhookPath: "/ship24/webhook",

    // UI
    refreshInterval: 5 * 60 * 1000,
    showArchived: false,
    statusFilter: [],
    maxItems: 12,
    sortBy: "time_updated",
    showHeaderCount: true,
    showCarrierIcons: true,
    groupByStatus: true,
    highlightOutForDelivery: true,
    showDeliveredToday: true,
    openOnClick: true,
    iconSize: 16,

    // Icon controls
    iconColor: null,   // "ffffff" forces white via CDN tint; null = brand color

    debug: false
  },

  start(){
    this.parcels = []; this.loaded = false; this.deliveredTodayCount = 0;
    this.sendSocketNotification("MMM-MYPACKAGETRACKER_INIT", this.config);
    this._interval = setInterval(()=> this.sendSocketNotification("MMM-MYPACKAGETRACKER_FETCH_NOW"), Math.max(60*1000, this.config.refreshInterval));
  },
  stop(){ if(this._interval) clearInterval(this._interval); },
  getStyles(){ return ["MMM-MyPackageTracker.css"]; },

  getHeader(){
    const base = this.data.header || "Packages";
    const count = this.config.showHeaderCount ? ` (${this.parcels.length})` : "";
    const badge = (this.config.showDeliveredToday && this.deliveredTodayCount>0) ? ` <span class=\"mmp-badge\">Delivered today: ${this.deliveredTodayCount}</span>` : "";
    return base + count + badge;
  },

  socketNotificationReceived(n,p){
    if(n==="MMM-MYPACKAGETRACKER_DATA"){ this.parcels = p.parcels || []; this.deliveredTodayCount = p.deliveredTodayCount||0; this.loaded = true; this.updateDom(300); }
    if(n==="MMM-MYPACKAGETRACKER_ERROR"){ console.error("[MMM-MyPackageTracker]", p?.message); }
  },

  // ---------- utils ----------
  _u: {
    coerce: (v)=>{ if(v===undefined||v===null) return null; const s = String(v).trim(); return (!s || s.toLowerCase()==="unknown")? null : s; },
    title: (s)=> s ? s.charAt(0).toUpperCase()+s.slice(1) : ""
  },
  _statusLabel(key){ if(!key) return "—"; const m={ in_transit:"In transit", out_for_delivery:"Out for delivery", delivered:"Delivered" }; return m[key] || this._u.title(key); },

  // Slug mapping for Simple Icons (CDN)
  _carrierSlug(carrier){
    if(!carrier) return null; const key = String(carrier).toLowerCase().replace(/[^a-z0-9 ]+/g,' ').replace(/\s+/g,' ').trim();
    const map = {
      // US
      'usps':'unitedstatespostalservice', 'united states postal service':'unitedstatespostalservice',
      'ups':'ups', 'united parcel service':'ups',
      'fedex':'fedex', 'dhl':'dhl', 'dhl express':'dhl',
      'amazon':'amazon', 'amazon logistics':'amazon', 'amazon shipping':'amazon',
      'canada post':'canadapost', 'canada post corporation':'canadapost',
      // UK/EU examples
      'royal mail':'royalmail', 'dpd':'dpd', 'evri':'evri', 'hermes':'evri', 'gls':'gls',
      'poste italiane':'posteitaliane', 'correos':'correos', 'la poste':'laposte', 'chronopost':'chronopost', 'colissimo':'laposte',
      'australia post':'australiapost', 'new zealand post':'newzealandpost', 'postnl':'postnl'
    };
    return map[key] || key.replace(/\s+/g,'');
  },
  _iconUrl(carrier){
    const slug = this._carrierSlug(carrier); if(!slug) return null;
    const color = this.config.iconColor ? `/${this.config.iconColor}` : "";
    // Simple Icons color CDN
    return `https://cdn.simpleicons.org/${slug}${color}`;
  },

  _sortParcels(list){ const by=this.config.sortBy; const sd=v=> v? new Date(v).getTime():0; if(by==="eta") return list.slice().sort((a,b)=> sd(a.tracking_time_estimated)-sd(b.tracking_time_estimated)); if(by==="status") return list.slice().sort((a,b)=> String(a.tracking_status||"").localeCompare(String(b.tracking_status||""))); return list.slice().sort((a,b)=> sd(b.time_updated)-sd(a.time_updated)); },

  getDom(){
    const w = document.createElement("div"); w.className = "mmp-container";
    if(!this.loaded){ const d=document.createElement("div"); d.className="dimmed light small"; d.textContent="Loading…"; w.appendChild(d); return w; }
    const rows = this._sortParcels(this.parcels);
    if(rows.length===0){ const e=document.createElement("div"); e.className="dimmed light xsmall"; e.textContent="No parcels to show"; w.appendChild(e); return w; }

    if(this.config.groupByStatus){
      const groups={ out_for_delivery:[], in_transit:[], delivered_today:[], other:[] };
      const today=new Date(); const same=(a,b)=> a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
      rows.forEach(p=>{ const st=(p.tracking_status||"").toLowerCase(); if(st==="out_for_delivery") groups.out_for_delivery.push(p); else if(st==="in_transit") groups.in_transit.push(p); else if(st==="delivered" && p.tracking_time_delivered && same(new Date(p.tracking_time_delivered), today)) groups.delivered_today.push(p); else groups.other.push(p); });
      [["Out for delivery",groups.out_for_delivery],["In transit",groups.in_transit],["Delivered today",groups.delivered_today],["Other",groups.other]].forEach(([t,list])=>{ if(!list.length) return; const h=document.createElement("div"); h.className="mmp-section-header"; h.textContent=t; w.appendChild(h); w.appendChild(this._renderList(list)); });
    } else { w.appendChild(this._renderList(rows)); }
    return w;
  },

  _renderList(list){
    const ul=document.createElement("div"); ul.className="mmp-list";
    const items = this.config.maxItems>0 ? list.slice(0,this.config.maxItems) : list;
    items.forEach(p=>{
      const row=document.createElement("div"); row.className="mmp-row";

      // Icons via CDN for ALL carriers (no local-first special cases)
      if(this.config.showCarrierIcons){
        const icon=this._iconUrl(p.carrier);
        const img=document.createElement("img"); img.className="mmp-icon"; img.width=this.config.iconSize||16; img.height=this.config.iconSize||16; img.alt=p.carrier||"";
        img.src = icon || this.file("public/icons/fallback-package.svg");
        img.onerror = () => { img.onerror=null; img.src = this.file("public/icons/fallback-package.svg"); };
        row.appendChild(img);
      }

      const main=document.createElement("div"); main.className="mmp-main"; const carrier=this._u.coerce(p.carrier)||"—"; const desc=this._u.coerce(p.description)||""; main.textContent=[carrier,desc].filter(Boolean).join(" · ");
      const sub=document.createElement("div"); sub.className="mmp-sub"; sub.textContent=this._statusLabel(this._u.coerce(p.tracking_status));
      row.appendChild(main); row.appendChild(sub);

      if(this.config.openOnClick && p.tracking_url){ row.classList.add("mmp-clickable"); row.addEventListener("click",()=>window.open(p.tracking_url,"_blank")); }
      if(this.config.highlightOutForDelivery && String(p.tracking_status||"").toLowerCase()==="out_for_delivery"){ row.classList.add("mmp-ofd"); }
      ul.appendChild(row);
    });
    return ul;
  }
});
