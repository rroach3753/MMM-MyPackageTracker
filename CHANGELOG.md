# Changelog
## 3.5.0 — 2025-11-02
**Maintenance**
- Align version across all files (node_helper.js, MMM-MyPackageTracker.js, CSS, package.json, docs).
- No breaking changes; inherits all features/fixes up to 3.0.2.

## 4.0.0 — 2025-11-04
- Rebuilt module around **Ship24** from scratch.
- Two backends: **seed** (POST /v1/trackers/track) and **list** (GET /v1/trackers + results).
- Added optional **webhook** receiver with shared-secret check.
- Implemented **429** exponential backoff + jitter.
- Clean UI with CDN icons + fallback.
