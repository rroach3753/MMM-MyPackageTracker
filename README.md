# MMM-MyPackageTracker v4.0.0 (Ship24)

From‑scratch v4 for **MagicMirror²** backed by the **Ship24 Tracking API**. 

## Highlights
- **Two modes**: 
  - **Seed** — explicit list; idempotent **POST `/v1/trackers/track`** per item (create‑if‑needed + return results). 
  - **List** — account‑wide; **GET `/v1/trackers`** (paged) + **GET `/v1/trackers/:trackerId/results`** to render what your Ship24 account is already tracking. 
- **Bearer auth** against `https://api.ship24.com` with `Authorization: Bearer <API_KEY>`. 
- Optional **webhook receiver** (shared secret) to push updates into the mirror.
- Clean UI with **Simple Icons** CDN logos and a generic fallback SVG.

> Ship24 API base, authentication and endpoints are documented in the official docs and reference. See: API Reference (base URL, OpenAPI) and Trackers + Common Scenarios pages. citeturn62search31turn62search34turn62search23

---

## Install
```bash
cd ~/MagicMirror/modules
git clone https://github.com/your/repo/MMM-MyPackageTracker.git
cd MMM-MyPackageTracker
npm install
```

Alternatively, copy the v4 ZIP into this folder and extract, then `npm install`.

---

## Configure
Add to `~/MagicMirror/config/config.js`:

```js
{
  module: "MMM-MyPackageTracker",
  position: "top_right",
  header: "Packages",
  config: {
    // Ship24 API key (required)
    ship24ApiKey: "YOUR-SHIP24-KEY",  // Authorization: Bearer <key>

    // Mode: "list" (account-wide) or "seed" (explicit numbers)
    mode: "list",

    // Only for seed mode
    seedTrackers: [
      // { trackingNumber: "9405511202575421535949", courier: "usps", description: "Home" }
    ],

    // Listing pagination
    listPageSize: 50,

    // Polling
    pollIntervalMs: 5 * 60 * 1000,

    // Optional webhooks (push updates)
    webhooks: {
      enabled: false,
      port: 0,                 // e.g., 8567
      path: "/ship24/webhook",
      secret: ""              // shared secret; send via header x-ship24-secret or ?secret=
    },

    // UI
    maxItems: 14,
    groupByStatus: true,
    showHeaderCount: true,
    showCarrierIcons: true,
    iconSize: 16,
    iconColor: null,          // null=brand color; or hex like 'ffffff'
    openOnClick: true,
    showTrackingLinks: true,

    // Dev
    debug: false
  }
}
```

**Auth and base URL**: the Ship24 API uses `Authorization: Bearer <API_KEY>` and the base is `https://api.ship24.com`. See Getting Started + API Reference. citeturn62search30turn62search31

---

## How it works
- **List mode**: `GET /v1/trackers?page=X&size=N` then `GET /v1/trackers/:trackerId/results` for events; UI uses `statusMilestone` to map to *Delivered / Out for delivery / In transit / Other*. citeturn62search34turn62search29
- **Seed mode**: `POST /v1/trackers/track` per tracking number (idempotent create + results). citeturn62search23
- **Webhooks** (optional): configure a URL in your Ship24 dashboard; push is recommended over polling in their docs’ “Common Scenarios”. citeturn62search23

---

## Status mapping
Ship24 publishes a normalized status model (milestones). This module maps:

- `delivered` → **Delivered**
- `out_for_delivery` → **Out for delivery**
- `in_transit` → **In transit**
- everything else → **Other**

See the Ship24 **Status** page for milestone semantics and examples. citeturn62search29

---

## Troubleshooting
- **401/403**: wrong API key or plan not activated — confirm in the Ship24 dashboard (Getting Started). citeturn62search30
- **429 Too Many Requests**: v4 backs off exponentially with jitter; consider longer `pollIntervalMs` or webhooks. (Rate limiter details in docs.) citeturn62search25
- **No packages shown**: in *list* mode ensure your account has trackers; in *seed* mode ensure `seedTrackers` has valid numbers (and courier when possible).

---

## License
MIT
