# Screenshots — RateYourMusic Integration

Read by the `spicetify-screenshots` skill. Keep selectors and rects accurate; they are what
makes a capture run mechanical instead of exploratory.

Extension file: `rym-integration.js`
Storage key: `rym-extension-config`

## Fixtures

`rym-extension-config` set to `null`, so the card renders with `DEFAULT_CONFIG` and makes no
companion API requests. The developer's config holds an API URL and token: never capture
the settings modal with it loaded.

The card only renders in the Now Playing panel for the current track, so a session has to
change playback. Load the track **paused** so nothing plays, and put the original back
afterwards:

```js
// record first: Spicetify.Player.data.context.uri, item.uri, item.uid, getProgress(), isPaused
await Spicetify.Platform.PlayerAPI.play(
  { uri: 'spotify:album:4LH4d3cOWNNsVw41Gqt2kv' },   // The Dark Side of the Moon
  { featureIdentifier: 'album' },
  { paused: true, skipTo: { index: 9 } },           // Eclipse
)
// restore: same call with the original context uri and
// { paused: true, skipTo: { uid, uri }, seekTo: <ms> }
```

Pick the track with care:

- No Canvas video (no "Switch to video" button in the panel), or the cover art is replaced
  by a video frame.
- A short title. Long titles scroll as a marquee and get captured mid-scroll.
- Not in the developer's Liked Songs: a liked track shows a green check next to the title.
  Check with `Spicetify.Platform.LibraryAPI.contains(uri)`.

## Verification

```
node shoot.mjs verify "#rym-container" --min 1 --within "[data-npv-root]" --text "View Album on RYM"
```

## Shot list

Client geometry assumes `viewport 1440 1000`: the Now Playing panel spans x 1052–1432 and
the card ends at y≈765.

| Output | Surface | Rect | README caption |
|---|---|---|---|
| `now-playing.png` | panel header, cover, title, card | `--rect 1052,64,380,717 --scale 2` | README hero |
| `preview.png` | title and card | `--rect 1052,393,380,380 --scale 2` | Marketplace card |
| `settings.png` | RYM Settings modal, opened from the profile menu (**RYM**) | `viewport 1440 1100`, then `--selector ".rym-modal" --scale 2` | README Screenshots table |

## Framing notes

- Stop at the bottom of the card. Below it are the Lyrics, About the artist and Next in
  queue sections, and the queue is personal.
- The main view is not part of any shot: album pages show green checks for liked tracks.
- The settings modal is capped at `80vh`. At 1000px its body scrolls and cuts off the last
  toggle; at 1100px the whole modal fits. Verify the footer before capturing:
  `verify ".rym-modal-footer" --within ".rym-modal" --text "Docs"`.

## Restore

```
node shoot.mjs reset-viewport ; node shoot.mjs restore backup.json ; node shoot.mjs reload
```
