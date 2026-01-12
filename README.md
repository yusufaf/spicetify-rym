# RateYourMusic Spicetify Extension

Quick access to RateYourMusic album pages directly from Spotify.

## Features

- **Direct Album Links**: One-click access to RYM album pages
- **Smart Release Type Detection**: Automatically detects albums, EPs, singles, mixtapes, and compilations
- **Fallback Search**: Quick search option if the direct link doesn't work
- **Native Integration**: Blends seamlessly with Spotify's right sidebar UI
- **Theme-Agnostic**: Works with any Spicetify theme
- **Lightweight**: Minimal code, no external dependencies

## How It Works

The extension intelligently determines the RYM release type using:

1. **Album name pattern detection** (e.g., "mixtape", "EP", "compilation" in title)
2. **Spotify metadata analysis** (`album_type` + track count)
3. **Smart heuristics** (e.g., 4-6 tracks → likely EP)

This generates accurate RYM URLs like:
- `/release/album/artist/album-name/` for full albums
- `/release/ep/artist/ep-name/` for EPs
- `/release/mixtape/artist/mixtape-name/` for mixtapes
- `/release/comp/artist/compilation-name/` for compilations
- `/release/single/artist/single-name/` for singles

If the direct link doesn't match (edge cases happen), use the fallback "Search RYM" link.

## Installation

### Prerequisites

[Spicetify](https://spicetify.app/) must be installed and working.

### Steps

1. Clone or download this repository:
   ```bash
   git clone https://github.com/yusufaf/spicetify-rym.git
   ```

2. Copy the extension file to your Spicetify extensions folder:

   **Windows:**
   ```bash
   copy spicetify-rym\rym-integration.js "%APPDATA%\spicetify\Extensions\rym-integration.js"
   ```

   **macOS/Linux:**
   ```bash
   cp spicetify-rym/rym-integration.js ~/.config/spicetify/Extensions/rym-integration.js
   ```

3. Enable the extension:
   ```bash
   spicetify config extensions rym-integration.js
   spicetify apply
   ```

4. Reload Spotify - the RYM section will appear in the right sidebar

## Usage

Once installed, the extension automatically displays RYM links in the right sidebar (where "About the artist", "Credits", etc. appear).

**Two links are provided:**
- **"View on RateYourMusic"** - Direct link using smart detection
- **"Wrong page? Search RYM"** - Fallback search option

Both links open in new tabs.

## Troubleshooting

**Extension not appearing:**
- Verify file is in the correct Extensions directory
- Check `spicetify config` shows `rym-integration.js` in extensions
- Run `spicetify apply` again

**Link goes to wrong page:**
- RYM classifications don't always match Spotify's
- Use "Search RYM" fallback link
- Detection is ~70-80% accurate - edge cases expected

**Console errors:**
- Open DevTools (Ctrl+Shift+J / Cmd+Option+J)
- Look for "RYM Extension:" messages
- Ensure Spicetify is updated

## Why No Auto-Fetching?

Earlier versions attempted to scrape RYM ratings/genres, but this proved unreliable:
- Cloudflare bot protection blocks automated requests
- CORS restrictions prevent client-side fetching
- Proxy solutions still get blocked

The current "direct link" approach is more maintainable and respects RYM's infrastructure.

## Contributing

Contributions welcome! Areas for improvement:
- Better release type detection heuristics
- Support for edge cases (DJ mixes, bootlegs, video releases)
- Caching correct release types after user confirmation
- Settings panel for manual overrides

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- Built for [Spicetify](https://spicetify.app/)
- Links to [RateYourMusic](https://rateyourmusic.com/)
- Inspired by the need to quickly check RYM while listening on Spotify
