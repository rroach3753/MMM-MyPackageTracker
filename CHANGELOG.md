# Changelog
## 3.5.0 — 2025-11-02
**Maintenance**
- Align version across all files (node_helper.js, MMM-MyPackageTracker.js, CSS, package.json, docs).
- No breaking changes; inherits all features/fixes up to 3.0.2.

## 3.0.1 — 2025-11-01
**Added**
- `listAllTrackers` option to display existing Ship24 trackers when `seedTrackers` is empty.
- `listPageSize` to control page size when listing trackers.

**Behavior**
- If `seedTrackers` has entries: keep calling `POST /v1/trackers/track` (idempotent create + results).
- Else if `listAllTrackers` is true: call `GET /v1/trackers` (paged) and `GET /v1/trackers/:trackerId/results`.

**Unchanged**
- Ship24 backend and status mapping (statusMilestone).
- Icons via Simple Icons CDN for all carriers with fallback SVG.

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
