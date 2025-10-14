
# MMM-MyPackageTracker

A **MagicMirror²** module that displays your packages from **OneTracker**. Add or maintain parcels in the OneTracker app or web; this module authenticates to the OneTracker API, fetches your parcels, and renders a clean, compact list with status, ETA/delivery time, location, and carrier. Brand marks are loaded from the **Simple Icons** CDN; if a logo can’t be found or fails to load, a neutral **fallback** icon is shown.

---

## Features
- Authenticates to OneTracker and periodically fetches your parcels.
- Groups by status (**Out for delivery**, **In transit**, **Delivered today**, **Other**).
- Brand marks via **Simple Icons** CDN; USPS slug explicitly fixed to `usps`.
- Fallback icon when a brand is unknown or the CDN image fails.
- Shows most relevant time (delivered time → ETA → last update).
- Emits `ONETRACKER_DELIVERED` when a parcel first transitions to *delivered*.
- Configurable icon size (`iconSize`).

---

## Installation
```bash
cd ~/MagicMirror/modules
git clone https://github.com/rroach3753/MMM-MyPackageTracker.git
cd MMM-MyPackageTracker
npm install
```

---

## Configuration
Add this block to `~/MagicMirror/config/config.js`:
```js
{
  module: "MMM-MyPackageTracker",
  position: "top_right",
  header: "Packages",
  config: {
    email: "you@example.com",
    password: "YOUR-ONETRACKER-PASSWORD",
    refreshInterval: 5 * 60 * 1000,
    showArchived: false,
    statusFilter: [],
    maxItems: 12,
    sortBy: "time_updated",
    showHeaderCount: true,
    showCarrierIcons: true,
    groupByStatus: true,
    highlightOutForDelivery: true,
    showDeliveredToday: true,
    openOnClick: true,
    iconSize: 12
  }
}
```

---

## Options
| Option | Type | Default | Description |
|---|---|---|---|
| email | string | "" | OneTracker account email |
| password | string | "" | OneTracker password |
| refreshInterval | number | 300000 | Polling interval in ms |
| showArchived | boolean | false | Include archived parcels |
| statusFilter | array | [] | Filter by status |
| maxItems | number | 12 | Max rows per group |
| sortBy | string | time_updated | Sort key |
| showHeaderCount | boolean | true | Show total count |
| showCarrierIcons | boolean | true | Show Simple Icons logo |
| groupByStatus | boolean | true | Group parcels by status |
| highlightOutForDelivery | boolean | true | Highlight out-for-delivery |
| showDeliveredToday | boolean | true | Show delivered-today badge |
| openOnClick | boolean | true | Click opens tracking URL |
| iconSize | number | 12 | Carrier icon size in px |

---

## Events
- `ONETRACKER_DELIVERED`: Fired when a parcel transitions to delivered.

---

## How it Works
- Auth: `POST /auth/token` → session.token
- Data: `GET /parcels` → parcel list
- Logos: Simple Icons CDN → fallback if missing

---

## Troubleshooting
- **401 Unauthorized**: Check credentials
- **Broken icon**: USPS slug is `usps`; fallback icon auto-applies

---

## License
MIT
