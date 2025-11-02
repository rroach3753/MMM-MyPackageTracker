# MMM-MyPackageTracker

MagicMirror² module to display package tracking information with a compact, legible UI, carrier icons, and status grouping.

This release aligns all banners and package metadata to **v3.5.0**. It carries forward all behavior and fixes from v3.0.2 (validation of `ship24ApiKey`, 429 backoff with jitter, optional `showTrackingLinks`).

> **Since v3 (*2025-11-02*)** the backend migrated from **OneTracker** to the **Ship24 Tracking API** for improved reliability and coverage. **v3.0.1** adds an optional **listAllTrackers** mode so you can render shipments you already track in Ship24 without specifying them in the config.

---

## Table of contents
- [Overview](#overview)
- [What’s new](#whats-new)
- [Features](#features)
- [Requirements](#requirements)
- [Installation](#installation)
- [Configuration](#configuration)
  - [Option A — Explicit list (seedTrackers)](#option-a--explicit-list-seedtrackers)
  - [Option B — List all Ship24 trackers](#option-b--list-all-ship24-trackers)
  - [Webhook (optional)](#webhook-optional)
- [Statuses & mapping](#statuses--mapping)
- [Icons](#icons)
- [Troubleshooting](#troubleshooting)
- [Security & privacy](#security--privacy)
- [Changelog (highlights)](#changelog-highlights)
- [License](#license)

---

## Overview
- **Backend:** [Ship24 Tracking API](https://docs.ship24.com/tracking-api-reference/) with **Bearer** auth.\
  Trackers are created/fetched via the `/v1/trackers` endpoints. *Docs also include Postman and SDKs.*
- **UI:** Compact list with friendly labels, optional grouping (Out for delivery / In transit / Delivered today / Other), and a delivered‑today badge.
- **Icons:** Carrier logos from the **Simple Icons** color CDN with a single local fallback SVG.\
  `https://cdn.simpleicons.org/<slug>[/<hex>]`

> Ship24 docs: API reference & endpoints, Trackers overview, and normalized **status milestone** model used in this module’s mapping.  
> Simple Icons: CDN usage and brand slugging.  

---

## What’s new
- **v3.0.0**
  - Backend switched to **Ship24** (Bearer token).  
  - **CDN‑only icons** for all carriers; removed local‑first UPS/USPS SVGs.
- **v3.0.1**
  - **`listAllTrackers`** (optional): if `seedTrackers` is empty, the helper lists your account’s trackers via `GET /v1/trackers` (page‑based) and fetches results per tracker.  
  - **`listPageSize`**: pagination size (default 50).

---

## Features
- Create or fetch trackers via Ship24; show latest events by tracking number.  
- Status mapping from Ship24 **status milestones** to: **Delivered**, **Out for delivery**, **In transit**, **Other**.
- Delivered‑today badge and optional grouping by status.
- Icon slug mapping for common carriers (UPS, USPS, FedEx, DHL, Amazon, Canada Post, Royal Mail, DPD, Evri/Hermes, GLS, Poste Italiane, Correos, La Poste/Colissimo, Australia Post, New Zealand Post, PostNL, etc.).
- Clean, bright visuals designed for mirrors; configurable icon size and color (via CDN tint).

---

## Requirements
- MagicMirror²
- Node.js (same as your MagicMirror environment)
- A **Ship24** account and **API key** (Bearer)  

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
Add a config block to `~/MagicMirror/config/config.js`.

### Option A — Explicit list (seedTrackers)
Use this when you want to specify exactly which tracking numbers to show.

```js
{
  module: "MMM-MyPackageTracker",
  position: "top_right",
  header: "Packages",
  config: {
    // Ship24
    ship24ApiKey: "YOUR-SHIP24-KEY", // Authorization: Bearer <key>

    // List of tracking numbers to display (created/fetched idempotently)
    seedTrackers: [
      // { trackingNumber: "9405511202575421535949", courier: "usps", description: "Home goods" },
      // { trackingNumber: "1Z9999W99999999999", courier: "ups" }
    ],

    // UI
    refreshInterval: 5 * 60 * 1000,
    maxItems: 12,
    iconSize: 16,
    iconColor: "ffffff", // white via CDN; set null for brand color
    groupByStatus: true,
    showHeaderCount: true,
    showDeliveredToday: true,
    highlightOutForDelivery: true,
    openOnClick: true,
    debug: false
  }
}
```

### Option B — List all Ship24 trackers
Show everything already tracked in your Ship24 account without duplicating them in config.

```js
{
  module: "MMM-MyPackageTracker",
  position: "top_right",
  header: "Packages",
  config: {
    ship24ApiKey: "YOUR-SHIP24-KEY",

    // Leave seedTrackers empty; enable list mode
    seedTrackers: [],
    listAllTrackers: true,
    listPageSize: 50,

    refreshInterval: 5 * 60 * 1000,
    maxItems: 12,
    iconColor: "ffffff",
    groupByStatus: true,
    debug: false
  }
}
```

### Webhook (optional)
Prefer push updates over polling.

```js
{
  module: "MMM-MyPackageTracker",
  position: "top_right",
  config: {
    ship24ApiKey: "YOUR-SHIP24-KEY",
    useWebhooks: true,
    webhookPort: 8567,
    webhookPath: "/ship24/webhook",

    // …other UI options…
  }
}
```
Configure the webhook endpoint in your Ship24 dashboard to point to  
`http://<mirror-ip>:8567/ship24/webhook`.

---

## Statuses & mapping
Ship24 exposes a normalized **status model**. This module maps:

- `delivered` → **Delivered**
- `out_for_delivery` → **Out for delivery**
- `in_transit` → **In transit**
- *(others)* → **Other**

See the official status documentation for milestone semantics.

---

## Icons
- All logos are fetched via the **Simple Icons** CDN:
  ```
  https://cdn.simpleicons.org/<slug>[/<hex_color>]
  ```
- Common slugs are normalized internally (e.g., `ups`, `unitedstatespostalservice`, `fedex`, `dhl`, `amazon`, `canadapost`, `royalmail`, `dpd`, `evri`, `gls`, `postnl`, etc.).
- If a logo fails to load, a bundled `public/icons/fallback-package.svg` is shown.
- Set `iconColor: "ffffff"` to force white icons from the CDN (works well on dark mirrors).  

---

## Troubleshooting
- **Nothing shows:**
  - With **Option A**, ensure `seedTrackers` contains at least one valid `trackingNumber` and your `ship24ApiKey` is correct.  
  - With **Option B**, set `listAllTrackers: true` and leave `seedTrackers: []`.  
- **Auth errors (401/403):** verify your Ship24 key and account plan.
- **Rate limiting/429:** reduce `refreshInterval` or switch to Webhooks.
- **Icons missing:** verify slug mapping; USPS = `unitedstatespostalservice`, UPS = `ups`.
- **Debugging:** set `debug: true` and watch the MagicMirror logs for request/response hints.

---

## Security & privacy
- Keep your **Ship24 API key** secret. Do not commit it to Git.  
- The module only reads tracking metadata and events needed to render the list.

---

## Changelog (highlights)
- **3.0.1** — add `listAllTrackers` + `listPageSize`; list account trackers when no seeds are provided.  
- **3.0.0** — migrate backend to **Ship24**; icons via **Simple Icons CDN** for all carriers; remove local UPS/USPS SVGs.

For full details, see `CHANGELOG.md` in releases.

---

## License
MIT
