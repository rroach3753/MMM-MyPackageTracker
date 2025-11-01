# Changelog

## 3.0.0 — 2025-11-01
**Backend**
- Migrate data source from OneTracker to **Ship24 Tracking API** (Bearer token).
- Idempotent `POST /v1/trackers/track` per tracking number (create+fetch in one call).

**UI & Icons**
- Use **Simple Icons CDN** for *all* carriers.
- Keep a single generic fallback SVG if a logo fails.
- **Removed**: local‑first brand icons for UPS/USPS.

**Config**
- New `ship24ApiKey` (required), `seedTrackers`, and optional webhook settings.
- Existing display options (grouping, header count, icon size, etc.) remain.
