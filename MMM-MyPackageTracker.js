
/* global Module, Log */

Module.register("MMM-MyPackageTracker", {
  defaults: {
    email: "",
    password: "",
    refreshInterval: 5 * 60 * 1000,
    showArchived: false,
    statusFilter: [],          // ["in_transit", "out_for_delivery", "delivered", ...]
    maxItems: 12,
    sortBy: "time_updated",    // "time_updated" | "eta" | "status"
    // UI extras
    showHeaderCount: true,
    showCarrierIcons: true,
    groupByStatus: true,
    highlightOutForDelivery: true,
    showDeliveredToday: true,
    openOnClick: true,
    iconSize: 12               // NEW: pixel size for carrier icons (min 8)
  },

  start() {
    this.loaded = false;
    this.groups = {}; // grouped parcels by status
    this.totalCount = 0;
    this.deliveredTodayCount = 0;
    this.sendSocketNotification("OT_CONFIG", this.config);
  },

  getStyles() { return ["MMM-MyPackageTracker.css"]; },

  getHeader() {
    if (!this.config.showHeaderCount) return this.data.header || "";
    const deliveredBadge = this.deliveredTodayCount > 0 ? ` <span class="badge badge-success">${this.deliveredTodayCount} delivered today</span>` : "";
    return (this.data.header || "Packages") + ` <span class="badge badge-info">${this.totalCount}</span>` + deliveredBadge;
  },

  getDom() {
    const wrapper = document.createElement("div");

    if (!this.loaded) {
      wrapper.innerHTML = "Loading OneTracker parcels…";
      wrapper.className = "dimmed light small";
      return wrapper;
    }

    const buildRow = (p) => {
      const row = document.createElement("div");
      const status = (p.tracking_status || "unknown").toLowerCase().replace(/\s+/g,'_');
      row.className = `ot-row status-${status}`;

      const left = document.createElement("div");
      left.className = "ot-left";

      // Carrier icon + title
      const title = document.createElement("div");
      title.className = "ot-title";

      if (this.config.showCarrierIcons && p._iconPath) {
        const icon = document.createElement("span");
        icon.className = "ot-icon";
        const img = document.createElement("img");
        img.src = p._iconPath; // Simple Icons CDN
        img.alt = p.carrier || "";

        // size control (inline to avoid CSS overrides)
        const s = Math.max(8, Number(this.config.iconSize || 12));
        img.style.width = s + "px";
        img.style.height = s + "px";
        icon.style.width = (s + 2) + "px";
        icon.style.height = (s + 2) + "px";

        icon.appendChild(img);
        title.appendChild(icon);
      }

      const carrier = document.createElement("span");
      carrier.className = "ot-carrier";
      carrier.innerText = p.carrier || "";
      title.appendChild(carrier);

      const desc = document.createElement("span");
      desc.className = "ot-desc";
      desc.innerText = p.description || p.retailer_name || p.tracking_id || "";
      title.appendChild(desc);

      left.appendChild(title);

      const sub = document.createElement("div");
      sub.className = "ot-sub";
      const parts = [];
      if (p.tracking_status_text || p.tracking_status) parts.push(String(p.tracking_status_text || p.tracking_status));
      if (p.tracking_location) parts.push(p.tracking_location);
      sub.innerText = parts.join(" • ");
      left.appendChild(sub);

      const right = document.createElement("div");
      right.className = "ot-right";
      const timeStr = p._displayTime || "";
      if (timeStr) {
        const t = document.createElement("div");
        t.className = "ot-time";
        t.innerText = timeStr;
        right.appendChild(t);
      }

      if (this.config.openOnClick && p.tracking_url) {
        row.style.cursor = "pointer";
        row.addEventListener("click", () => window.open(p.tracking_url, "_blank", "noopener"));
      }

      row.appendChild(left);
      row.appendChild(right);

      return row;
    };

    const addGroup = (label) => {
      const g = document.createElement("div");
      g.className = "ot-group";
      g.innerText = label;
      wrapper.appendChild(g);
    };

    const pushList = (arr) => {
      const list = document.createElement("div");
      list.className = "ot-list";
      arr.slice(0, this.config.maxItems).forEach(p => list.appendChild(buildRow(p)));
      wrapper.appendChild(list);
    };

    if (this.config.groupByStatus) {
      const order = ["out_for_delivery", "in_transit", "delivered_today", "other"];
      order.forEach(key => {
        const items = this.groups[key] || [];
        if (!items.length) return;
        const label = key === "out_for_delivery" ? "Out for delivery" :
                      key === "in_transit" ? "In transit" :
                      key === "delivered_today" ? "Delivered today" : "Other";
        addGroup(label);
        pushList(items);
      });
    } else {
      const flat = [
        ...(this.groups.out_for_delivery || []),
        ...(this.groups.in_transit || []),
        ...(this.groups.delivered_today || []),
        ...(this.groups.other || [])
      ];
      pushList(flat);
    }

    return wrapper;
  },

  socketNotificationReceived(notification, payload) {
    if (notification === "OT_DATA") {
      const parcels = Array.isArray(payload?.parcels) ? payload.parcels : [];
      this.totalCount = payload?.totalCount || parcels.length;
      this.deliveredTodayCount = payload?.deliveredTodayCount || 0;
      // Group
      this.groups = { out_for_delivery: [], in_transit: [], delivered_today: [], other: [] };
      parcels.forEach(p => {
        if (p._deliveredToday) this.groups.delivered_today.push(p);
        else if ((p.tracking_status || '').toLowerCase() === 'out_for_delivery') this.groups.out_for_delivery.push(p);
        else if ((p.tracking_status || '').toLowerCase() === 'in_transit') this.groups.in_transit.push(p);
        else this.groups.other.push(p);
      });
      this.loaded = true;
      this.updateDom(300);
    } else if (notification === "OT_DELIVERED") {
      this.sendNotification("ONETRACKER_DELIVERED", payload);
    } else if (notification === "OT_ERROR") {
      this.loaded = true;
      this.groups = {}; this.totalCount = 0; this.deliveredTodayCount = 0;
      Log.error("[MMM-MyPackageTracker] " + payload);
      this.updateDom(300);
    }
  }
});
