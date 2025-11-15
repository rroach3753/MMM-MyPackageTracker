
# MMM-MyPackageTracker v5.0.1 (Ship24)

MagicMirror² module for multi‑carrier package tracking via **Ship24**.

- **List mode**: shows everything already tracked in your Ship24 account.
- **Seed mode**: idempotently creates trackers from explicit numbers and renders them.
- **Base auto‑discovery** with default `https://api.ship24.com/public/v1`.
- **Robust list parsing** for `{ data: { trackers: [...] } }` and fallbacks.

## Install
```bash
cd ~/MagicMirror/modules
git clone https://github.com/rroach3753/MMM-MyPackageTracker.git
cd MMM-MyPackageTracker
npm install
```

## Configure
```js
{
  module: "MMM-MyPackageTracker",
  position: "top_right",
  header: "My Packages",
  config: {
    ship24ApiKey: "YOUR_KEY",
    ship24BaseUrl: "https://api.ship24.com/public/v1", // recommended
    mode: "list",                 // or "seed"
    seedTrackers: [ /* ... */ ],
    listPageSize: 50,
    pollIntervalMs: 5 * 60 * 1000,
    maxItems: 14,
    groupByStatus: true,
    showHeaderCount: true,
    showCarrierIcons: true,
    iconSize: 16,
    openOnClick: true,
    showTrackingLinks: true,
    debug: false
  }
}
```
