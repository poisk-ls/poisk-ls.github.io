# Changelog

## 2026-09-30 — Jekyll-free static migration
- Converted the application to HTML5, CSS3, Vanilla JavaScript and JSON.
- Removed Jekyll/Liquid build dependencies and Jekyll-only directories/files.
- Moved generated content pages into `/pages/` and kept `/index.html` as the entry point.
- Converted navigation, site settings, themes, subjects, posts and search index to JSON.
- Compiled the original Sass styling into browser-ready `/assets/css/style.css`.
- Added Font Awesome 6 and SweetAlert2 through CDN dependencies.
- Replaced the Liquid search-index generator with static JSON plus a runtime search loader.
- Converted manifest, offline page, 404 page and service worker to static files.
- Corrected navigation and asset paths for the new static layout.


## 2026-09-29 — Mobile UI debugging pass

- Fixed the mobile POISK-LS branding visibility path for dark-theme text and ensured theme-aware text rendering remains visible after live theme switches.
- Reworked mobile floating-control spacing so Back-to-Top is positioned from the actual Tawk launcher size and safe-area spacing instead of an unrelated fixed offset.
- Added runtime detection of the Tawk launcher container and applied the mobile positioning slot without modifying the Tawk service integration.
- Calculated the mobile sidebar drawer/backdrop start position from the rendered header height to prevent header/drawer overlap at different viewport sizes.
- Locked both document and page scrolling while the mobile sidebar drawer is open.
- Hardened image-viewer activation for touch input and lazy/unloaded images while preserving existing linked-image viewer behavior.

## 2026-09-29 — Mobile UI fixes

- Fixed mobile POISK-LS branding visibility across light and dark themes without forcing theme colors with `!important`.
- Added shared mobile safe-area/stacking tokens for the sidebar header, drawer, backdrop, and floating controls.
- Fixed mobile sidebar/header overlap by keeping the header above the drawer and placing the drawer/backdrop below the header.
- Fixed mobile drawer stacking so the backdrop no longer intercepts touches intended for the open sidebar.
- Added safe mobile spacing between Back-to-Top and the Tawk.to launcher while preserving the Tawk integration.
- Added a single delegated image viewer for content images with fullscreen viewing, backdrop close, Escape handling, scroll locking, focus restoration, double-tap zoom, pinch/wheel zoom, and drag/pan support.
- Preserved existing navigation thumbnails, sidebar branding images, and navigation imagery from image-viewer interception.
# Changelog

## 2026-09-29
- Removed generated Jekyll `_site` output from source and added Jekyll build artifacts to `.gitignore`.
- Consolidated Tawk.to into one shared integration.
- Removed obsolete legacy layout/config files after repository-wide reference checks.
- Hardened saved pagination state validation and bounds handling.
- Removed the global font `!important` override and obsolete `.nav-list` rules.
- Moved the generated search database to a build-generated JSON index with lazy loading.
- Reworked post JavaScript into focused modules without changing the feature set.
- Added image loading dimensions/lazy decoding and converted pagination thumbnails to `<img>`.
- Expanded theme design tokens, accessibility semantics, canvas performance modes, PWA support, and SEO/social metadata.
- Consolidated the sidebar into `_includes/sidebar.html` with `_data/navigation.yml` as the single navigation source.
- Removed the obsolete `navigation.html` include and duplicate right-sidebar Search/Theme controls.
- Added persistent active navigation state, nested-page detection, keyboard-accessible expand/collapse controls, and saved expanded groups.
- Added a responsive mobile navigation drawer with backdrop, Escape handling, focus management, scroll locking, and touch-safe controls.
- Added compact `SYSTEM NAVIGATION` branding and separated existing Search/Theme utilities from primary navigation.
