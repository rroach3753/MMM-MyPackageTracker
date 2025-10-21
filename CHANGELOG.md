# Changelog

## 2.0.3 (2025-10-20)

**Fixes**
- **Local-first icons for UPS & USPS**: load from `public/icons/brand-*.svg` to avoid any CDN/network issues, with CDN used for all other carriers.
- Keep on-error fallback to `public/icons/fallback-package.svg`.

**Enhancements**
- Retains `iconColor` for tinting CDN icons while local SVGs follow CSS `currentColor`.

Files changed: `MMM-MyPackageTracker.js`, `MMM-MyPackageTracker.css`, `public/icons/brand-ups.svg`, `public/icons/brand-usps.svg`, `public/icons/fallback-package.svg`, `package.json`.
