# Changelog

## 2.0.0 (2025-10-20)

**Breaking / Level‑set release**
- Version reset to **2.0.0** with a clean, CommonJS-only runtime and null-safe rendering across helper and UI.
- Normalizes any missing/empty/"unknown" values to `null`; UI shows a neutral dash (—) or hides optional elements.
- Carrier icon mapping for common names (Amazon Logistics, Canada Post, etc.); icons are skipped gracefully if unmapped.
- Optional `debug` logging flag in both helper and front-end.
- Safer token refresh on 401 and guarded fetch concurrency.

**Migration notes**
- No config changes required from 1.x. Existing options remain; defaults documented in README.
