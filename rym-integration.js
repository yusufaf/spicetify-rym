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
  if (!data || !data.item) {
    return null;
  }

  return {
    artist: data.item.artists?.[0]?.name || '',
    album: data.item.album?.name || '',
    albumUri: data.item.album?.uri || '',
    releaseDate: data.item.album?.date?.year || null,
    albumType: data.item.album?.type || null,
    totalTracks: data.item.album?.total_tracks || null
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
  const searchUrl = `${RYM_BASE_URL}/search?searchterm=${encodeURIComponent(artist + ' ' + album)}`;

  const container = createRYMContainer();
  container.className = 'main-nowPlayingView-section main-nowPlayingView-rym';
  container.innerHTML = `
    <div class="main-nowPlayingView-sectionHeader">
      <h2 class="encore-text-body-medium-bold" data-encore-id="text">
        <div class="main-nowPlayingView-sectionHeaderText">RYM</div>
      </h2>
    </div>
    <div class="rym-content">
      <a href="${albumUrl}" target="_blank" rel="noopener noreferrer" class="rym-album-link">
        View on RateYourMusic
      </a>
      <div class="rym-fallback">
        <a href="${searchUrl}" target="_blank" rel="noopener noreferrer" class="rym-search-link">
          Wrong page? Search RYM
        </a>
      </div>
    </div>
  `;

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

.main-nowPlayingView-section.main-nowPlayingView-rym {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.rym-content {
  margin-top: 12px;
}

.rym-album-link {
  color: var(--text-subdued, #a7a7a7);
  text-decoration: none;
  font-size: 14px;
  font-weight: 400;
  transition: color 0.2s ease;
  cursor: pointer;
  display: block;
}

.rym-album-link:hover {
  color: var(--text-base, #ffffff);
  text-decoration: underline;
}

.rym-fallback {
  margin-top: 8px;
}

.rym-search-link {
  color: var(--text-subdued, #a7a7a7);
  text-decoration: none;
  font-size: 12px;
  font-weight: 400;
  opacity: 0.7;
  transition: opacity 0.2s ease;
  display: block;
}

.rym-search-link:hover {
  opacity: 1;
  text-decoration: underline;
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
