# Live Tests — RYM Integration

Extension file: `rym-integration.js`  
Use skill `spicetify-live-test` for CDP mechanics (reload, eval, screenshot, console).

## Storage keys (`Spicetify.LocalStorage.get(key)` or `localStorage.getItem(key)`)

| Key | Contents |
|-----|----------|
| `rym-extension-config` | JSON config object (API key, display prefs, etc.) |

## Smoke test (run after every edit)

1. `node --check rym-integration.js` — syntax gate.
2. CDP reload xpui.
3. Console (no filter needed — prefix is `RYM Extension:`): expect `RYM Extension: Starting...` then `RYM Extension: Initialized successfully`.
4. Navigate Spotify to an album page.
5. Screenshot: RYM panel should be injected on the album page.

```js
// Eval to verify config readable
JSON.parse(Spicetify.LocalStorage.get('rym-extension-config') || 'null')
// → config object or null (first run = use defaults)
```

## T1: Config defaults survive missing key

- `Spicetify.LocalStorage.remove('rym-extension-config')` then reload.
- Assert: `RYM Extension: Initialized successfully` in console; no errors.
- Eval: `Spicetify.LocalStorage.get('rym-extension-config')` → non-null (defaults written back).

## T2: RYM panel injects on album page

- Navigate to an album page.
- Console: expect `RYM Extension: Detected release type:` and `RYM Extension: Album changed to` logs.
- Screenshot: verify RYM section visible on the page.
- Eval: `document.querySelector('[class*="rym"]') !== null` (or whatever selector the extension uses — check the DOM).

## T3: Content container found

- After navigating to an album page, confirm no `RYM Extension: Could not find content container` warning in console.
- If that warning appears, the DOM selector is broken — the element the extension targets has changed.
- Eval: the card's `previousElementSibling` is the title row (contains the track's `/artist/` link) and its `nextElementSibling` holds the sections. Check with an album that has a Canvas video and one that doesn't — without Canvas, the cover art is an `/album/` link.

## T3b: Card survives panel remounts

- Switch the right sidebar to Queue (panel unmounts, card goes with it), then back to Now Playing.
- Eval: `document.getElementById('rym-container')` is non-null and in the same position.
- Cold start (quit and relaunch Spotify): card appears without an album change.

## T4: Copy link feature

- On album page with RYM panel visible, click the "Copy RYM link" button (or equivalent).
- Console: no `RYM Extension: Failed to copy link` error.
- Assert: clipboard contains a rateyourmusic.com URL (eval `navigator.clipboard.readText()` if permission allows).

## T5: Album change event fires

- Navigate from one album to another.
- Console: `RYM Extension: Album changed to <artist> - <album>` should appear for the new album.
- Screenshot: RYM panel updates to show info for the new album.

## T6: Styles caveat

- All CSS is inline in `injectStyles()` in `rym-integration.js` (template literal written into a `<style>` tag). There is no separate stylesheet in this repo, and none is loaded at runtime.
- Styles ARE hot-reloadable via CDP, since `injectStyles()` re-runs on reload with the rest of the file.
- Ignore `%APPDATA%\spicetify\Extensions\rym-integration\styles.css` if you have it — that folder is a stale v0.1.0 install whose classes (e.g. `.rym-extension-container`) no longer exist in the code. The enabled extension is the top-level `rym-integration.js`, not that folder. Editing it changes nothing.

## T7: Hot-reload sanity

- Add `console.log('RYM Extension: HOT-RELOAD-MARKER')` near the Initialized log (line ~1207).
- CDP reload; console filter `HOT-RELOAD-MARKER`: must appear.
- Revert.

## T8: Companion API stays off by default

This is the one that must never regress. With no API configured the extension makes zero network requests, and that has to be observable rather than assumed.

- Eval: `JSON.parse(Spicetify.LocalStorage.get('rym-extension-config')).apiBaseUrl` → `""`.
- Open DevTools Network, filter `execute-api`, navigate between three albums.
- Assert: no requests. Not "no failed requests" — none at all.
- Eval: `document.querySelector('.rym-album-link').href.includes('sid=')` → `false`. The correlation marker is only attached when there is somewhere for a capture to go.
- Assert: no `.rym-data` block in the card.

## T9: Link upgrade from a stored capture

Needs the API deployed and a token set in settings, plus one album captured via the userscript. Björk's *Homogenic* is the useful case: the slug generator produces `/homogenic/`, RYM serves it at `/homogenic-17/`, and no amount of slug logic can derive that suffix.

- Set API base URL and token in RYM settings.
- Play an album that has a capture stored.
- Assert: `.rym-album-link` href becomes the captured URL, and carries `?src=spicetify&sid=<22-char id>`.
- Assert: a `✓` appears after the link text (`.rym-link-confirmed`).
- Assert: the copy button still copies the **clean** URL — eval `document.querySelector('.rym-copy-btn').dataset.url` → no `sid=`.
- Play an album with no capture: card must look exactly as it did in T8, no error in console.

## T10: Slow or dead API changes nothing

- Set API base URL to `https://127.0.0.1:9` (nothing listening) and any token.
- Navigate between albums.
- Assert: card renders immediately, with the generated URL, no visible delay.
- Console: `RYM Extension: album lookup unavailable:` warnings only. No uncaught errors, no `Failed to fetch` red.
- Repeat with a URL that hangs, to exercise the 4s `API_TIMEOUT_MS` abort.

## T11: Skipping tracks during a lookup

Guards the race between an in-flight request and a fast skip.

- With the API configured and a deliberately slow endpoint, start an album and immediately skip to a different album.
- Assert: the card shows the *second* album, and its href is never overwritten by the first album's stored link.
- Eval during the race: `document.getElementById('rym-container').dataset.albumUri` should always equal `Spicetify.Player.data.item.album.uri`.
