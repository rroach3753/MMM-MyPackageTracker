
# MMM-MyPackageTracker

A **MagicMirror²** module that shows your packages from **OneTracker** (you keep adding or auto‑detecting packages in the OneTracker app/web). It authenticates with OneTracker, fetches your parcels, groups/sorts them, and adds helpful UI touches like carrier icons and a **Delivered Today** badge.

- **OneTracker API**: Auth via `POST /auth/token` then requests with `x-api-token` (base: `https://api.onetracker.app`). Parcels are retrieved with `GET /parcels`.
- **MagicMirror module pattern**: Front‑end JS + `node_helper.js` for server‑side API calls; static assets placed under `public/` are served by MagicMirror.
- **Icons**: Uses the **Simple Icons CDN** exclusively (license **CC0‑1.0**), so no official logos are redistributed.

> References: OneTracker API access docs; MagicMirror module docs; Simple Icons project.  > – https://support.onetracker.app/apis/  > – https://docs.magicmirror.builders/module-development/introduction.html  > – https://packagist.org/packages/simple-icons/simple-icons

---

## Features
- Authenticates to OneTracker and periodically fetches **active (non‑archived)** parcels by default.  
- **Simple Icons** brand marks for common carriers (FedEx, UPS, USPS, DHL, Amazon Logistics, Canada Post).  
- Colorized statuses with **Out for delivery** highlight.
- **Delivered Today** badge in the header and an optional **Delivered Today** section.
- Show **total count** in the header; click a parcel to open `tracking_url`.
- Emits `ONETRACKER_DELIVERED` when something newly moves to *delivered*.

## Installation
```bash
cd ~/MagicMirror/modules
# copy this folder here (or clone your repo)
cd MMM-MyPackageTracker
npm install
```

## Configuration
Add an entry in your `~/MagicMirror/config/config.js`:
```js
{
  module: "MMM-MyPackageTracker",
  position: "top_right",
  header: "Packages", // optional
  config: {
    email: "you@example.com",
    password: "YOUR-ONETRACKER-PASSWORD",
    refreshInterval: 5 * 60 * 1000,   // 5 minutes
    showArchived: false,               // include archived parcels if true
    statusFilter: [],                  // e.g. ["in_transit","out_for_delivery","delivered"]
    maxItems: 12,
    sortBy: "time_updated",           // "time_updated" | "eta" | "status"

    // UI extras
    showHeaderCount: true,
    showCarrierIcons: true,
    groupByStatus: true,
    highlightOutForDelivery: true,
    showDeliveredToday: true,
    openOnClick: true,
    iconSize: 12                      // NEW: icon size in pixels (min 8)
  }
}
```

### All Options
| Option | Type | Default | Description |
|---|---|---:|---|
| `email` | string | `""` | Your OneTracker account email (used to obtain API token). |
| `password` | string | `""` | Your OneTracker password. |
| `refreshInterval` | number (ms) | `300000` | Polling interval. Be considerate (5–10 min suggested). |
| `showArchived` | boolean | `false` | Include archived parcels. |
| `statusFilter` | string[] | `[]` | Only show parcels with these statuses (lowercase). |
| `maxItems` | number | `12` | Limit rows rendered per group/list. |
| `sortBy` | string | `"time_updated"` | Sort by `time_updated`, `eta` or `status` (after prioritizing *out_for_delivery*). |
| `showHeaderCount` | boolean | `true` | Show total parcel count in header. |
| `showCarrierIcons` | boolean | `true` | Show Simple Icons brand mark before carrier name. |
| `groupByStatus` | boolean | `true` | Group into Out for delivery / In transit / Delivered today / Other. |
| `highlightOutForDelivery` | boolean | `true` | Add visual emphasis to out-for-delivery rows. |
| `showDeliveredToday` | boolean | `true` | Show delivered-today badge & section. |
| `openOnClick` | boolean | `true` | Open `tracking_url` in a new tab when a row is clicked. |
| `iconSize` | number (px) | `12` | Pixel size for carrier icons (min 8). |

## Events (Notifications)
- `ONETRACKER_DELIVERED` — fired when a parcel transitions to **delivered** since the last fetch.

## How it works
- **Auth**: `POST /auth/token` with `{email,password}` → returns `session.token` & `session.expiration`.  
- **Data**: `GET /parcels` with header `x-api-token: <token>` → returns a list of parcel objects.  
  Parcel fields used include `carrier`, `description`, `tracking_status`, `tracking_location`, `tracking_time_estimated`, `tracking_time_delivered`, `time_updated`, `is_archived`, and `tracking_url`.

## Troubleshooting
- **401 Unauthorized**: wrong email/password or expired token. The helper refreshes automatically on 401; verify your credentials if it persists.  
- **No parcels appear**: ensure you’ve added them in OneTracker (app/web) and that `showArchived`/`statusFilter` aren’t hiding them.  
- **API limits**: be considerate with `refreshInterval` (default 5 min). Avoid very short intervals.

## License
MIT
