// NAME: RateYourMusic Integration
// AUTHOR: yusufaf
// x-release-please-start-version
// VERSION: 1.1.0
// x-release-please-end-version
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

/** LocalStorage key for extension configuration */
const CONFIG_KEY = 'rym-extension-config';

/** Gear/settings icon SVG path (16x16 viewBox, Bootstrap Icons gear-fill) */
const GEAR_SVG_PATH = 'M9.405 1.05c-.413-1.4-2.397-1.4-2.81 0l-.1.34a1.464 1.464 0 0 1-2.105.872l-.31-.17c-1.283-.698-2.686.705-1.987 1.987l.169.311c.446.82.023 1.841-.872 2.105l-.34.1c-1.4.413-1.4 2.397 0 2.81l.34.1a1.464 1.464 0 0 1 .872 2.105l-.17.31c-.698 1.283.705 2.686 1.987 1.987l.311-.169a1.464 1.464 0 0 1 2.105.872l.1.34c.413 1.4 2.397 1.4 2.81 0l.1-.34a1.464 1.464 0 0 1 2.105-.872l.31.17c1.283.698 2.686-.705 1.987-1.987l-.169-.311a1.464 1.464 0 0 1 .872-2.105l.34-.1c1.4-.413 1.4-2.397 0-2.81l-.34-.1a1.464 1.464 0 0 1-.872-2.105l.17-.31c.698-1.283-.705-2.686-1.987-1.987l-.311.169a1.464 1.464 0 0 1-2.105-.872zM8 10.93a2.929 2.929 0 1 1 0-5.858 2.929 2.929 0 0 1 0 5.858z';

/** Default configuration */
const DEFAULT_CONFIG = {
  position: 'below-album-info',
  showAlbumLink: true,
  showArtistLink: true,
  showSearchLink: true,
  compactMode: false,
  showTooltips: true
};

//#endregion

//#region State

/** @type {HTMLElement|null} Shared tooltip element */
let tooltipElement = null;

/** @type {string|null} Currently displayed album URI */
let currentAlbumUri = null;

//#endregion

//#region Utilities

/**
 * Slugifies string for RYM URLs (lowercase, hyphens, remove special chars)
 * Handles accented characters by converting them to ASCII equivalents
 * @param {string} str - Input string
 * @returns {string} Slugified string
 */
function slugify(str) {
  return str
    .normalize('NFD')                    // Decompose accented characters (é → e + ́)
    .replace(/[\u0300-\u036f]/g, '')     // Remove diacritical marks
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')            // Remove remaining special characters
    .replace(/[\s_]+/g, '-')             // Replace spaces/underscores with hyphens
    .replace(/-+/g, '-')                 // Collapse multiple hyphens
    .replace(/^-+|-+$/g, '');            // Trim hyphens from ends
}

/**
 * Creates or returns the shared tooltip element
 * @returns {HTMLElement} Tooltip element
 */
function getTooltip() {
  if (!tooltipElement) {
    tooltipElement = document.createElement('div');
    tooltipElement.className = 'rym-tooltip';
    document.body.appendChild(tooltipElement);
  }
  return tooltipElement;
}

/**
 * Shows tooltip near the target element with the given text
 * @param {HTMLElement} target - Element to position near
 * @param {string} text - Text to display
 */
function showTooltip(target, text) {
  const tooltip = getTooltip();
  tooltip.textContent = text;

  const rect = target.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();

  // Position below the target, aligned to left
  let left = rect.left;
  let top = rect.bottom + 8;

  // Adjust if tooltip would go off right edge
  if (left + 300 > window.innerWidth) {
    left = window.innerWidth - 310;
  }

  // Adjust if tooltip would go off bottom edge
  if (top + 40 > window.innerHeight) {
    top = rect.top - 40;
    tooltip.style.setProperty('--arrow-top', 'auto');
    tooltip.style.setProperty('--arrow-bottom', '-5px');
  }

  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
  tooltip.classList.add('visible');
}

/**
 * Hides the tooltip
 */
function hideTooltip() {
  if (tooltipElement) {
    tooltipElement.classList.remove('visible');
  }
}

/**
 * Attaches tooltip behavior to a link element
 * @param {HTMLElement} link - Link element
 * @param {string} url - URL to show in tooltip
 */
function attachTooltip(link, url) {
  link.addEventListener('mouseenter', () => showTooltip(link, url));
  link.addEventListener('mouseleave', hideTooltip);
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

/**
 * Loads configuration from LocalStorage
 * @returns {Object} Configuration object with position property
 */
function loadConfig() {
  try {
    const stored = Spicetify.LocalStorage.get(CONFIG_KEY);
    if (stored) {
      // Merge with defaults to handle new settings added in updates
      return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
    }
    return DEFAULT_CONFIG;
  } catch (e) {
    console.warn('RYM Extension: Failed to load config, using defaults', e);
    return DEFAULT_CONFIG;
  }
}

/**
 * Saves configuration to LocalStorage
 * @param {Object} config - Configuration object to save
 * @returns {void}
 */
function saveConfig(config) {
  Spicetify.LocalStorage.set(CONFIG_KEY, JSON.stringify(config));
}

/**
 * Registers a "RYM" entry in the Spotify profile menu so settings remain
 * reachable from anywhere in the app, not just album pages where the card renders.
 */
function registerMenuItem() {
  if (!Spicetify?.Menu?.Item) return;
  const item = new Spicetify.Menu.Item('RYM', false, showSettingsModal);
  item.register();
}

/**
 * Shows the settings modal using Spicetify.PopupModal
 * @returns {void}
 */
function showSettingsModal() {
  const config = loadConfig();

  const positions = [
    { id: 'top', label: 'Top of panel' },
    { id: 'below-album-info', label: 'Below album info' }
  ];

  const modalContent = document.createElement('div');
  modalContent.className = 'rym-settings-modal';
  modalContent.innerHTML = `
    <div class="rym-settings-section">
      <h3 class="rym-settings-section-title">Card Position</h3>
      <div class="rym-position-options">
        ${positions.map(pos => `
          <label class="rym-position-option ${config.position === pos.id ? 'active' : ''}">
            <input type="radio" name="rym-position" value="${pos.id}" ${config.position === pos.id ? 'checked' : ''}>
            <span class="rym-option-radio"></span>
            <span class="rym-option-label">${pos.label}</span>
          </label>
        `).join('')}
      </div>
    </div>

    <div class="rym-settings-section">
      <h3 class="rym-settings-section-title">Visible Links</h3>
      <div class="rym-toggle-options">
        <label class="rym-toggle-option">
          <input type="checkbox" name="showAlbumLink" ${config.showAlbumLink ? 'checked' : ''}>
          <span class="rym-toggle-switch"></span>
          <span class="rym-toggle-label">Album link</span>
        </label>
        <label class="rym-toggle-option">
          <input type="checkbox" name="showArtistLink" ${config.showArtistLink ? 'checked' : ''}>
          <span class="rym-toggle-switch"></span>
          <span class="rym-toggle-label">Artist link</span>
        </label>
        <label class="rym-toggle-option">
          <input type="checkbox" name="showSearchLink" ${config.showSearchLink ? 'checked' : ''}>
          <span class="rym-toggle-switch"></span>
          <span class="rym-toggle-label">Search link</span>
        </label>
      </div>
    </div>

    <div class="rym-settings-section">
      <h3 class="rym-settings-section-title">Appearance</h3>
      <div class="rym-toggle-options">
        <label class="rym-toggle-option">
          <input type="checkbox" name="compactMode" ${config.compactMode ? 'checked' : ''}>
          <span class="rym-toggle-switch"></span>
          <span class="rym-toggle-label">Compact mode</span>
        </label>
        <label class="rym-toggle-option">
          <input type="checkbox" name="showTooltips" ${config.showTooltips ? 'checked' : ''}>
          <span class="rym-toggle-switch"></span>
          <span class="rym-toggle-label">Show URL tooltips</span>
        </label>
      </div>
    </div>
  `;

  // Position radio handlers
  const radios = modalContent.querySelectorAll('input[name="rym-position"]');
  radios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      const newConfig = loadConfig();
      newConfig.position = e.target.value;
      saveConfig(newConfig);

      modalContent.querySelectorAll('.rym-position-option').forEach(opt => {
        opt.classList.toggle('active', opt.querySelector('input').value === e.target.value);
      });

      setTimeout(() => repositionRYMCard(), 100);
    });
  });

  // Toggle handlers for checkboxes
  const checkboxes = modalContent.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const newConfig = loadConfig();
      newConfig[e.target.name] = e.target.checked;
      saveConfig(newConfig);

      // Re-render the card to apply changes
      const albumInfo = getCurrentAlbumInfo();
      if (albumInfo) {
        injectRYMLinks(albumInfo.artist, albumInfo.album);
      }
    });
  });

  showCustomModal('RYM Settings', modalContent);
}

/**
 * Displays a custom DOM modal (replacement for Spicetify.PopupModal which is
 * broken in current Spotify versions due to React Router context errors).
 * @param {string} title - Modal title
 * @param {HTMLElement} contentElement - Modal body content
 * @returns {void}
 */
function showCustomModal(title, contentElement) {
  const existing = document.getElementById('rym-modal-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'rym-modal-overlay';
  overlay.className = 'rym-modal-overlay';

  const modal = document.createElement('div');
  modal.className = 'rym-modal';

  const header = document.createElement('div');
  header.className = 'rym-modal-header';
  header.innerHTML = `
    <h2 class="rym-modal-title">${title}</h2>
    <button class="rym-modal-close" type="button" aria-label="Close">&times;</button>
  `;

  const body = document.createElement('div');
  body.className = 'rym-modal-body';
  body.appendChild(contentElement);

  modal.appendChild(header);
  modal.appendChild(body);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  const close = () => {
    overlay.remove();
    document.removeEventListener('keydown', onEsc);
  };
  const onEsc = (e) => { if (e.key === 'Escape') close(); };

  header.querySelector('.rym-modal-close').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', onEsc);
}

/**
 * Repositions the RYM card based on current config
 * @returns {void}
 */
function repositionRYMCard() {
  const existing = document.getElementById(CONTAINER_ID);
  if (!existing) return;

  const config = loadConfig();
  const targetElement = document.querySelector(SELECTOR_RIGHT_SIDEBAR_CONTENT)
    || document.querySelector(SELECTOR_RIGHT_SIDEBAR_ALT);

  if (!targetElement) return;

  // Remove and re-insert at new position
  existing.remove();
  insertRYMContainer(existing, config.position);
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
 * Finds the scrollable content area that contains all sections
 * @returns {HTMLElement|null} The content container or null
 */
function findContentContainer() {
  // The nowPlayingGrid is inside a scrollable container that also has the other sections
  const grid = document.querySelector(SELECTOR_RIGHT_SIDEBAR_CONTENT);
  if (grid && grid.parentElement) {
    // The parent should be the scrollable area containing all sections
    return grid.parentElement;
  }
  return document.querySelector(SELECTOR_RIGHT_SIDEBAR_ALT);
}

/**
 * Inserts RYM container at the specified position using DOM manipulation
 * @param {HTMLElement} container - The RYM container element
 * @param {string} position - Position setting
 * @returns {boolean} Success status
 */
function insertRYMContainer(container, position) {
  const grid = document.querySelector(SELECTOR_RIGHT_SIDEBAR_CONTENT);
  const contentContainer = findContentContainer();

  if (!contentContainer) {
    console.warn('RYM Extension: Could not find content container');
    return false;
  }

  switch (position) {
    case 'top':
      // Insert as first child of the content container (before the grid)
      if (contentContainer.firstChild) {
        contentContainer.insertBefore(container, contentContainer.firstChild);
      } else {
        contentContainer.appendChild(container);
      }
      break;

    case 'below-album-info':
    default:
      // Insert right after the grid (which contains album art/info)
      if (grid && grid.nextSibling) {
        contentContainer.insertBefore(container, grid.nextSibling);
      } else if (grid) {
        contentContainer.insertBefore(container, grid.nextSibling);
      } else {
        contentContainer.appendChild(container);
      }
      break;
  }

  return true;
}

/**
 * Ensures RYM card is at the correct position
 * Called after a delay to handle Spotify's dynamic content loading
 * @returns {void}
 */
function ensureCorrectPosition() {
  const config = loadConfig();
  const container = document.getElementById(CONTAINER_ID);
  if (!container) return;

  const contentContainer = findContentContainer();
  if (!contentContainer) return;

  const grid = document.querySelector(SELECTOR_RIGHT_SIDEBAR_CONTENT);
  const position = config.position;

  switch (position) {
    case 'top':
      // Should be first child
      if (contentContainer.firstElementChild !== container) {
        container.remove();
        contentContainer.insertBefore(container, contentContainer.firstChild);
      }
      break;

    case 'below-album-info':
    default:
      // Should be right after the grid
      if (grid && grid.nextElementSibling !== container) {
        container.remove();
        if (grid.nextSibling) {
          contentContainer.insertBefore(container, grid.nextSibling);
        } else {
          contentContainer.appendChild(container);
        }
      }
      break;
  }
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

  const config = loadConfig();

  const container = createRYMContainer();
  container.className = `main-nowPlayingView-section main-nowPlayingView-rym${config.compactMode ? ' rym-compact' : ''}`;

  // Build links HTML based on config
  let linksHtml = '';
  if (config.showAlbumLink) {
    linksHtml += `
      <div class="rym-link-item">
        <a href="${albumUrl}" target="_blank" rel="noopener noreferrer" class="rym-album-link">
          <span class="rym-link-text">View Album on RYM</span>
        </a>
        <button class="rym-copy-btn" data-url="${albumUrl}" title="Copy link" type="button">
          <span class="rym-copy-icon">📋</span>
        </button>
      </div>`;
  }
  if (config.showArtistLink) {
    linksHtml += `
      <div class="rym-link-item">
        <a href="${artistUrl}" target="_blank" rel="noopener noreferrer" class="rym-artist-link">
          <span class="rym-link-text">View Artist on RYM</span>
        </a>
      </div>`;
  }
  if (config.showSearchLink) {
    linksHtml += `
      <div class="rym-link-item">
        <a href="${searchUrl}" target="_blank" rel="noopener noreferrer" class="rym-search-link">
          <span class="rym-link-text">Wrong page? Search RYM</span>
        </a>
      </div>`;
  }

  container.innerHTML = `
    <h2 class="rym-section-title">
      RYM
      <button class="rym-settings-btn" title="Settings" type="button">
        <svg class="rym-settings-icon" viewBox="0 0 16 16" fill="currentColor" fill-rule="evenodd" aria-hidden="true">
          <path d="${GEAR_SVG_PATH}"></path>
        </svg>
      </button>
    </h2>
    <div class="rym-content">
      ${linksHtml}
    </div>
  `;

  // Attach tooltips to links (if enabled)
  if (config.showTooltips) {
    const albumLink = container.querySelector('.rym-album-link');
    const artistLink = container.querySelector('.rym-artist-link');
    const searchLink = container.querySelector('.rym-search-link');
    if (albumLink) attachTooltip(albumLink, albumUrl);
    if (artistLink) attachTooltip(artistLink, artistUrl);
    if (searchLink) attachTooltip(searchLink, searchUrl);
  }

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

  // Attach settings button handler
  const settingsBtn = container.querySelector('.rym-settings-btn');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      showSettingsModal();
    }, true);
  }

  console.log('RYM Extension: Detected release type:', releaseType, 'for', album);

  // Use config-based positioning
  insertRYMContainer(container, config.position);
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

/* Settings button */
.rym-section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.rym-settings-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 4px;
  opacity: 0.5;
  transition: opacity 0.2s ease;
  line-height: 0;
  flex-shrink: 0;
  position: relative;
  z-index: 10;
  pointer-events: auto;
  color: var(--spice-text, #fff);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.rym-settings-icon {
  width: 14px;
  height: 14px;
  display: block;
}

.rym-settings-btn:hover {
  opacity: 1;
}

/* Custom modal (replaces broken Spicetify.PopupModal) */
.rym-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: rymFadeIn 0.15s ease-out;
}

.rym-modal {
  background: var(--spice-main, #121212);
  color: var(--spice-text, #fff);
  border-radius: 8px;
  min-width: 340px;
  max-width: 480px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.rym-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.rym-modal-title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
}

.rym-modal-close {
  background: transparent;
  border: none;
  color: var(--spice-text, #fff);
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
  padding: 4px 8px;
  opacity: 0.7;
  transition: opacity 0.2s ease;
}

.rym-modal-close:hover {
  opacity: 1;
}

.rym-modal-body {
  padding: 16px 20px;
  overflow-y: auto;
}

/* Settings modal */
.rym-settings-modal {
  padding: 8px 0;
}

.rym-settings-section {
  margin-bottom: 16px;
}

.rym-settings-section-title {
  color: var(--spice-text, #fff);
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 4px 0;
}

.rym-settings-section-desc {
  color: var(--spice-subtext, #b3b3b3);
  font-size: 12px;
  margin: 0 0 12px 0;
}

.rym-position-options {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.rym-position-option {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.rym-position-option:hover {
  background: rgba(255, 255, 255, 0.1);
}

.rym-position-option.active {
  background: color-mix(in srgb, var(--spice-button, #1db954) 15%, transparent);
}

.rym-position-option input[type="radio"] {
  display: none;
}

.rym-option-radio {
  width: 16px;
  height: 16px;
  border: 2px solid var(--spice-subtext, #b3b3b3);
  border-radius: 50%;
  margin-right: 12px;
  position: relative;
  flex-shrink: 0;
  transition: border-color 0.2s ease;
}

.rym-position-option.active .rym-option-radio {
  border-color: var(--spice-button, #1db954);
}

.rym-position-option.active .rym-option-radio::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 8px;
  height: 8px;
  background: var(--spice-button, #1db954);
  border-radius: 50%;
}

.rym-option-label {
  color: var(--spice-text, #fff);
  font-size: 14px;
}

.rym-position-option.active .rym-option-label {
  color: var(--spice-button, #1db954);
  font-weight: 500;
}

/* Toggle switches */
.rym-toggle-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rym-toggle-option {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 8px 0;
}

.rym-toggle-option input[type="checkbox"] {
  display: none;
}

.rym-toggle-switch {
  width: 44px;
  height: 22px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 11px;
  position: relative;
  margin-right: 12px;
  transition: background 0.2s ease;
  flex-shrink: 0;
}

.rym-toggle-switch::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 16px;
  height: 16px;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 50%;
  transition: all 0.2s ease;
}

.rym-toggle-option input:checked + .rym-toggle-switch {
  background: var(--spice-button, #1db954);
}

.rym-toggle-option input:checked + .rym-toggle-switch::after {
  left: 25px;
  background: #000;
}

.rym-toggle-label {
  color: var(--spice-text, #fff);
  font-size: 14px;
}

/* Compact mode */
.main-nowPlayingView-rym.rym-compact {
  padding: 10px 12px;
  margin-top: 16px;
}

.rym-compact .rym-section-title {
  font-size: 14px;
  margin-bottom: 8px;
}

.rym-compact .rym-content {
  gap: 6px;
}

.rym-compact .rym-link-item {
  min-height: 16px;
  padding: 0;
}

.rym-compact .rym-album-link,
.rym-compact .rym-artist-link {
  font-size: 13px;
}

.rym-compact .rym-search-link {
  font-size: 12px;
}

.rym-compact .rym-copy-btn {
  padding: 4px 6px;
  min-width: 28px;
  margin-left: 8px;
}

.rym-compact .rym-copy-icon {
  font-size: 11px;
}

/* Custom URL tooltip */
.rym-tooltip {
  position: fixed;
  background: rgba(0, 0, 0, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 4px;
  padding: 6px 10px;
  font-size: 12px;
  color: var(--spice-subtext, #b3b3b3);
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transform: translateY(4px);
  transition: opacity 0.15s ease, transform 0.15s ease;
  z-index: 9999;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

.rym-tooltip.visible {
  opacity: 1;
  transform: translateY(0);
}

.rym-tooltip::before {
  content: '';
  position: absolute;
  top: -5px;
  left: 16px;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-bottom: 5px solid rgba(255, 255, 255, 0.15);
}

.rym-tooltip::after {
  content: '';
  position: absolute;
  top: -4px;
  left: 17px;
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  border-bottom: 4px solid rgba(0, 0, 0, 0.9);
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
  Spicetify.Player.addEventListener('songchange', () => {
    handleAlbumChange();
    // Quick position check after content loads
    setTimeout(ensureCorrectPosition, 300);
  });

  handleAlbumChange();
  setTimeout(ensureCorrectPosition, 300);

  console.log('RYM Extension: Initialized successfully');
}

//#endregion

//#region Bootstrap

(async function () {
  while (!Spicetify?.Player?.data || !Spicetify?.Platform || !Spicetify?.Menu?.Item) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('RYM Extension: Starting...');
  injectStyles();
  registerMenuItem();
  initializeExtension();
})();

//#endregion
