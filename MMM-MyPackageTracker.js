/* MMM-MyPackageTracker.js (icons reliability + fallback, brightness-ready) */
Module.register("MMM-MyPackageTracker", {
  defaults: {
    email: "",
    password: "",
    refreshInterval: 5 * 60 * 1000,
    showArchived: false,
    statusFilter: [],
    maxItems: 12,
    sortBy: "time_updated",

    // UI
    showHeaderCount: true,
    showCarrierIcons: true,
    groupByStatus: true,
    highlightOutForDelivery: true,
    showDeliveredToday: true,
    openOnClick: true,
    iconSize: 16,

    // debug
    debug: false
  },

  start() {
    this.parcels = [];
    this.loaded = false;
    this.deliveredTodayCount = 0;
    this.sendSocketNotification("MMM-MYPACKAGETRACKER_INIT", this.config);
    this._interval = setInterval(() => {
      this.sendSocketNotification("MMM-MYPACKAGETRACKER_FETCH_NOW");
    }, Math.max(60 * 1000, this.config.refreshInterval));
  },

  stop() { if (this._interval) clearInterval(this._interval); },
  getStyles() { return ["MMM-MyPackageTracker.css"]; },

  getHeader() {
    const base = this.data.header || "Packages";
    const count = this.config.showHeaderCount ? ` (${this.parcels.length})` : "";
    const badge = (this.config.showDeliveredToday && this.deliveredTodayCount > 0)
      ? ` <span class="mmp-badge">Delivered today: ${this.deliveredTodayCount}</span>` : "";
    return base + count + badge;
  },

  socketNotificationReceived(notification, payload) {
    if (notification === "MMM-MYPACKAGETRACKER_DATA") {
      this.parcels = payload.parcels || [];
      this.deliveredTodayCount = payload.deliveredTodayCount || 0;
      this.loaded = true;
      if (this.config.debug) console.log("[MMM-MyPackageTracker] ui got", this.parcels.length, "parcels");
      this.updateDom(300);
    }
    if (notification === "MMM-MYPACKAGETRACKER_ERROR") {
      console.error("[MMM-MyPackageTracker] error:", payload?.message);
    }
  },

  // ---- helpers ----
  _u: {
    coerce: (v) => {
      if (v === undefined || v === null) return null;
      const s = String(v).trim();
      return s.length === 0 || s.toLowerCase() === "unknown" ? null : s;
    },
    title: (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "")
  },

  _statusLabel(key) {
    if (!key) return "—";
    const m = { "in_transit": "In transit", "out_for_delivery": "Out for delivery", "delivered": "Delivered" };
    return m[key] || this._u.title(key);
  },

  // ==== ICON SECTION (updated) ====
  normalizeCarrierName(name) {
    if (!name) return null;
    const s = String(name).toLowerCase()
      .replace(/[._,()]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return s || null;
  },

  carrierSlugMap: {
    // --- USPS / United States Postal Service ---
    "usps": "unitedstatespostalservice",
    "u s postal service": "unitedstatespostalservice", // "U.S. Postal Service" -> dots removed by normalize
    "united states postal service": "unitedstatespostalservice",
    "united states postal service usps": "unitedstatespostalservice",
    "united states post office": "unitedstatespostalservice", // occasional variant in feeds
    // --- UPS ---
    "ups": "ups",
    "united parcel service": "ups",
    "ups ground": "ups", // service-level appended
    "ups®": "ups", // if normalize left the mark
    // (normalizeCarrierName removes punctuation so "ups®" often becomes "ups")
    // --- Other major carriers ---
    "fedex": "fedex",
    "dhl": "dhl",
    "dhl express": "dhl",
    "canada post": "canadapost",
    "canada post corporation": "canadapost",
    "amazon": "amazon",
    "amazon logistics": "amazon",
    "amazon shipping": "amazon",
    "royal mail": "royalmail",
    "dpd": "dpd",
    "hermes": "evri",
    "evri": "evri",
    "yodel": "yodel",
    "gls": "gls",
    "poste italiane": "posteitaliane",
    "correos": "correos",
    "la poste": "laposte",
    "chronopost": "chronopost",
    "colissimo": "laposte",
    "australia post": "australiapost",
    "new zealand post": "newzealandpost",
    "canpar": "canpar",
    "purolator": "purolator",
    "aramex": "aramex",
    "sf express": "sfexpress",
    "yanwen": "yanwen",
    "postnl": "postnl"
  },

  simpleIconUrlForCarrier(rawName) {
    const norm = this.normalizeCarrierName(rawName);
    if (!norm) return null;
    let slug = this.carrierSlugMap[norm];
    if (!slug) {
      const guess = norm.replace(/\s+/g, "");
      if (/^[a-z0-9-]+$/.test(guess)) slug = guess; // best-effort
    }
    return slug ? `https://cdn.simpleicons.org/${slug}` : null;
  },

  // ==== end ICON SECTION ====

  _sortParcels(list) {
    const by = this.config.sortBy;
    const safeDate = v => (v ? new Date(v).getTime() : 0);
    if (by === "eta") return list.slice().sort((a,b)=> safeDate(a.tracking_time_estimated) - safeDate(b.tracking_time_estimated));
    if (by === "status") return list.slice().sort((a,b)=> String(a.tracking_status||"").localeCompare(String(b.tracking_status||"")) );
    return list.slice().sort((a,b)=> (safeDate(b.time_updated) - safeDate(a.time_updated)) );
  },

  getDom() {
    const wrapper = document.createElement("div");
    wrapper.className = "mmp-container";

    if (!this.loaded) {
      const loading = document.createElement("div");
      loading.className = "dimmed light small";
      loading.textContent = "Loading…";
      wrapper.appendChild(loading);
      return wrapper;
    }

    const rows = this._sortParcels(this.parcels);

    if (rows.length === 0) {
      const empty = document.createElement("div");
      empty.className = "dimmed light xsmall";
      empty.textContent = "No parcels to show";
      wrapper.appendChild(empty);
      return wrapper;
    }

    if (this.config.groupByStatus) {
      const groups = { out_for_delivery: [], in_transit: [], delivered_today: [], other: [] };
      const today = new Date();
      const isSameDay = (a,b)=> a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();

      rows.forEach(p=>{
        const st = (p.tracking_status||"").toLowerCase();
        if (st === "out_for_delivery") groups.out_for_delivery.push(p);
        else if (st === "in_transit") groups.in_transit.push(p);
        else if (st === "delivered" && p.tracking_time_delivered && isSameDay(new Date(p.tracking_time_delivered), today)) groups.delivered_today.push(p);
        else groups.other.push(p);
      });

      const order = [["Out for delivery", groups.out_for_delivery],["In transit", groups.in_transit],["Delivered today", groups.delivered_today],["Other", groups.other]];
      for (const [title, list] of order) {
        if (list.length === 0) continue;
        const h = document.createElement("div");
        h.className = "mmp-section-header";
        h.textContent = title;
        wrapper.appendChild(h);
        wrapper.appendChild(this._renderList(list));
      }
    } else {
      wrapper.appendChild(this._renderList(rows));
    }

    return wrapper;
  },

  _renderList(list) {
    const ul = document.createElement("div");
    ul.className = "mmp-list";

    const items = this.config.maxItems > 0 ? list.slice(0, this.config.maxItems) : list;

    items.forEach(p=>{
      const row = document.createElement("div");
      row.className = "mmp-row";

      // ----- ICON (with fallback + onerror) -----
      if (this.config.showCarrierIcons) {
        const iconUrl = this.simpleIconUrlForCarrier(p.carrier);
        if (this.config.debug && !iconUrl && p.carrier) {
          console.log("[MMM-MyPackageTracker] No brand icon for carrier:", p.carrier);
        }
        const img = document.createElement("img");
        img.className = "mmp-icon";
        img.width = this.config.iconSize || 16;
        img.height = this.config.iconSize || 16;
        img.alt = (p.carrier || "").toString();
        img.src = iconUrl || this.file("public/icons/fallback-package.svg");
        img.onerror = () => { img.onerror = null; img.src = this.file("public/icons/fallback-package.svg"); };
        row.appendChild(img);
      }

      // ----- TEXTS -----
      const main = document.createElement("div");
      main.className = "mmp-main";
      const carrierText = this._u.coerce(p.carrier) || "—";
      const descText = this._u.coerce(p.description) || "";
      main.textContent = [carrierText, descText].filter(Boolean).join(" · ");

      const sub = document.createElement("div");
      sub.className = "mmp-sub";
      const statusText = this._statusLabel(this._u.coerce(p.tracking_status));
      sub.textContent = statusText;

      row.appendChild(main);
      row.appendChild(sub);

      if (this.config.openOnClick && p.tracking_url) {
        row.classList.add("mmp-clickable");
        row.addEventListener("click", ()=> window.open(p.tracking_url, "_blank"));
      }

      if (this.config.highlightOutForDelivery && String(p.tracking_status||"").toLowerCase()==="out_for_delivery") {
        row.classList.add("mmp-ofd");
      }

      ul.appendChild(row);
    });

    return ul;
  }
});
