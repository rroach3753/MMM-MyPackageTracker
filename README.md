
# MMM-MyPackageTracker

[![CI](https://github.com/rroach3753/MMM-MyPackageTracker/actions/workflows/ci.yml/badge.svg)](https://github.com/rroach3753/MMM-MyPackageTracker/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/rroach3753/MMM-MyPackageTracker)](https://github.com/rroach3753/MMM-MyPackageTracker/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

MagicMirror² module to track packages via **OneTracker**. Displays parcels with grouping, delivered-today badge, and carrier icons from **Simple Icons CDN**.

---

## ✨ Features
- **OneTracker API integration**: Authenticates and fetches parcels via `POST /auth/token` and `GET /parcels`.
- **Grouping**: Out for delivery, In transit, Delivered today, Other.
- **Delivered Today badge** in header.
- **Carrier icons** via Simple Icons CDN (CC0-1.0 license).
- **Configurable icon size** (`iconSize`, default 12px).
- Click a parcel to open its tracking URL.
- Emits `ONETRACKER_DELIVERED` notification when a parcel is newly delivered.

---

## 📦 Installation
```bash
cd ~/MagicMirror/modules
# Clone your repo or unzip the release
cd MMM-MyPackageTracker
npm install
```

---

## ⚙️ Configuration
Add to `~/MagicMirror/config/config.js`:
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

    // UI options
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

### Options Table
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `email` | string | `""` | OneTracker account email. |
| `password` | string | `""` | OneTracker password. |
| `refreshInterval` | number | `300000` | Polling interval in ms. |
| `showArchived` | boolean | `false` | Include archived parcels. |
| `statusFilter` | array | `[]` | Filter by statuses (lowercase). |
| `maxItems` | number | `12` | Max items per group/list. |
| `sortBy` | string | `"time_updated"` | Sort key: `time_updated`, `eta`, or `status`. |
| `showHeaderCount` | boolean | `true` | Show total count in header. |
| `showCarrierIcons` | boolean | `true` | Show Simple Icons brand mark. |
| `groupByStatus` | boolean | `true` | Group parcels by status. |
| `highlightOutForDelivery` | boolean | `true` | Highlight out-for-delivery rows. |
| `showDeliveredToday` | boolean | `true` | Show delivered-today badge & section. |
| `openOnClick` | boolean | `true` | Open tracking URL on click. |
| `iconSize` | number | `12` | Pixel size for carrier icons. |

---

## 🖼 Screenshot
![MMM-MyPackageTracker screenshot](docs/screenshot.png)

---

## 🔔 Events
- `ONETRACKER_DELIVERED` — fired when a parcel transitions to delivered.

---

## 🛠 Troubleshooting
- **401 Unauthorized**: Check email/password; token refreshes automatically.
- **No parcels**: Ensure parcels exist in OneTracker and filters aren’t hiding them.
- **Broken icon**: USPS slug fixed to `usps`; UI hides failed icons gracefully.

---

## 📜 Changelog
See [CHANGELOG.md](CHANGELOG.md).

---

## 📄 License
MIT
