# MMM-MyPackageTracker

![CI](https://github.com/rg.shields.io/github/v/releasehat shows your packages from **OneTracker**. It authenticates with OneTracker, fetches your parcels, groups/sorts them, and presents a clean, compact UI with:

- **Friendly status labels** (e.g., `in_transit` → **In transit**) and optional **carrier wording** when available.
- Context‑aware time labels (**Delivered / ETA / Updated**) that only show when timestamps are **valid/plausible**.
- **Delivered today** badge & grouping.
- **Carrier icons** via the **Simple Icons** CDN (CC0‑1.0); a built‑in **fallback icon** is used when needed.

---

## Features
- 🔐 Logs in to **OneTracker** and periodically fetches active parcels (non‑archived by default).
- 🧭 **Friendly status labels** and **carrier‑provided text** when available.
- ⏱️ Context‑aware time labels (**Delivered / ETA / Updated**) only when timestamps are **plausible** (sentinels ignored).
- 🚚 Grouping by status: **Out for delivery**, **In transit**, **Delivered today**, **Other**.
- 🖼️ **Simple Icons** CDN for carrier marks (lightweight, CC0‑1.0); **fallback** icon for missing/failed logos.
- 🔔 Emits `ONETRACKER_DELIVERED` when a parcel first transitions to *delivered*.
- ⚙️ Compact layout with configurable **`iconSize`**.

---

## Installation
```bash
cd ~/MagicMirror/modules
git clone https://github.com/rroach3753/MMM-MyPackageTracker.git
cd MMM-MyPackageTracker
npm install
```

> **ZIP install:** Download a release ZIP and unzip into `~/MagicMirror/modules/MMM-MyPackageTracker`, then run `npm install`.

---

## Configuration
Add to `~/MagicMirror/config/config.js`:

```js
{
  module: "MMM-MyPackageTracker",
  position: "top_right",
  header: "Packages", // optional
  config: {
    // Auth & data
    email: "you@example.com",
    password: "YOUR-ONETRACKER-PASSWORD",
    refreshInterval: 5 * 60 * 1000,   // 5 minutes
    showArchived: false,               // include archived parcels if true
    statusFilter: [],                  // e.g. ["in_transit","out_for_delivery","delivered"]
    maxItems: 12,
    sortBy: "time_updated",            // "time_updated" | "eta" | "status"

    // UI
    showHeaderCount: true,
    showCarrierIcons: true,
    groupByStatus: true,
    highlightOutForDelivery: true,
    showDeliveredToday: true,
    openOnClick: true,
    iconSize: 12,                      // px, min 8

    // v1.1.8 — friendly status text
    preferCarrierStatusText: true,     // use OneTracker's tracking_status_text when present
    statusCase: "title"                // "title" | "sentence" | "original"
  }
}
```

---

## Options
| Option | Type | Default | Description |
|---|---|---:|---|
| `email` | string | `""` | OneTracker account email (for token). |
| `password` | string | `""` | OneTracker password. |
| `refreshInterval` | number (ms) | `300000` | Polling interval. Prefer 5–10 minutes. |
| `showArchived` | boolean | `false` | Include archived parcels if `true`. |
| `statusFilter` | string[] | `[]` | Only show parcels whose `tracking_status` is in the list. |
| `maxItems` | number | `12` | Max rows per group/list. |
| `sortBy` | string | `"time_updated"` | Sort by `time_updated` (default), `eta`, or `status` (Out‑for‑delivery prioritized). |
| `showHeaderCount` | boolean | `true` | Show total count in the header. |
| `showCarrierIcons` | boolean | `true` | Display Simple Icons brand mark before carrier name. |
| `groupByStatus` | boolean | `true` | Group into Out for delivery / In transit / Delivered today / Other. |
| `highlightOutForDelivery` | boolean | `true` | Subtle emphasis for out‑for‑delivery rows. |
| `showDeliveredToday` | boolean | `true` | Show delivered‑today badge & section. |
| `openOnClick` | boolean | `true` | Open `tracking_url` in a new tab when a row is clicked. |
| `iconSize` | number (px) | `12` | Pixel size of carrier icon (min 8). |
| `preferCarrierStatusText` | boolean | `true` | Prefer OneTracker’s `tracking_status_text` over raw status key. |
| `statusCase` | string | `"title"` | Case for status strings: `"title"`, `"sentence"`, or `"original"`. |

---

## Events
- **`ONETRACKER_DELIVERED`** — fired when a parcel transitions to **delivered** since the previous fetch.

Example payload:
```json
{
  "id": 123,
  "carrier": "USPS",
  "description": "Camera",
  "tracking_id": "9400...US",
  "when": "2025-10-14T16:30:00Z"
}
```

---

## How It Works
- **Auth** — `POST /auth/token` with `{ email, password }` → `session.token` & `session.expiration`. Subsequent calls include `x-api-token: <token>`.
- **Data** — `GET /parcels` returns parcel objects with fields like `carrier`, `description`, `tracking_status`, `tracking_status_text`, `tracking_status_description`, `tracking_location`, `tracking_time_estimated`, `tracking_time_delivered`, `time_updated`, `is_archived`, `tracking_url`.
- **Time display (v1.1.6+)** — robust parsing (seconds/ms/numeric/ISO). We display **Delivered** > **ETA** > **Updated** only when the chosen timestamp is **plausible**; known sentinels are ignored.

---

## Status Text & Case (v1.1.8)
- `pre_transit` → **Pre‑transit**; `in_transit` → **In transit**; `out_for_delivery` → **Out for delivery**; `delivered` → **Delivered**; plus friendly labels for `exception`, `failure`, `delayed`, etc.
- If `preferCarrierStatusText: true` and `tracking_status_text` exists, use it.
- Control final casing with `statusCase`: `"title"` (default), `"sentence"`, or `"original"`.
- Subline composes **Status • Description • Location** (only present fields are shown).

---

## Icons & Fallback
- Brand marks are loaded **only** from **Simple Icons** CDN: `https://cdn.simpleicons.org/[slug]` (e.g., `fedex`, `ups`, `usps`, `dhl`, `amazon`, `canadapost`).
- If a slug is unknown or the CDN request fails, we hide the bubble and/or use a **fallback** icon served from this module.

---

## Troubleshooting
- **401 Unauthorized** — Wrong credentials or expired token. The helper re‑auths on 401; verify `email`/`password` if it persists.
- **No parcels** — Ensure parcels exist in OneTracker (mobile/web). Check `showArchived`/`statusFilter` isn’t hiding them.
- **Weird dates (e.g., 1970/Dec 31)** — Fixed in v1.1.6; v1.1.7 also ignores sentinel/implausible times.
- **USPS icon “broken”** — Use slug `usps`. The UI removes broken icon bubbles to avoid artifacts.
- **Logs** — `pm2 logs mm` (or run MagicMirror with `npm start dev` in `~/MagicMirror`).

---

## Release Highlights
- **v1.1.8** — Friendly status labels; prefer carrier text; `statusCase`; subline tidy.
- **v1.1.7** — Ignore sentinel/implausible timestamps; show labels only when valid.
- **v1.1.6** — Robust timestamp parsing; context‑aware labels.
- **v1.1.5** — USPS slug fix; built‑in fallback icon.
- **v1.1.4** — `iconSize` option for compact layouts.

See **CHANGELOG.md** for full history.

---

## Contributing & CI
- Issues and PRs are welcome.
- CI runs on Node **18** and **20** (see `.github/workflows/ci.yml`).
- Releases can auto‑attach the module ZIP (see `.github/workflows/release.yml`).

---

## License
**MIT** — see LICENSE.

---

## References
- MagicMirror² module development: <https://docs.magicmirror.builders/module-development/introduction.html>
- OneTracker API access: <https://support.onetracker.app/apis/>
- Simple Icons (CC0‑1.0) + CDN: <https://simpleicons.org>
