# MMM-MyPackageTracker v3.0.0

MagicMirror² module to display package tracking information.

> **What changed in v3?** The backend has migrated from **OneTracker** to the **Ship24 Tracking API** for broader carrier coverage and a maintained developer experience. Icons are now **CDN‑only** (Simple Icons) for *all* carriers, with a single fallback SVG. Local‑first UPS/USPS icons were removed.

---

## Overview
- **Backend:** Ship24 Tracking API (Bearer token) — replaces the legacy OneTracker integration.  
- **UI:** Compact, high‑contrast list with friendly status labels, optional grouping, and a "Delivered today" badge.  
- **Icons:** Delivered via the **Simple Icons** color CDN; automatic fallback glyph if a logo fails to load.  
- **Performance:** Polling interval is configurable; a minimal webhook receiver is available for push updates.

> The original README described an OneTracker‑based flow with features like friendly labels, delivered‑today grouping, and CDN icons. Those UX features remain, while the **data source** is now Ship24.  

---

## Features
- **Ship24 integration**: create or refresh trackers and fetch live events per tracking number.  
- **Clear statuses** (mapped from Ship24 `statusMilestone`):
  - `delivered` → **Delivered**
  - `out_for_delivery` → **Out for delivery**
  - `in_transit` → **In transit**
  - (all others) → **Other**
- **Delivered‑today badge** and **status grouping** (Out for delivery / In transit / Delivered today / Other).
- **Icon system**: Simple Icons CDN for all carriers; single **fallback-package.svg** if a logo 404s.
- **Readable design**: bright icons and balanced text contrast for MagicMirror glass.

---

## Installation
```bash
cd ~/MagicMirror/modules
git clone https://github.com/rroach3753/MMM-MyPackageTracker.git
cd MMM-MyPackageTracker
npm install
```

**ZIP install:** Download a release ZIP and unzip into `~/MagicMirror/modules/MMM-MyPackageTracker`, then run `npm install`.

---

## Configuration
Add to your `~/MagicMirror/config/config.js`:

```js
{
  module: "MMM-MyPackageTracker",
  position: "top_right",
  header: "Packages", // optional
  config: {
    // ---- Ship24 API (required) ----
    // Bearer token from your Ship24 dashboard
    ship24ApiKey: "YOUR-SHIP24-KEY",

    // Track these numbers (idempotent create + fetch each poll)
    seedTrackers: [
      // { trackingNumber: "9405511202575421535949", courier: "usps", description: "Sample" },
      // { trackingNumber: "1Z9999W99999999999", courier: "ups" }
    ],

    // Optional webhook support (disabled by default)
    useWebhooks: false,
    webhookPort: 0,                 // e.g., 8567
    webhookPath: "/ship24/webhook", // your inbound path

    // ---- UI ----
    refreshInterval: 5 * 60 * 1000, // 5 minutes
    showArchived: false,            // legacy flag, ignored by Ship24 backend
    statusFilter: [],               // reserved for future filtering
    maxItems: 12,
    sortBy: "time_updated",         // "time_updated" | "status" | "eta"
    showHeaderCount: true,
    showCarrierIcons: true,
    groupByStatus: true,
    highlightOutForDelivery: true,
    showDeliveredToday: true,
    openOnClick: true,
    iconSize: 16,

    // Icon color via Simple Icons CDN (null = brand color)
    iconColor: "ffffff", // set to null to use brand color

    // Debug
    debug: false
  }
}
```

### Notes
- If you know the courier for a tracker, set `courier` for better accuracy.
- You can also pass `originCountryCode`, `destinationCountryCode`, `clientTrackerId`, and `shipmentReference` per tracker (see README‑SHIP24 and the code for examples).

---

## Icon Handling
- Icons are fetched from **Simple Icons CDN**:  
  `https://cdn.simpleicons.org/<slug>[/<hex_color>]`
- Common slugs are mapped (e.g., `ups`, `unitedstatespostalservice`, `fedex`, `dhl`, `amazon`, `canadapost`, `royalmail`, `dpd`, `evri`, `gls`, `postnl`, etc.).
- If an icon fails, a **generic fallback** is displayed: `public/icons/fallback-package.svg`.

> Local, brand‑specific SVGs for UPS/USPS that shipped in earlier pre‑v3 builds were removed. The module no longer references `brand-ups.svg` or `brand-usps.svg`.

---

## Webhooks (optional)
- Set `useWebhooks: true` and choose a `webhookPort`/`webhookPath` to accept Ship24 POST callbacks.  
- Configure the webhook URL in your Ship24 dashboard to point at `http://<mirror-ip>:<port><path>`.
- You can add shared‑secret verification later (stub provided in `node_helper.js`).

---

## Troubleshooting
- **No results shown**: verify `ship24ApiKey` and try a known tracking number in the Ship24 dashboard first.  
- **Icons look dim**: increase brightness in CSS (`.mmp-icon { filter: brightness(1.45) contrast(1.2); }`) or set `iconColor: "ffffff"`.
- **UPS/USPS still missing**: ensure slugs resolve; these are `ups` and `unitedstatespostalservice` at the CDN.

---

## Upgrade notes (from v2.x to v3)
- **Backend**: OneTracker → Ship24. Replace credentials with `ship24ApiKey`.  
- **Icons**: removed local‑first UPS/USPS; icons now come from CDN for all carriers. You may delete `public/icons/brand-ups.svg` and `brand-usps.svg` if present.  
- **Config**: keep `seedTrackers` (now Ship24), `refreshInterval`, and display settings.

---

## License
MIT

---

### References
- Ship24 API reference (base URL, trackers, status model).  
- Simple Icons for carrier slugs & CDN color endpoints.
