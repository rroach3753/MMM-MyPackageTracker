# MMM-MyPackageTracker

A **MagicMirror²** module that shows your packages from **OneTracker** (you keep adding or auto‑detecting packages in the OneTracker app/web). It authenticates with OneTracker, fetches your parcels, groups/sorts them, and adds helpful UI touches like carrier icons and a **Delivered Today** badge. It also emits an event you can hook into when a package is delivered.

- **OneTracker API**: Auth via `POST /auth/token` then requests with `x-api-token` (base: `https://api.onetracker.app`). Parcels are retrieved with `GET /parcels`. See OneTracker’s API docs.  
- **MagicMirror module pattern**: Front‑end JS + `node_helper.js` for server‑side API calls; static assets placed under `public/` are served at `/MMM-MyPackageTracker/...`.

> ℹ️ References: OneTracker API docs (support site) and MagicMirror module documentation.  
> – https://support.onetracker.app/apis/  
> – https://docs.magicmirror.builders/module-development/introduction.html

---

## Features
- Authenticates to OneTracker and periodically fetches **active (non‑archived)** parcels by default.  
- **Carrier icons** for common carriers (FedEx, UPS, USPS, DHL, Amazon Logistics, Canada Post).  
- Colorized statuses with **Out for delivery** highlight.
- **Delivered Today** badge in the header and an optional **Delivered Today** section.
- Show **total count** in the header; click a parcel to open `tracking_url`.
- Emits `ONETRACKER_DELIVERED` when something newly moves to *delivered*.

## Requirements
- **MagicMirror²** (latest stable) on Linux/Raspberry Pi.
- **Node.js 18+** (Node 20 is recommended on Raspberry Pi 5).  
  On Raspberry Pi OS:
  ```bash
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
  node -v && npm -v
  ```

## Installation
Clone (or copy) the module into your MagicMirror modules folder:
```bash
cd ~/MagicMirror/modules
# if you have a repository URL, use that; otherwise copy this folder here
# git clone https://github.com/<you>/MMM-MyPackageTracker.git
cd MMM-MyPackageTracker
npm install
```

If you downloaded a ZIP release, just unzip it into `~/MagicMirror/modules` and run `npm install` inside `MMM-MyPackageTracker`.

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
    openOnClick: true
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
| `showCarrierIcons` | boolean | `true` | Show carrier icon before carrier name. |
| `groupByStatus` | boolean | `true` | Group into Out for delivery / In transit / Delivered today / Other. |
| `highlightOutForDelivery` | boolean | `true` | Add visual emphasis to out-for-delivery rows. |
| `showDeliveredToday` | boolean | `true` | Show delivered-today badge & section. |
| `openOnClick` | boolean | `true` | Open `tracking_url` in a new tab when a row is clicked. |

> **Positions:** Use any MagicMirror position (e.g., `top_left`, `top_right`, `bottom_bar`, etc.). See MagicMirror module configuration docs for the full list.  
> https://docs.magicmirror.builders/modules/configuration.html

### Security (keep credentials safe)
- If your mirror is on a network you don’t fully control, avoid committing credentials into `config.js`.
- If you ever run MagicMirror in Docker, prefer `config.js.template` + environment variables to inject secrets at runtime.  
  See the MagicMirror container docs for how `config.js.template` is rendered and how env vars are passed.  
  https://khassel.gitlab.io/magicmirror/docs/configuration.html

## What it looks like
- **Header**: `Packages` **[12]** and a green badge if anything was *delivered today*.
- **Groups** (if enabled): *Out for delivery*, *In transit*, *Delivered today*, *Other*.
- **Rows**: Carrier icon, carrier name, description/retailer, status text • location, and the most relevant time (delivered time → ETA → last update).

> You can tweak visuals by editing `MMM-MyPackageTracker.css`.

## Events (Notifications)
- `ONETRACKER_DELIVERED` — fired when a parcel transitions to **delivered** since the last fetch.
  ```js
  this.sendNotification("ONETRACKER_DELIVERED", {
    id, carrier, description, tracking_id, when
  });
  ```
  Use this to trigger sounds, alerts, or automations with other modules.

## Icons
Neutral, built‑in SVG placeholders for common carriers live in `public/icons/`. If you prefer branded logos, replace the SVGs with your own files using the same filenames, or extend the mapping in `node_helper.js` (`ICONS` dictionary).

## How it works
- **Auth**: `POST /auth/token` with `{\"email\",\"password\"}` → returns `session.token` & `session.expiration`.  
- **Data**: `GET /parcels` with header `x-api-token: <token>` → returns a list of parcel objects.  
  Parcel fields used include `carrier`, `description`, `tracking_status`, `tracking_location`, `tracking_time_estimated`, `tracking_time_delivered`, `time_updated`, `is_archived`, and `tracking_url`.
- **Decorations** (in the helper):
  - `_iconPath` derived from carrier name → `/MMM-MyPackageTracker/icons/*.svg` (served from `public/`).
  - `_deliveredToday` is true when `tracking_time_delivered` is between today’s start/end.
  - `_displayTime` chooses delivered time → ETA → last update and formats it for the UI.

> OneTracker API overview and endpoints: https://support.onetracker.app/apis/  
> MagicMirror module & public assets: https://docs.magicmirror.builders/module-development/introduction.html

## Troubleshooting
- **401 Unauthorized**: wrong email/password or expired token. The helper refreshes automatically on 401; verify your credentials if it persists.  
- **No parcels appear**: ensure you’ve added them in OneTracker (app/web) and that `showArchived`/`statusFilter` aren’t hiding them.  
- **Time zones**: times are formatted based on the Pi’s locale/timezone; verify your system time.
- **API limits**: be considerate with `refreshInterval` (default 5 min). Avoid very short intervals.

## FAQ
**Do I need OneTracker Premium?**  
No; Premium is needed for their **web interface** access, not for the API itself. This module only needs your account to authenticate against the public API. See their **Web Interface** page for what Premium covers.  
https://support.onetracker.app/web-interface/

**Can I show only certain statuses?**  
Yes; use `statusFilter`, e.g. `["in_transit","out_for_delivery"]`.

**Can I change colors and spacing?**  
Yes; edit `MMM-MyPackageTracker.css`.

## Changelog
- **v1.1.1**
  - Full README, grouped sections, icons, badges, delivered-today logic, and delivery event.

## License
[MIT](./LICENSE)

## Credits
- Thanks to the MagicMirror² community for the module architecture and docs.
- OneTracker for providing public API access.
