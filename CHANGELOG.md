# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0](https://github.com/yusufaf/spicetify-rym/compare/v1.0.2...v1.1.0) (2026-06-07)


### Features

* add profile menu entry and swap gear emoji for SVG (v1.0.2) ([cef46dc](https://github.com/yusufaf/spicetify-rym/commit/cef46dc65ae8a115ed57daadb54b0c0aebecafb0))


### Bug Fixes

* replace broken Spicetify.PopupModal with custom modal implementation ([ea7d5b3](https://github.com/yusufaf/spicetify-rym/commit/ea7d5b3f45cbd86475d64ad283988a316cfb7bd5))

## [1.0.2] - 2026-04-25

### Added
- "RYM" entry in the Spotify profile menu so settings are reachable from anywhere, not just album pages where the card renders

### Changed
- Settings gear now uses an inline SVG (Bootstrap Icons gear-fill) instead of the ⚙️ emoji for consistent rendering across operating systems

## [1.0.1] - 2026-04-18

### Fixed
- Replace broken Spicetify.PopupModal with custom modal implementation (React Router context errors in current Spotify versions)
- Fix settings button click not registering due to event propagation issues

## [1.0.0] - 2025-01-24

### Added
- Direct album links to RateYourMusic
- Artist page links
- Fallback search link when direct URL doesn't match
- Smart release type detection (album, EP, single, mixtape, compilation)
- Configurable card position (top of panel, below album info)
- Toggle visibility for each link type
- Compact mode for reduced UI footprint
- URL tooltips on hover
- Copy to clipboard button for album URLs
- Settings modal accessible via gear icon

[1.0.2]: https://github.com/yusufaf/spicetify-rym/releases/tag/v1.0.2
[1.0.1]: https://github.com/yusufaf/spicetify-rym/releases/tag/v1.0.1
[1.0.0]: https://github.com/yusufaf/spicetify-rym/releases/tag/v1.0.0
