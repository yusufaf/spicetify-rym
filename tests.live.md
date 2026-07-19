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
