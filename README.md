
# MMM-MyPackageTracker v5 (Ship24)

MagicMirror² module for multi-carrier package tracking via **Ship24**. Supports:

- **List mode**: renders everything already tracked in your Ship24 account.
- **Seed mode**: idempotently creates trackers from explicit numbers and renders them.
- **Auto-discovery** of Ship24 API base (defaults to `https://api.ship24.com/public/v1`).
- **Backoff** on HTTP 429, **debug banners**, and an **empty‑list** hint.

## Install
```bash
cd ~/MagicMirror/modules
git clone https://github.com/rroach3753/MMM-MyPackageTracker.git
cd MMM-MyPackageTracker
npm install
```

## Configure (basic)
Add to `~/MagicMirror/config/config.js`:
```js
{
  module: "MMM-MyPackageTracker",
  position: "top_right",
  header: "Packages",
  config: {
    ship24ApiKey: "YOUR_SHIP24_KEY",         // required
    // ship24BaseUrl: "https://api.ship24.com/public/v1", // optional override
    mode: "list",                            // or "seed"
    seedTrackers: [                           // only for seed mode
      // { trackingNumber: "9405...", courier: "usps", description: "Home" }
    ],
    listPageSize: 50,
    pollIntervalMs: 5 * 60 * 1000,
    maxItems: 14,

    // UI
    groupByStatus: true,
    showHeaderCount: true,
    showCarrierIcons: true,
    iconSize: 16,
    iconColor: null, // null = brand color
    openOnClick: true,
    showTrackingLinks: true,

    // Dev
    debug: false
  }
}
```

> **Ship24 API**: Bearer auth; base is `https://api.ship24.com`. This module now defaults to the **`/public/v1`** route family (auto‑discovers alternates),
> per current docs & ecosystems. See **API Reference** and **Trackers/Common Scenarios** for endpoints.  
> Docs: [API Reference](https://docs.ship24.com/tracking-api-reference/) · [Trackers](https://docs.ship24.com/trackers) · [Common Scenarios](https://docs.ship24.com/common-scenarios)

## How it works
- **List** → `GET /trackers?page=&size=` followed by `GET /trackers/:trackerId/results` per item.
- **Seed** → `POST /trackers/track` idempotently creates (or reuses) and returns results.

## Troubleshooting
- **401/403**: wrong API key or plan not activated (check Ship24 dashboard).
- **HTML or empty responses**: base route mismatch; set `ship24BaseUrl: "https://api.ship24.com/public/v1"` or let auto‑discovery select it.
- **429**: module backs off with jitter; increase `pollIntervalMs` or use Ship24 **webhooks**.

## License
MIT
