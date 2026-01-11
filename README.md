# RateYourMusic Spicetify Extension

Quick access to RateYourMusic album pages directly from Spotify's interface.

## Features

- **Direct Album Links**: One-click access to RYM album pages
- **Smart Release Type Detection**: Automatically detects albums, EPs, singles, mixtapes, and compilations
- **Fallback Search**: If the direct link doesn't work, quickly search RYM for the release
- **Native Integration**: Blends seamlessly with Spotify's UI in the right sidebar
- **Theme-Agnostic**: Works with any Spicetify theme using CSS variables
- **Minimal & Unobtrusive**: Clean design that doesn't clutter your interface

## How It Works

The extension intelligently determines the RYM release type using:

1. **Album name pattern detection** (e.g., "mixtape", "EP", "compilation" in title)
2. **Spotify metadata analysis** (album_type + track count)
3. **Smart heuristics** (e.g., 4-6 tracks → likely EP)

This generates accurate RYM URLs like:
- `/release/album/artist/album-name/` for full albums
- `/release/ep/artist/ep-name/` for EPs
- `/release/mixtape/artist/mixtape-name/` for mixtapes
- `/release/comp/artist/compilation-name/` for compilations
- `/release/single/artist/single-name/` for singles

If the direct link doesn't match (edge cases happen!), use the fallback "Search RYM" link.

## Installation

### Prerequisites

- [Spicetify](https://spicetify.app/) installed and working

### Manual Installation

1. Download or clone this repository:
   ```bash
   git clone https://github.com/yusufaf/spicetify-rym.git
   ```

2. Copy the extension file to your Spicetify extensions folder:

   **Windows:**
   ```bash
   copy spicetify-rym\rym-integration "%APPDATA%\spicetify\Extensions\rym-integration.js"
   ```

   **macOS/Linux:**
   ```bash
   cp spicetify-rym/rym-integration ~/.config/spicetify/Extensions/rym-integration.js
   ```

3. Enable the extension:
   ```bash
   spicetify config extensions rym-integration.js
   spicetify apply
   ```

4. Reload Spotify - the RYM section will appear in the right sidebar when playing music

## Usage

Once installed, the extension automatically displays RYM links in the right sidebar (where "About the artist", "Credits", etc. appear).

**Two links are provided:**
- **"View on RateYourMusic"** - Direct link to the album page (uses smart detection)
- **"Wrong page? Search RYM"** - Fallback search if the direct link 404s

Both links open in a new tab.

## Troubleshooting

**Extension not appearing:**
- Verify the file is copied to the correct Extensions directory
- Check that `rym-integration.js` is listed in `spicetify config`
- Try `spicetify apply` to reload

**Links go to wrong RYM page:**
- RYM's release type classifications don't always match Spotify's
- Use the "Search RYM" fallback link to manually find the correct page
- The detection is ~70-80% accurate - edge cases are expected

**Console errors:**
- Open DevTools (Ctrl+Shift+J) and check for errors
- Look for messages starting with "RYM Extension:"
- Ensure Spicetify is up to date

## Development

### File Structure

```
spicetify-rym/
├── rym-integration       # Main extension file (no .js extension in repo)
├── README.md            # Documentation
├── LICENSE              # MIT License
└── .gitignore          # Git ignore rules
```

### Key Functions

- `determineRYMReleaseType()` - Detects release type from Spotify metadata
- `getCurrentAlbumInfo()` - Extracts album data from Spicetify Player API
- `injectRYMSearchLink()` - Creates and injects UI into Spotify sidebar
- `slugify()` - Converts artist/album names to RYM URL format

### Testing

Test with diverse release types:
- Full albums (7+ tracks)
- EPs (4-6 tracks)
- Singles (1-3 tracks)
- Mixtapes (title contains "mixtape")
- Compilations (title contains "compilation" or "greatest hits")

Check browser console for: `RYM Extension: Detected release type: [type] for [album]`

## Why No Auto-Fetching?

Previous versions attempted to scrape RYM ratings/genres, but this proved unreliable due to:
- Cloudflare bot protection blocking automated requests
- CORS restrictions preventing client-side fetching
- Proxy solutions (Vercel, Cloudflare Workers) still getting blocked

The current "direct link" approach is more maintainable and respects RYM's infrastructure.

## Contributing

Contributions welcome! Areas for improvement:
- Better release type detection heuristics
- Support for edge cases (DJ mixes, bootlegs, video releases)
- Caching of correct release types after user confirmation
- Settings panel for manual overrides

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Disclaimer

This extension is not affiliated with RateYourMusic or Spotify. All trademarks belong to their respective owners.

## Acknowledgments

- Built for [Spicetify](https://spicetify.app/)
- Data from [RateYourMusic](https://rateyourmusic.com/)
- Inspired by the need to quickly check RYM ratings while listening on Spotify
