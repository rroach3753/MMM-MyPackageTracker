/*
 * MMM-MyPackageTracker v5.0.1
 */
Module.register("MMM-MyPackageTracker", {
  defaults: {
    ship24ApiKey: "",
    ship24BaseUrl: null, // optional; autodetect if null
    mode: "list", // "list" | "seed"
    seedTrackers: [],
    listPageSize: 50,
    pollIntervalMs: 5 * 60 * 1000,
    maxItems: 14,

    // UI
    groupByStatus: true,
    showHeaderCount: true,
    showCarrierIcons: true,
    iconSize: 16,
    iconColor: null,
    openOnClick: true,
    showTrackingLinks: true,

    // Dev
    debug: false
  },

  start() {
    this.items = [];
    this.meta = { base: null, lastRunAt: null, lastError: null };
    this.sendSocketNotification('CONFIG', this.config);
  },

  getStyles() { return ["MMM-MyPackageTracker.css"]; },

  socketNotificationReceived(notification, payload) {
    if (notification === 'DATA') {
      this.items = payload.items || [];
      this.meta = Object.assign({}, this.meta, payload.meta || {});
      this.updateDom(0);
    } else if (notification === 'ERROR') {
      this.meta.lastError = payload && payload.message || 'Unknown error';
      this.updateDom(0);
    } else if (notification === 'BASE_SELECTED') {
      this.meta.base = payload && payload.base;
      if (this.config.debug) console.log('[MMM-MyPackageTracker] base selected:', this.meta.base);
      this.updateDom(0);
    }
  },

  getHeader() {
    const base = this.meta.base ? ` \u2014 ${this.meta.base.replace('https://','')}` : '';
    const count = (this.config.showHeaderCount && Array.isArray(this.items)) ? ` (${this.items.length})` : '';
    return (this.data.header || 'Packages') + count + (this.config.debug && base ? base : '');
  },

  getDom() {
    const wrapper = document.createElement('div');
    wrapper.className = 'MMM-MyPackageTracker';

    if (!this.config.ship24ApiKey) {
      const e = document.createElement('div');
      e.className = 'error';
      e.innerHTML = 'Missing <code>ship24ApiKey</code> in config';
      wrapper.appendChild(e);
      return wrapper;
    }

    if ((this.items || []).length === 0) {
      const e = document.createElement('div');
      e.className = 'empty';
      if (this.config.mode === 'list') {
        e.innerHTML = 'No trackers returned yet. If your Ship24 dashboard has trackers, ensure the API base is correct or increase listPageSize; try seed mode to test.';
      } else {
        e.innerHTML = 'No results yet. Verify seedTrackers or wait for first scan.';
      }
      wrapper.appendChild(e);
      if (this.config.debug && this.meta.lastError) {
        const d = document.createElement('div');
        d.className = 'error';
        d.textContent = this.meta.lastError;
        wrapper.appendChild(d);
      }
      return wrapper;
    }

    let items = this.items.slice(0, this.config.maxItems || this.items.length);

    if (this.config.groupByStatus) {
      const groups = items.reduce((acc, it) => {
        acc[it.group || 'Other'] = acc[it.group || 'Other'] || [];
        acc[it.group || 'Other'].push(it);
        return acc;
      }, {});
      Object.keys(groups).sort().forEach(g => {
        const title = document.createElement('div');
        title.className = 'group-title';
        title.textContent = g;
        wrapper.appendChild(title);
        groups[g].forEach(it => wrapper.appendChild(this.renderItem(it)));
      });
    } else {
      items.forEach((it, idx) => {
        try { wrapper.appendChild(this.renderItem(it)); }
        catch (e) {
          if (this.config.debug) {
            const err = document.createElement('div');
            err.className = 'error';
            err.textContent = `Render error on item #${idx}: ${e && e.message || e}`;
            wrapper.appendChild(err);
            console.error('[MMM-MyPackageTracker] renderItem failed:', e, it);
          }
        }
      });
    }
    return wrapper;
  },

  renderItem(it) {
    const row = document.createElement('div');
    row.className = 'item';

    if (this.config.showCarrierIcons) {
      // Use <img> for broad compatibility
      const icon = document.createElement('img');
      icon.className = 'carrier-icon';
      icon.width = icon.height = (this.config.iconSize || 16);
      icon.src = this.file('public/icons/fallback-package.svg');
      row.appendChild(icon);
    }

    const main = document.createElement('span');
    const label = [it.trackingNumber, it.courier || '', it.description || '']
      .filter(Boolean).join(' \u2014 ');
    main.textContent = label || it.trackingNumber || 'Unknown';
    row.appendChild(main);

    if (this.config.openOnClick && it.link) {
      row.style.cursor = 'pointer';
      row.addEventListener('click', () => {
        window.open(it.link, '_blank');
      });
    }

    return row;
  }
});
