# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Single-file Spicetify extension. `rym-integration.js` is the entire product — it injects a RateYourMusic links card into Spotify's Now Playing right sidebar. No build step, no bundler, no framework, no runtime dependencies. Everything in `node_modules/` is commit tooling only.

## Commands

```bash
pnpm test              # node --check rym-integration.js — syntax gate only, no test suite
spicetify apply        # reload Spotify with local changes (after copying the file, see below)
```

Deploying a change to the live client requires copying the file into the Spicetify extensions dir first:

```bash
# Windows
copy rym-integration.js "%APPDATA%\spicetify\Extensions\rym-integration.js"
# macOS/Linux
cp rym-integration.js ~/.config/spicetify/Extensions/rym-integration.js
```

Symlinking the repo file there instead of copying makes edits live immediately and removes the copy step from the loop — this workspace is already set up that way.

Verification is manual/live, not automated. `tests.live.md` holds the smoke test and cases T1–T7; the `spicetify-live-test` skill drives the running client over CDP (console read, JS eval, hot reload, screenshot) so you can verify without a full `spicetify apply` cycle. All extension logs are prefixed `RYM Extension:`.

## Architecture

Read the `//#region` markers in `rym-integration.js` — they are the file's table of contents (Type Definitions, Constants, State, Utilities, UI, Event Handlers, Styles, Initialization, Bootstrap).

Control flow:

1. **Bootstrap** (bottom of file) polls in a 100ms loop until `Spicetify.Player.data`, `Spicetify.Platform`, and `Spicetify.Menu.Item` all exist. Spicetify globals are not ready at script eval time — any new top-level work must go inside this gate.
2. `injectStyles()` writes a `<style>` tag; **all CSS lives inline in that function** (~lines 704–1190), not in a separate stylesheet.
3. `registerMenuItem()` adds a profile-menu entry so settings stay reachable off album pages.
4. `initializeExtension()` subscribes to `Player` `songchange` → `handleAlbumChange()` → `injectRYMLinks()`.

Two things drive correctness and are the usual sources of bugs:

- **DOM coupling.** `SELECTOR_RIGHT_SIDEBAR_CONTENT` (`.main-nowPlayingView-nowPlayingGrid`) and `SELECTOR_RIGHT_SIDEBAR_ALT` are Spotify-internal selectors that break on client updates. `findContentContainer()` walks to the grid's `parentElement`. A `RYM Extension: Could not find content container` warning means Spotify changed its DOM. Because Spotify re-renders the sidebar asynchronously, insertion is racy — `ensureCorrectPosition()` runs on a 300ms `setTimeout` after every song change to re-seat the card if Spotify moved or dropped it.
- **Spicetify metadata paths.** `getCurrentAlbumInfo()` reads awkward, non-obvious locations: `albumType` from `data.context.metadata.albumType`, track count from `data.context.metadata.playlist_number_of_tracks` (yes, `playlist_`), album name from `data.item.album.name`. Don't assume a cleaner shape; verify against live `Spicetify.Player.data`.

`determineRYMReleaseType()` maps Spotify metadata to a RYM URL segment (`album`/`ep`/`single`/`comp`/`mixtape`) via a three-tier priority: album-title keyword patterns, then `albumType` + track count (4–6 tracks → EP), then default `album`. It is ~70–80% accurate by design; the "Search RYM" fallback link exists to cover misses. Widening heuristics is a listed contribution goal — but the fallback, not perfect detection, is the safety net.

`slugify()` converts artist/album names into RYM URL slugs. RYM's slug rules are idiosyncratic (e.g. `$` → `_`, diacritics stripped via NFD, trailing underscores dropped). Changes here silently produce 404s on RYM, so test against real releases with symbols/accents.

Config lives in `localStorage` under `rym-extension-config`, loaded via `loadConfig()` which spreads over `DEFAULT_CONFIG` — so adding a new setting to `DEFAULT_CONFIG` automatically back-fills for existing users. Never read the raw key directly.

Spicetify's `PopupModal` was broken for this use case, so `showCustomModal()` is a hand-rolled replacement. Don't "fix" it back to `PopupModal` without live verification.

## Release process

Automated by release-please (`.github/workflows/release-please.yml`, `release-please-config.json`), release-type `simple`. Version is stamped in three places and must stay in sync — do not hand-edit them:

- `package.json` `$.version`
- `.release-please-manifest.json`
- the `// VERSION:` line in `rym-integration.js`, fenced by `x-release-please-start-version` / `x-release-please-end-version` comments (keep those markers intact)

Commits must follow Conventional Commits — commitlint runs on `commit-msg` via husky, and `pnpm test` runs on `pre-commit`. A malformed subject line will block the commit.
