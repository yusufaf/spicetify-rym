// NAME: RateYourMusic Integration
// AUTHOR: yusufaf
// VERSION: 0.1.0
// DESCRIPTION: Display RateYourMusic links for your Spotify albums

//#region Type Definitions

/**
 * @typedef {Object} AlbumInfo
 * @property {string} artist - Primary artist name
 * @property {string} album - Album name
 * @property {string} albumUri - Spotify album URI
 * @property {number|null} releaseDate - Release year
 * @property {string|null} albumType - Spotify album type: "album", "single", "compilation"
 * @property {number|null} totalTracks - Total track count
 */

//#endregion

//#region Constants

/** RYM base URL */
const RYM_BASE_URL = 'https://rateyourmusic.com';

/** Container element ID */
const CONTAINER_ID = 'rym-container';

/** Selector for right sidebar content area */
const SELECTOR_RIGHT_SIDEBAR_CONTENT = '.main-nowPlayingView-nowPlayingGrid';

/** Alternative selector for right sidebar */
const SELECTOR_RIGHT_SIDEBAR_ALT = '[data-testid="NPV_Panel_OpenDiv"]';

//#endregion

//#region State

/** @type {string|null} Currently displayed album URI */
let currentAlbumUri = null;

//#endregion

//#region Utilities

/**
 * Slugifies string for RYM URLs (lowercase, hyphens, remove special chars)
 * @param {string} str - Input string
 * @returns {string} Slugified string
 */
function slugify(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Determines RYM release type from Spotify metadata
 * @param {AlbumInfo} albumInfo - Album information from Spotify
 * @returns {string} RYM release type: "album", "ep", "single", "comp", "mixtape"
 */
function determineRYMReleaseType(albumInfo) {
  const { album, albumType, totalTracks } = albumInfo;
  const albumLower = (album || '').toLowerCase();

  // Priority 1: Album name patterns (highest confidence)
  if (albumLower.includes('mixtape') || albumLower.includes('mix tape')) {
    return 'mixtape';
  }
  if (albumLower.match(/\bep\b|e\.p\./i)) {
    return 'ep';
  }
  if (albumLower.includes('compilation') || albumLower.includes('greatest hits')) {
    return 'comp';
  }

  // Priority 2: Spotify album_type + track count
  if (albumType === 'compilation') {
    return 'comp';
  }

  if (albumType === 'single') {
    if (totalTracks && totalTracks >= 4 && totalTracks <= 6) {
      return 'ep';
    }
    return 'single';
  }

  if (albumType === 'album') {
    if (totalTracks && totalTracks >= 4 && totalTracks <= 6) {
      return 'ep';
    }
    return 'album';
  }

  // Priority 3: Default fallback
  return 'album';
}

/**
 * Extracts current album info from Spicetify player
 * @returns {AlbumInfo|null} Album information or null
 */
function getCurrentAlbumInfo() {
  const data = Spicetify.Player.data;
  if (!data || !data.item || !data.context) {
    return null;
  }

  // Use correct property paths from actual Spicetify data structure
  const albumType = data.context.metadata?.albumType?.toLowerCase() || null;
  const totalTracks = parseInt(data.context.metadata?.playlist_number_of_tracks) || null;
  const releaseDate = data.context.metadata?.releaseDate || data.item.album?.date?.year || null;

  return {
    album: data.item.album?.name || '',
    albumType: albumType,
    albumUri: data.item.album?.uri || '',
    artist: data.item.artists?.[0]?.name || '',
    releaseDate: releaseDate,
    totalTracks: totalTracks
  };
}

//#endregion

//#region UI

/**
 * Creates main RYM container element
 * @returns {HTMLDivElement} Container element
 */
function createRYMContainer() {
  const container = document.createElement('div');
  container.id = CONTAINER_ID;
  return container;
}

/**
 * Injects RYM links into Spotify interface
 * @param {string} artist - Artist name
 * @param {string} album - Album name
 * @returns {void}
 */
function injectRYMLinks(artist, album) {
  let targetElement = document.querySelector(SELECTOR_RIGHT_SIDEBAR_CONTENT);

  if (!targetElement) {
    targetElement = document.querySelector(SELECTOR_RIGHT_SIDEBAR_ALT);
  }

  if (!targetElement) {
    console.warn('RYM Extension: Could not find target element for UI injection');
    return;
  }

  const existing = document.getElementById(CONTAINER_ID);
  if (existing) {
    existing.remove();
  }

  const albumInfo = getCurrentAlbumInfo();
  const releaseType = albumInfo ? determineRYMReleaseType(albumInfo) : 'album';

  const artistSlug = slugify(artist);
  const albumSlug = slugify(album);
  const albumUrl = `${RYM_BASE_URL}/release/${releaseType}/${artistSlug}/${albumSlug}/`;
  const artistUrl = `${RYM_BASE_URL}/artist/${artistSlug}`;
  const searchUrl = `${RYM_BASE_URL}/search?searchterm=${encodeURIComponent(artist + ' ' + album)}`;

  const container = createRYMContainer();
  container.className = 'main-nowPlayingView-section main-nowPlayingView-rym';
  container.innerHTML = `
    <h2 class="rym-section-title">RYM</h2>
    <div class="rym-content">
      <div class="rym-link-item">
        <a href="${albumUrl}" target="_blank" rel="noopener noreferrer" class="rym-album-link">
          <span class="rym-link-text">View Album on RYM</span>
        </a>
        <button class="rym-copy-btn" data-url="${albumUrl}" title="Copy link" type="button">
          <span class="rym-copy-icon">📋</span>
        </button>
      </div>
      <div class="rym-link-item">
        <a href="${artistUrl}" target="_blank" rel="noopener noreferrer" class="rym-artist-link">
          <span class="rym-link-text">View Artist on RYM</span>
        </a>
      </div>
      <div class="rym-link-item">
        <a href="${searchUrl}" target="_blank" rel="noopener noreferrer" class="rym-search-link">
          <span class="rym-link-text">Wrong page? Search RYM</span>
        </a>
      </div>
    </div>
  `;

  // Attach copy button functionality
  const copyBtn = container.querySelector('.rym-copy-btn');
  const copyIcon = container.querySelector('.rym-copy-icon');
  if (copyBtn && copyIcon) {
    copyBtn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      const url = this.getAttribute('data-url');

      navigator.clipboard.writeText(url).then(() => {
        // Change icon to checkmark and add visual feedback
        copyIcon.textContent = '✓';
        this.classList.add('copied');
        setTimeout(() => {
          copyIcon.textContent = '📋';
          this.classList.remove('copied');
        }, 1500);
      }).catch(err => {
        console.error('RYM Extension: Failed to copy link', err);
      });
    });
  }

  console.log('RYM Extension: Detected release type:', releaseType, 'for', album);
  targetElement.appendChild(container);
}

/**
 * Removes RYM UI from Spotify interface
 * @returns {void}
 */
function removeRYMUI() {
  const existing = document.getElementById(CONTAINER_ID);
  if (existing) {
    existing.remove();
  }
}

//#endregion

//#region Event Handlers

/**
 * Handles album change events from Spotify
 * @returns {void}
 */
function handleAlbumChange() {
  const albumInfo = getCurrentAlbumInfo();

  if (!albumInfo || !albumInfo.artist || !albumInfo.album) {
    removeRYMUI();
    return;
  }

  if (albumInfo.albumUri === currentAlbumUri) {
    return;
  }
  currentAlbumUri = albumInfo.albumUri;

  console.log('RYM Extension: Album changed to', albumInfo.artist, '-', albumInfo.album);
  injectRYMLinks(albumInfo.artist, albumInfo.album);
}

//#endregion

//#region Styles

/**
 * Injects CSS styles into the document head
 * @returns {void}
 */
function injectStyles() {
  const styleElement = document.createElement('style');
  styleElement.textContent = `
/* RateYourMusic Spicetify Extension Styles */

/* Fade-in animation */
@keyframes rymFadeIn {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.main-nowPlayingView-section.main-nowPlayingView-rym {
  margin-top: 24px;
  padding: 16px;
  background-color: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  animation: rymFadeIn 0.3s ease-out;
}

/* Header uses Spicetify theme color variables */
.rym-section-title {
  color: var(--spice-text, var(--text-base, #ffffff)) !important;
  font-size: 16px;
  font-weight: 700;
  margin: 0 0 12px 0;
}

.rym-content {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.rym-link-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 20px;
  padding: 2px 0;
}

.rym-album-link {
  color: var(--spice-text, var(--text-base, #ffffff));
  text-decoration: none;
  font-size: 14px;
  font-weight: 400;
  transition: all 0.2s ease;
  cursor: pointer;
  display: flex;
  align-items: center;
  flex: 1;
  opacity: 0.9;
}

.rym-album-link:hover {
  opacity: 1;
}

.rym-album-link:hover .rym-link-text {
  text-decoration: underline;
}

/* Copy button */
.rym-copy-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  cursor: pointer;
  padding: 6px 8px;
  margin-left: 12px;
  position: relative;
  opacity: 0.6;
  transition: all 0.2s ease;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
}

.rym-copy-btn:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.08);
}

.rym-copy-btn:active {
  transform: scale(0.95);
}

.rym-copy-icon {
  font-size: 13px;
  display: flex;
  align-items: center;
  transition: all 0.2s ease;
}

.rym-copy-btn.copied {
  opacity: 1;
  background: var(--spice-text, #1ed760);
  border-color: var(--spice-text, #1ed760);
}

.rym-copy-btn.copied .rym-copy-icon {
  color: #000;
  font-weight: bold;
}

/* Artist link */
.rym-artist-link {
  color: var(--spice-text, var(--text-base, #ffffff));
  text-decoration: none;
  font-size: 14px;
  font-weight: 400;
  transition: all 0.2s ease;
  cursor: pointer;
  display: flex;
  align-items: center;
  width: 100%;
  opacity: 0.85;
}

.rym-artist-link:hover {
  opacity: 1;
}

.rym-artist-link:hover .rym-link-text {
  text-decoration: underline;
}

/* Search fallback link */
.rym-search-link {
  color: var(--spice-subtext, var(--text-subdued, #b3b3b3));
  text-decoration: none;
  font-size: 13px;
  font-weight: 400;
  transition: all 0.2s ease;
  cursor: pointer;
  display: flex;
  align-items: center;
  width: 100%;
  opacity: 0.7;
}

.rym-search-link:hover {
  opacity: 1;
}

.rym-search-link:hover .rym-link-text {
  text-decoration: underline;
}

.rym-link-text {
  display: inline-block;
}
  `;
  document.head.appendChild(styleElement);
}

//#endregion

//#region Initialization

/**
 * Initializes the extension and sets up event listeners
 * @returns {void}
 */
function initializeExtension() {
  Spicetify.Player.addEventListener('songchange', handleAlbumChange);
  handleAlbumChange();
  console.log('RYM Extension: Initialized successfully');
}

//#endregion

//#region Bootstrap

(async function () {
  while (!Spicetify?.Player?.data || !Spicetify?.Platform) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('RYM Extension: Starting...');
  injectStyles();
  initializeExtension();
})();

//#endregion
