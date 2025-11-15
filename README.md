
# MMM-MyPackageTracker v5.0.2 (Ship24)

MagicMirror² module for multi‑carrier package tracking via **Ship24**.

- **List mode**: renders everything already tracked in your Ship24 account.
- **Seed mode**: idempotently creates trackers from explicit numbers and renders them.
- **Robust list parsing** for `{ data: { trackers: [...] } }`, with fallbacks.
- **Full status mapping** and **sorted UI** (status priority → courier → title → tracking).
- Default base `https://api.ship24.com/public/v1` with auto‑discovery.

## Configure (excerpt)
```js
{
  module: "MMM-MyPackageTracker",
  position: "top_right",
  header: "My Packages",
  config: {
    ship24ApiKey: "YOUR_KEY",
    ship24BaseUrl: "https://api.ship24.com/public/v1",
    mode: "list",
    listPageSize: 50,
    pollIntervalMs: 5 * 60 * 1000,
    maxItems: 14,
    groupByStatus: true,
    showCarrierIcons: true,
    iconSize: 20,
    openOnClick: false,
    showTrackingLinks: false,
    debug: false
  }
}
```
