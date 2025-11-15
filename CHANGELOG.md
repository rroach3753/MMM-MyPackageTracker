
# Changelog

## v5.0.2 — 2025-11-13
- feat(ui): Row label order set to **Carrier — Title — Tracking Number**.
- feat(ui): Deterministic sort applied before rendering/groups:
  status priority (out_for_delivery, in_transit, available_for_pickup, failed_attempt, pending/info_received, exception, delivered), then courier, then title, then tracking number.

## v5.0.1 — 2025-11-13
- fix(list): unwrap `data.trackers` and carry list fallbacks (trackingNumber/courierCode) into each row if `/results` omits them.
- feat(status): map all Ship24 normalized milestones (pending, info_received, in_transit, out_for_delivery, available_for_pickup, failed_attempt, delivered, exception) and fallback to last event milestone when shipment-level is missing.
- chore(debug): print `trackers_count` and a `sample item` when `debug:true`.

## v5.0.0 — 2025-11-13
- Default Ship24 base set to `https://api.ship24.com/public/v1` with auto-discovery.
- Content-Type guard, empty-list banner, and 429 backoff.
