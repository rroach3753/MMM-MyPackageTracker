
# Changelog

## v5.0.1 — 2025-11-13
- fix(list): correctly unwrap `data.trackers` from list response and carry list fallbacks (trackingNumber/courierCode) into each row if `/results` omits them.
- feat(status): map all Ship24 normalized status milestones (pending, info_received, in_transit, out_for_delivery, available_for_pickup, failed_attempt, delivered, exception).
- chore(debug): print `trackers_count` and a `sample item` when `debug:true` to help triage.

## v5.0.0 — 2025-11-13
- Default Ship24 base switched to `https://api.ship24.com/public/v1`.
- Auto-discovery of base (config override → /public/v1 → /v1 → unversioned).
- Content-Type guard + clearer error banners, empty-list banner, 429 backoff.
