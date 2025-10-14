
# MMM-MyPackageTracker

MagicMirror² module that displays your **OneTracker** parcels with grouping, delivered‑today badge, and brand icons via **Simple Icons**.

## Install
```bash
cd ~/MagicMirror/modules
# copy or clone this folder as MMM-MyPackageTracker
cd MMM-MyPackageTracker
npm install
```

## Configure
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
    sortBy: "time_updated",   // "time_updated" | "eta" | "status"

    // UI
    showHeaderCount: true,
    showCarrierIcons: true,
    groupByStatus: true,
    highlightOutForDelivery: true,
    showDeliveredToday: true,
    openOnClick: true,
    iconSize: 12              // icon px size (min 8)
  }
}
```

## Notes
- Icons are loaded from **Simple Icons CDN** (`https://cdn.simpleicons.org/{slug}`) and not bundled.
- USPS slug is `usps`. If an icon fails to load, the UI hides the bubble so rows still render.

## License
MIT
