# Changelog

## 4.0.0 — 2025-11-04
- Rebuilt module around **Ship24** from scratch.
- Two backends: **seed** (POST /v1/trackers/track) and **list** (GET /v1/trackers + results).
- Added optional **webhook** receiver with shared-secret check.
- Implemented **429** exponential backoff + jitter.
- Clean UI with CDN icons + fallback.
