# Changelog

## 2.0.2 (2025-10-20)

**Fixes**
- Ensure **USPS** and **UPS** always render by expanding the alias map.
- Keep CDN icon requests stable via Simple Icons color CDN; fall back to local SVG if a brand icon fails.

**Enhancements**
- Optional `config.iconColor` (e.g., `"ffffff"`) to tint icons from the CDN while keeping CSS brightness.

Files changed: `MMM-MyPackageTracker.js`, `MMM-MyPackageTracker.css`, `public/icons/fallback-package.svg`, `package.json`.

## What’s new in v2.0.1

### 🖼️ Icon reliability (no more blank spots)
- **Carrier slug mapping:** Normalizes carrier names and maps common aliases to Simple Icons slugs (UPS, USPS, FedEx, DHL, Amazon, Canada Post, Royal Mail, DPD, Evri/Hermes, GLS, PostNL, etc.).
- **Auto‑fallback:** If a CDN icon fails (404/CORS/network), the module now **falls back** to a local `fallback-package.svg` so a marker is always shown.

### ✨ Brighter, clearer icons
- Updated CSS applies **brightness/contrast** to make icons pop on dark glass.
- Fallback SVG uses `currentColor` so you can tint it to your theme.

### 🔎 Optional diagnostics
- With `debug: true`, the UI will log any **unmapped** carrier names so you can extend the map quickly.

---

## Changed files
- `MMM-MyPackageTracker.js` — slug map, URL builder, `onerror` fallback
- `MMM-MyPackageTracker.css` — brightness/contrast filters for icons
- `public/icons/fallback-package.svg` — local fallback icon

---

## How to update

```bash
cd ~/MagicMirror/modules/MMM-MyPackageTracker
git pull
pm2 restart mm    # or restart MagicMirror manually

---

## 2.0.0 (2025-10-20)

**Breaking / Level‑set release**
- Version reset to **2.0.0** with a clean, CommonJS-only runtime and null-safe rendering across helper and UI.
- Normalizes any missing/empty/"unknown" values to `null`; UI shows a neutral dash (—) or hides optional elements.
- Carrier icon mapping for common names (Amazon Logistics, Canada Post, etc.); icons are skipped gracefully if unmapped.
- Optional `debug` logging flag in both helper and front-end.
- Safer token refresh on 401 and guarded fetch concurrency.

**Migration notes**
- No config changes required from 1.x. Existing options remain; defaults documented in README.
