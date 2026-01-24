# Contributing

Contributions are welcome! This is a simple single-file Spicetify extension, so getting started is easy.

## Getting Started

1. Fork the repository
2. Clone your fork
3. Copy `rym-integration.js` to your Spicetify Extensions folder:
   - **Windows:** `%APPDATA%\spicetify\Extensions\`
   - **macOS/Linux:** `~/.config/spicetify/Extensions/`
4. Run `spicetify apply` to load changes

## Development

No build step required - just edit the JavaScript file directly.

**Testing changes:**
```bash
spicetify apply
```
Spotify will restart with your changes.

**Debug output:**
- Open DevTools: `Ctrl+Shift+J` (Windows) / `Cmd+Option+J` (macOS)
- Look for `RYM Extension:` prefixed console messages

## Code Style

- Use JSDoc comments for functions
- Keep code organized in `#region` blocks
- Use descriptive variable names
- Test with both light and dark Spicetify themes

## Pull Requests

1. Open an issue first to discuss proposed changes
2. Fork and create a feature branch
3. Make your changes
4. Update version in header comment if applicable
5. Submit PR with clear description of changes

## Areas for Improvement

- Better release type detection heuristics
- Support for edge cases (DJ mixes, bootlegs, video releases)
- Caching correct release types after user confirmation
- Context menu integration (right-click on albums/artists)
- Keyboard shortcuts

## Questions?

Open an issue for any questions or suggestions.
