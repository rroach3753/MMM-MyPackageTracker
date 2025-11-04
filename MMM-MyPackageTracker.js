/* MMM-MyPackageTracker.js — v4.0.0 */
Module.register("MMM-MyPackageTracker", {
  defaults: {
    // Backend (Ship24)
    ship24ApiKey: "",           // required

    // Mode: "seed" (explicit list) or "list" (account-wide); defaults to list if no seeds present
    mode: "list",

    // Seed list (for mode: "seed")
    seedTrackers: [ /* { trackingNumber: "94055...", courier: "usps", description: "Home" } */ ],

    // List-mode config
    listPageSize: 50,

    // Polling / refresh
    pollIntervalMs: 5 * 60 * 1000,

    // Webhooks (optional)
    webhooks: {
      enabled: false,
      port: 0,                   // e.g., 8567
      path: "/ship24/webhook",
      secret: ""                 // shared secret; pass via header x-ship24-secret or ?secret=
    },

    // UI
    maxItems: 14,
    groupByStatus: true,
    showHeaderCount: true,
    showCarrierIcons: true,
    iconSize: 16,
    iconColor: null,             // null = brand color; or hex like "ffffff"
    openOnClick: true,
    showTrackingLinks: true,     // click row to open tracking_url (Ship24)

    // Dev
    debug: false
  },

  start(){
    this.parcels = []; this.loaded = false; this.deliveredTodayCount = 0;
    const init = Object.assign({}, this.config);
    if (this.config.webhooks && this.config.webhooks.enabled){ init.webhooks = this.config.webhooks; } else { init.webhooks = null; }
    this.sendSocketNotification('MMM-MYPACKAGETRACKER_INIT', init);
    this._interval = setInterval(()=> this.sendSocketNotification('MMM-MYPACKAGETRACKER_FETCH_NOW'), Math.max(60000, this.config.pollIntervalMs));
  },

  stop(){ if (this._interval) clearInterval(this._interval); },

  getStyles(){ return ["MMM-MyPackageTracker.css"]; },

  getHeader(){
    const base = this.data.header || "Packages";
    const count = this.config.showHeaderCount ? ` (${this.parcels.length})` : "";
    const badge = this.deliveredTodayCount>0 ? ` <span class=\"mmp-badge\">Delivered today: ${this.deliveredTodayCount}</span>` : "";
    return base + count + badge;
  },

  socketNotificationReceived(n, p){
    if (n === 'MMM-MYPACKAGETRACKER_DATA'){
      this.parcels = Array.isArray(p?.parcels) ? p.parcels : [];
      this.deliveredTodayCount = Number(p?.deliveredTodayCount || 0);
      this.loaded = true; this.updateDom(300);
    }
    if (n === 'MMM-MYPACKAGETRACKER_ERROR'){
      console.error('[MMM-MyPackageTracker]', p?.message);
      this.loaded = true; this.updateDom(300);
    }
  },

  // ---- UI helpers ----
  _u: {
    coerce(v){ if (v===undefined || v===null) return null; const s=String(v).trim(); return s ? s : null; },
    title(s){ return s ? s.charAt(0).toUpperCase()+s.slice(1) : ""; }
  },

  _statusLabel(k){ if(!k) return '—'; const m={ in_transit:'In transit', out_for_delivery:'Out for delivery', delivered:'Delivered' }; return m[k] || this._u.title(k); },

  _carrierSlug(carrier){
    if(!carrier) return null;
    const key = String(carrier).toLowerCase().replace(/[^a-z0-9 ]+/g,' ').replace(/\s+/g,' ').trim();
    const map = {
      'usps':'unitedstatespostalservice','united states postal service':'unitedstatespostalservice',
      'ups':'ups','united parcel service':'ups','fedex':'fedex','dhl':'dhl','dhl express':'dhl',
      'amazon':'amazon','amazon logistics':'amazon','amazon shipping':'amazon',
      'canada post':'canadapost','canada post corporation':'canadapost',
      'royal mail':'royalmail','dpd':'dpd','evri':'evri','hermes':'evri','gls':'gls',
      'poste italiane':'posteitaliane','correos':'correos','la poste':'laposte','chronopost':'chronopost','colissimo':'laposte',
      'australia post':'australiapost','new zealand post':'newzealandpost','postnl':'postnl'
    };
    return map[key] || key.replace(/\s+/g,'');
  },

  _iconUrl(carrier){ const slug=this._carrierSlug(carrier); if(!slug) return null; const tint=this.config.iconColor?`/${this.config.iconColor}`:""; return `https://cdn.simpleicons.org/${slug}${tint}`; },

  getDom(){
    const root = document.createElement('div'); root.className='mmp-container';
    if (!this.loaded){ const d=document.createElement('div'); d.className='dimmed light small'; d.textContent='Loading…'; root.appendChild(d); return root; }

    const rows = this.parcels.slice(0, this.config.maxItems>0? this.config.maxItems: this.parcels.length);
    if (rows.length===0){ const e=document.createElement('div'); e.className='dimmed light xsmall'; e.textContent='No parcels to show'; root.appendChild(e); return root; }

    if (this.config.groupByStatus){
      const groups={ out_for_delivery:[], in_transit:[], delivered_today:[], other:[] };
      const today=new Date(); const same=(a,b)=> a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();
      rows.forEach(p=>{ const st=(p.tracking_status||'').toLowerCase(); if(st==='out_for_delivery') groups.out_for_delivery.push(p); else if(st==='in_transit') groups.in_transit.push(p); else if(st==='delivered' && p.tracking_time_delivered && same(new Date(p.tracking_time_delivered), today)) groups.delivered_today.push(p); else groups.other.push(p); });
      [["Out for delivery",groups.out_for_delivery],["In transit",groups.in_transit],["Delivered today",groups.delivered_today],["Other",groups.other]].forEach(([t,list])=>{ if(!list.length) return; const h=document.createElement('div'); h.className='mmp-section-header'; h.textContent=t; root.appendChild(h); root.appendChild(this._renderList(list)); });
    } else {
      root.appendChild(this._renderList(rows));
    }
    return root;
  },

  _renderList(list){
    const ul=document.createElement('div'); ul.className='mmp-list';
    list.forEach(p=>{
      const row=document.createElement('div'); row.className='mmp-row';
      if (this.config.showCarrierIcons){
        const img=document.createElement('img'); img.className='mmp-icon'; img.width=this.config.iconSize||16; img.height=this.config.iconSize||16; img.alt=p.carrier||''; img.src=this._iconUrl(p.carrier) || this.file('public/icons/fallback-package.svg'); img.onerror=()=>{ img.onerror=null; img.src=this.file('public/icons/fallback-package.svg'); }; row.appendChild(img);
      }
      const main=document.createElement('div'); main.className='mmp-main'; const c=this._u.coerce(p.carrier)||'—'; const d=this._u.coerce(p.description)||''; main.textContent=[c,d].filter(Boolean).join(' · ');
      const sub=document.createElement('div'); sub.className='mmp-sub'; sub.textContent=this._statusLabel((p.tracking_status||'').toLowerCase());
      row.appendChild(main); row.appendChild(sub);

      if (this.config.openOnClick && this.config.showTrackingLinks && p.tracking_url){ row.classList.add('mmp-clickable'); row.addEventListener('click',()=> window.open(p.tracking_url, '_blank')); }
      if (String(p.tracking_status||'').toLowerCase()==='out_for_delivery'){ row.classList.add('mmp-ofd'); }

      ul.appendChild(row);
    });
    return ul;
  }
});
