
# Changelog

All notable changes to this project will be documented in this file.

## [1.1.8] - 2025-10-18
### Added
- **Friendly status labels** in the UI. `in_transit` → `In transit`, `pre_transit` → `Pre-transit`, etc.
- New config: `preferCarrierStatusText` (default `true`) to prefer the carrier-provided `tracking_status_text` when present.
- New config: `statusCase` (default `"title"`) to control case: `"title" | "sentence" | "original"`.

### Changed
- Subline now composes: **Status • Description • Location** (when available).

## [1.1.7] - 2025-10-18
### Fixed
- Ignore implausible/sentinel timestamps (e.g., `1001-01-01T00:00:00Z`) when choosing **Delivered / ETA / Updated** label and time.
- Prefer Delivered > ETA > Updated only when the timestamp is plausible; otherwise suppress time.

## [1.1.6] - 2025-10-14
### Fixed
- Parse OneTracker timestamps robustly (seconds vs milliseconds vs ISO) to avoid epoch/1970 dates.
- Show context-aware time labels: **Delivered**, **ETA**, or **Updated**.

## [1.1.5] - 2025-10-14
### Fixed
- Correct **USPS** Simple Icons slug to `usps` and added case-insensitive mapping for common names.
- Defensive icon loading in UI (`onerror` removes icon bubble) to prevent icon/CDN issues from blocking rendering.

## [1.1.4] - 2025-10-12
### Added
- **Configurable carrier icon size** via `config.iconSize` (default **12px**) for a tighter layout.
- Slight spacing tweaks to match smaller icons.

## [1.1.3] - 2025-10-12
### Added
- Initial public release: OneTracker integration, grouping (Out for delivery / In transit / Delivered today / Other), delivered‑today badge, and **Simple Icons** only for brand marks.
