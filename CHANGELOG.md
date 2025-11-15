
# Changelog

## v5.0.3 — 2025-11-13
- fix(results): support all observed results shapes: `{tracker, shipment, events}`, `{data:{tracker, shipment, events}}`, and `{data:{trackings:[{...}]}}`.
- fix(status): if `shipment.statusMilestone` is empty, pick milestone from the **latest event by occurrenceDatetime**; if still empty and no events, set `pending`; finally, fall back to `shipment.statusCategory` when it matches a known milestone.
- chore(debug): log chosen milestone vs shipment/last-event when `debug:true` (first 2 items).

## v5.0.2 — 2025-11-13
- feat(ui): Carrier — Title — Tracking Number; deterministic sort: status → courier → title → tracking.

## v5.0.1 — 2025-11-13
- fix(list): unwrap `data.trackers`; carry list fallbacks (trackingNumber/courierCode) into row if `/results` omits them.
- feat(status): map Ship24 normalized milestones and fallback to last event milestone when shipment-level is missing.
