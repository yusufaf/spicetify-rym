# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0](https://github.com/yusufaf/spicetify-rym/compare/v1.0.2...v1.1.0) (2026-10-04)


### Features

* add version and GitHub issue link to settings modal footer ([e6bc9d4](https://github.com/yusufaf/spicetify-rym/commit/e6bc9d40bcdba363dbcad16d01b6101a957f4c32))
* optional companion API for link repair and captured RYM data ([ee8ce66](https://github.com/yusufaf/spicetify-rym/commit/ee8ce667b05ae002f23ee5b525d9c7f52c1dbe16))


### Bug Fixes

* anchor RYM card on stable Now Playing attributes ([#3](https://github.com/yusufaf/spicetify-rym/issues/3)) ([d5a2e03](https://github.com/yusufaf/spicetify-rym/commit/d5a2e033a5748454a33c2c16687524851a2fa44d))
* correct RYM slug generation for ligatures, slashes and dashes ([af98435](https://github.com/yusufaf/spicetify-rym/commit/af98435ee0c5763495a63ad50117dff0e2af77b7))
* do not cache empty companion API lookups ([de9aa5e](https://github.com/yusufaf/spicetify-rym/commit/de9aa5e4e8088a4c5f136b79569ec081c1836506))
* drop companion API responses that outlive their card ([1f93cff](https://github.com/yusufaf/spicetify-rym/commit/1f93cffb2c7970d715d0138595fb6417c58fb50b))
* improve URL slug generation for symbols ([ef1a03b](https://github.com/yusufaf/spicetify-rym/commit/ef1a03babca05c690b41385f89db4eef0039f43d))

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
