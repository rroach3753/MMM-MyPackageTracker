# MMM-MyPackageTracker (v2.0.0)

MagicMirror² module that displays packages from **OneTracker** with friendly labels, grouping, and lightweight carrier icons.

## Features
- Auth via `POST /auth/token`; fetch via `GET /parcels` with `x-api-token` (OneTracker API).
- Group by status (Out for delivery, In transit, Delivered today, Other).
- Simple Icons CDN for carrier marks; clean fallback when unmapped.
- Robust fallbacks: missing values never render as `"unknown"`.

## Install
```bash
cd ~/MagicMirror/modules
git clone https://github.com/<you>/MMM-MyPackageTracker.git
cd MMM-MyPackageTracker
npm install
```

## Config
```js
{
  module: "MMM-MyPackageTracker",
  position: "top_right",
  header: "Packages",
  config: {
    email: "you@example.com",
    password: "YOUR-ONETRACKER-PASSWORD",

    refreshInterval: 5*60*1000,
    showArchived: false,
    statusFilter: [],
    maxItems: 12,
    sortBy: "time_updated", // "time_updated" | "eta" | "status"

    showHeaderCount: true,
    showCarrierIcons: true,
    groupByStatus: true,
    highlightOutForDelivery: true,
    showDeliveredToday: true,
    openOnClick: true,
    iconSize: 12,

    debug: false
  }
}
```

## Dev
Run MagicMirror in dev mode to view front-end console logs.

## License
MIT
