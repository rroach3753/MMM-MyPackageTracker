
# Changelog

##v5.0.1 - 2025-11-13
**Fixes**
- Updated tracker information handling to properly display packages.
- Updated the Milestone Map for cleaner tracking and sorting.

## v5.0.0 — 2025-11-13
**Fixes & Hardening**
- Default Ship24 base switched to `https://api.ship24.com/public/v1` to match keys provisioned on that route family.
- Auto-discovery of Ship24 base (tries in order: config override → `/public/v1` → `/v1` → unversioned) with clear debug logging.
- Content-Type guard + clearer error banners when non-JSON/empty bodies are returned.
- List-mode empty-state banner with next steps.
- Safer pagination (`listPageSize`) and per-tracker results loop.
- Exponential backoff with jitter on HTTP 429.

**Behavior**
- `mode: "list"` pages `GET /trackers`, then fetches `GET /trackers/:trackerId/results`.
- `mode: "seed"` calls idempotent `POST /trackers/track` per entry and renders results.

**Config**
- New: `ship24BaseUrl` (optional). If omitted, auto-discovery selects the first working base.
- Debug banners are shown when `debug: true`.
