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

/** Now Playing panel root (Spotify 1.3.3+). Attribute-based so it survives class-hash changes. */
const SELECTOR_NPV_ROOT = '[data-npv-root]';

/** Scroll viewport of the Now Playing panel. Excludes the panel header, whose context link can also point at the album. */
const SELECTOR_NPV_VIEWPORT = `${SELECTOR_NPV_ROOT} [data-overlayscrollbars-viewport]`;

/** Legacy selector for the album art/info grid (Spotify < 1.3.3, relies on a Spicetify css-map class) */
const SELECTOR_RIGHT_SIDEBAR_CONTENT = '.main-nowPlayingView-nowPlayingGrid';

/** Legacy alternative selector for right sidebar */
const SELECTOR_RIGHT_SIDEBAR_ALT = '[data-testid="NPV_Panel_OpenDiv"]';

/** LocalStorage key for extension configuration */
const CONFIG_KEY = 'rym-extension-config';

/** Gear/settings icon SVG path (16x16 viewBox, Bootstrap Icons gear-fill) */
const GEAR_SVG_PATH = 'M9.405 1.05c-.413-1.4-2.397-1.4-2.81 0l-.1.34a1.464 1.464 0 0 1-2.105.872l-.31-.17c-1.283-.698-2.686.705-1.987 1.987l.169.311c.446.82.023 1.841-.872 2.105l-.34.1c-1.4.413-1.4 2.397 0 2.81l.34.1a1.464 1.464 0 0 1 .872 2.105l-.17.31c-.698 1.283.705 2.686 1.987 1.987l.311-.169a1.464 1.464 0 0 1 2.105.872l.1.34c.413 1.4 2.397 1.4 2.81 0l.1-.34a1.464 1.464 0 0 1 2.105-.872l.31.17c1.283.698 2.686-.705 1.987-1.987l-.169-.311a1.464 1.464 0 0 1 .872-2.105l.34-.1c1.4-.413 1.4-2.397 0-2.81l-.34-.1a1.464 1.464 0 0 1-.872-2.105l.17-.31c.698-1.283-.705-2.686-1.987-1.987l-.311.169a1.464 1.464 0 0 1-2.105-.872zM8 10.93a2.929 2.929 0 1 1 0-5.858 2.929 2.929 0 0 1 0 5.858z';

/** GitHub mark icon SVG path (16x16 viewBox, Bootstrap Icons github, same source as GEAR_SVG_PATH) */
const GITHUB_SVG_PATH = 'M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z';

/** Extension version, shown in the settings modal footer. Kept in sync with the VERSION banner by release-please. */
// x-release-please-start-version
const RYM_VERSION = '1.1.0';
// x-release-please-end-version

/** GitHub repo slug, used to build the "report an issue" link in the settings modal footer */
const RYM_GITHUB_REPO = 'yusufaf/spicetify-rym';

/**
 * Marker appended to outgoing album links when the companion API is configured.
 * The capture userscript reads `sid` off the URL, which ties a RYM page back to
 * an exact Spotify album with no name matching involved.
 */
const RYM_LINK_SOURCE = 'spicetify';

/**
 * Give up on the companion API after this long. The card is fully rendered
 * before the request is even sent, so a slow or dead server costs nothing
 * except the upgrade it would have provided.
 */
const API_TIMEOUT_MS = 4000;

/** Spotify base-62 album ids are 22 characters. */
const SPOTIFY_ALBUM_ID_PATTERN = /^[A-Za-z0-9]{22}$/;

/** Default configuration */
const DEFAULT_CONFIG = {
  position: 'below-album-info',
  showAlbumLink: true,
  showArtistLink: true,
  showSearchLink: true,
  compactMode: false,
  showTooltips: true,
  // Companion API (spicetify-music-api), off until both fields are filled in.
  // With no configuration the extension makes zero network requests, which is a
  // property worth keeping deliberate rather than incidental.
  apiBaseUrl: '',
  apiToken: '',
  // Whether to show the rating and genres you captured yourself. Only has an
  // effect once the API above is configured.
  showRymData: true
};

//#endregion

//#region State

/** @type {HTMLElement|null} Shared tooltip element */
let tooltipElement = null;

/** @type {string|null} Currently displayed album URI */
let currentAlbumUri = null;

/** @type {HTMLElement|null} Card for the current album, kept so it can be re-inserted when Spotify re-renders the panel */
let rymCard = null;

/**
 * @type {Map<string, Object>} spotifyAlbumId -> companion API response.
 * Session-scoped and only holds responses that carried something to show. An
 * album with no capture yet is not cached, so the ✓ appears on the next
 * album change after you capture it rather than after a Spotify restart.
 */
const albumDataCache = new Map();

/** Bounds the cache for very long listening sessions. */
const ALBUM_CACHE_LIMIT = 300;

//#endregion

//#region Utilities

/**
 * Characters NFD does not decompose, which the special-character strip would
 * otherwise delete outright (Ágætis byrjun → "agtis-byrjun" instead of
 * "agaetis-byrjun"). Applied after toLowerCase(), so lowercase keys suffice.
 *
 * Verified against live RYM URLs: æ (sigur-ros/agaetis-byrjun, kaelan-mikla),
 * ø (artist/slotface). The rest follow the same transliteration convention but
 * are unverified — check against a real RYM URL before relying on them.
 */
const SLUG_TRANSLITERATIONS = {
  'æ': 'ae',
  'œ': 'oe',
  'ø': 'o',
  'ß': 'ss',
  'đ': 'd',
  'ð': 'd',
  'ł': 'l',
  'þ': 'th',
  'ı': 'i',
  'ŋ': 'n'
};

/** @type {RegExp} Matches any key of SLUG_TRANSLITERATIONS */
const SLUG_TRANSLITERATION_PATTERN = new RegExp(
  `[${Object.keys(SLUG_TRANSLITERATIONS).join('')}]`,
  'g'
);

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
    // Unicode dashes are not \w and would be deleted, silently joining the words
    // either side (JAŸ-Z spelled with U+2010 would slug to "jayz" and 404)
    .replace(/[‐-―−]/g, '-')
    // Expand ligatures NFD leaves intact, before they get stripped below
    .replace(SLUG_TRANSLITERATION_PATTERN, (ch) => SLUG_TRANSLITERATIONS[ch])
    .replace(/[$/]/g, '_')               // RYM maps $ and / to _ (AWAKE/ASLEEP → awake_asleep)
    .replace(/[^\w\s-]/g, '')            // Remove remaining special characters
    .replace(/\s+/g, '-')                // Replace spaces with hyphens (preserve underscores)
    .replace(/-+/g, '-')                 // Collapse multiple hyphens
    .replace(/^-+|-+$|_+$/g, '');        // Trim hyphens from ends and trailing underscores
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
 * Whether the companion API is usable. Both fields are required, so a partly
 * filled-in settings form never results in a request.
 * @param {Object} config - Configuration object
 * @returns {boolean} True when the API should be contacted
 */
function isApiConfigured(config) {
  return Boolean(config.apiBaseUrl && config.apiToken);
}

/**
 * Extracts the bare album id from a Spotify URI ("spotify:album:<id>").
 * @param {string|null} albumUri - Spotify album URI
 * @returns {string|null} The 22-character id, or null if the URI is unusable
 */
function spotifyAlbumIdFromUri(albumUri) {
  if (typeof albumUri !== 'string') return null;
  const id = albumUri.split(':').pop();
  return SPOTIFY_ALBUM_ID_PATTERN.test(id) ? id : null;
}

/**
 * Appends the correlation marker to an outgoing RYM link.
 * @param {string} url - RYM URL
 * @param {string|null} spotifyAlbumId - Album id to correlate with
 * @returns {string} URL with the marker, or the original when there is no id
 */
function withCorrelation(url, spotifyAlbumId) {
  if (!spotifyAlbumId) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}src=${RYM_LINK_SOURCE}&sid=${spotifyAlbumId}`;
}

/**
 * Checks a URL is genuinely a RateYourMusic page before it becomes an href.
 *
 * The API validates this on write, but pooled links originate from other users'
 * captures, so the value arriving here is not something this extension has ever
 * verified itself. Re-checking on read is cheap and keeps a bad row in the
 * shared table from turning into a link the user clicks.
 *
 * @param {string} url - Candidate URL
 * @returns {boolean} True when the URL is an https rateyourmusic.com URL
 */
function isSafeRymUrl(url) {
  if (typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && parsed.hostname === 'rateyourmusic.com';
  } catch (e) {
    return false;
  }
}

/**
 * Fetches stored RYM data for an album from the companion API.
 *
 * Never throws and never rejects: every failure path returns null, because the
 * card is already rendered by the time this runs and a dead server must be
 * indistinguishable from having no server configured.
 *
 * @param {string} spotifyAlbumId - Spotify album id
 * @param {Object} config - Configuration object
 * @returns {Promise<Object|null>} API response, or null on any failure
 */
async function fetchAlbumData(spotifyAlbumId, config) {
  const cached = albumDataCache.get(spotifyAlbumId);
  if (cached) return cached;

  const baseUrl = config.apiBaseUrl.replace(/\/+$/, '');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const response = await fetch(
      `${baseUrl}/v1/album?spotifyAlbumId=${encodeURIComponent(spotifyAlbumId)}`,
      {
        headers: { Authorization: `Bearer ${config.apiToken}` },
        signal: controller.signal
      }
    );

    if (!response.ok) {
      console.warn('RYM Extension: album lookup returned', response.status);
      return null;
    }

    const data = await response.json();
    // A 200 with nothing in it is still a miss: caching it would hide a
    // capture made later in the same session until Spotify restarts. Nor is a
    // response for settings changed mid-request: the cache was cleared for them.
    const current = loadConfig();
    const stillCurrent = current.apiBaseUrl === config.apiBaseUrl && current.apiToken === config.apiToken;
    if (stillCurrent && data && (data.link || data.personal)) {
      if (albumDataCache.size >= ALBUM_CACHE_LIMIT) {
        albumDataCache.clear();
      }
      albumDataCache.set(spotifyAlbumId, data);
    }
    return data;
  } catch (e) {
    console.warn('RYM Extension: album lookup unavailable:', e.message);
    return null;
  } finally {
    clearTimeout(timer);
  }
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

    <div class="rym-settings-section">
      <h3 class="rym-settings-section-title">Companion API (optional)</h3>
      <p class="rym-settings-section-desc">
        Leave these blank and the extension makes no network requests at all, which is the default.
        Fill both in and it will ask your own server for the RYM page previously seen for each album,
        and show the rating and genres you captured with the userscript.
        The token is stored in Spotify's local storage as plain text.
      </p>
      <div class="rym-settings-fields">
        <label class="rym-settings-field">
          <span class="rym-settings-field-label">API base URL</span>
          <input type="text" name="apiBaseUrl" spellcheck="false" autocomplete="off"
                 placeholder="https://xxxx.execute-api.us-east-1.amazonaws.com">
        </label>
        <label class="rym-settings-field">
          <span class="rym-settings-field-label">API token</span>
          <input type="password" name="apiToken" spellcheck="false" autocomplete="off"
                 placeholder="from scripts/issue-token.ts">
        </label>
      </div>
      <div class="rym-toggle-options">
        <label class="rym-toggle-option">
          <input type="checkbox" name="showRymData" ${config.showRymData ? 'checked' : ''}>
          <span class="rym-toggle-switch"></span>
          <span class="rym-toggle-label">Show my captured rating and genres</span>
        </label>
      </div>
    </div>
  `;

  // Values are assigned rather than interpolated into the template above, so a
  // token containing a quote cannot break out of the attribute.
  const apiFields = modalContent.querySelectorAll('.rym-settings-field input');
  apiFields.forEach((field) => {
    field.value = config[field.name] || '';
    field.addEventListener('change', (e) => {
      const newConfig = loadConfig();
      newConfig[e.target.name] = e.target.value.trim();
      saveConfig(newConfig);

      // Pointing at a different server invalidates anything already fetched.
      albumDataCache.clear();

      const albumInfo = getCurrentAlbumInfo();
      if (rymCard && albumInfo) {
        injectRYMLinks(albumInfo.artist, albumInfo.album);
      }
    });
  });

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

      setTimeout(() => ensureCorrectPosition(), 100);
    });
  });

  // Toggle handlers for checkboxes
  const checkboxes = modalContent.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const newConfig = loadConfig();
      newConfig[e.target.name] = e.target.checked;
      saveConfig(newConfig);

      // Re-render the card to apply changes. Only when one is showing: without
      // it the current track has no album (podcast, ad) and observePanel()
      // would keep re-inserting a card with empty links.
      const albumInfo = getCurrentAlbumInfo();
      if (rymCard && albumInfo) {
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

  const footer = document.createElement('div');
  footer.className = 'rym-modal-footer';
  footer.innerHTML = `
    <span class="rym-modal-version">v${RYM_VERSION}</span>
    <a class="rym-modal-github-link" href="https://github.com/${RYM_GITHUB_REPO}/issues/new" target="_blank" rel="noopener noreferrer" title="Report an issue on GitHub">
      <svg viewBox="0 0 16 16" class="rym-modal-github-icon"><path d="${GITHUB_SVG_PATH}"/></svg>
    </a>
  `;

  modal.appendChild(header);
  modal.appendChild(body);
  modal.appendChild(footer);
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
 * Locates the Now Playing panel elements the card is positioned against
 * @returns {{top: HTMLElement, info: HTMLElement|null}|null} The card is the first child
 *   of `top` for the 'top' position, otherwise it goes right after `info` (or at the end
 *   of `top` when `info` is unknown). Null when no Now Playing panel is rendered.
 */
function findPanelLayout() {
  const grid = document.querySelector(SELECTOR_RIGHT_SIDEBAR_CONTENT);
  if (grid && grid.parentElement) {
    return { top: grid.parentElement, info: grid };
  }

  const viewport = document.querySelector(SELECTOR_NPV_VIEWPORT);
  const content = viewport && viewport.firstElementChild;
  if (content) {
    // The title row is the ancestor of the track's artist link that sits beside
    // the sections (about the artist, credits) rendered below it. Not the album
    // link: without a Canvas video the cover art above is an album link too.
    const artistLink = content.querySelector('a[href^="/artist/"]');
    const section = content.querySelector('section');
    let row = artistLink && section ? artistLink : null;
    while (row && !row.parentElement.contains(section)) {
      row = row.parentElement;
    }
    return { top: content, info: row };
  }

  const alt = document.querySelector(SELECTOR_RIGHT_SIDEBAR_ALT);
  return alt ? { top: alt, info: null } : null;
}

/**
 * Inserts (or moves) the RYM container to the specified position. A no-op when it
 * is already there, so it is safe to call repeatedly.
 * @param {HTMLElement} container - The RYM container element
 * @param {string} position - Position setting
 * @returns {boolean} Success status
 */
function insertRYMContainer(container, position) {
  const layout = findPanelLayout();
  if (!layout) return false;

  if (position === 'top') {
    if (layout.top.firstElementChild !== container) layout.top.prepend(container);
  } else if (layout.info) {
    if (layout.info.nextElementSibling !== container) layout.info.after(container);
  } else if (container.parentElement !== layout.top) {
    layout.top.append(container);
  }

  return true;
}

/**
 * Ensures the current album's card is in the panel at the configured position.
 * The panel renders after the extension starts and is re-rendered (or closed)
 * at will, so this re-inserts a dropped card as well as moving a misplaced one.
 * @returns {void}
 */
function ensureCorrectPosition() {
  if (rymCard) insertRYMContainer(rymCard, loadConfig().position);
}

/**
 * Runs ensureCorrectPosition() after DOM changes, at most once per frame
 * @returns {void}
 */
function observePanel() {
  let scheduled = false;
  new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      ensureCorrectPosition();
    });
  }).observe(document.body, { childList: true, subtree: true });
}

/**
 * Injects RYM links into Spotify interface
 * @param {string} artist - Artist name
 * @param {string} album - Album name
 * @returns {void}
 */
function injectRYMLinks(artist, album) {
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

  // Only tag the link when there is somewhere for a capture to go. Without the
  // API configured the marker would change every outgoing URL for no benefit.
  const spotifyAlbumId = isApiConfigured(config)
    ? spotifyAlbumIdFromUri(albumInfo?.albumUri)
    : null;
  const albumHref = withCorrelation(albumUrl, spotifyAlbumId);

  const container = createRYMContainer();
  container.className = `main-nowPlayingView-section main-nowPlayingView-rym${config.compactMode ? ' rym-compact' : ''}`;
  // Records which album the card was built for, so it can be checked from the
  // console against Spicetify.Player.data (tests.live.md).
  if (albumInfo?.albumUri) {
    container.dataset.albumUri = albumInfo.albumUri;
  }

  // Build links HTML based on config
  let linksHtml = '';
  if (config.showAlbumLink) {
    linksHtml += `
      <div class="rym-link-item">
        <a href="${albumHref}" target="_blank" rel="noopener noreferrer" class="rym-album-link">
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

  rymCard = container;
  insertRYMContainer(container, config.position);

  // A closed or still-loading panel is expected; observePanel() inserts the
  // card once it renders. An open panel the card never lands in means
  // Spotify changed its DOM.
  setTimeout(() => {
    if (rymCard === container && !container.isConnected && document.querySelector(SELECTOR_NPV_ROOT)) {
      console.warn('RYM Extension: Could not find content container');
    }
  }, 3000);

  // Everything above is the card as it has always been, already built and
  // already correct. The API can only add to it, never delay it.
  if (spotifyAlbumId) {
    upgradeFromApi(container, spotifyAlbumId, config);
  }
}

/**
 * Replaces the guessed RYM URL with one a real user landed on, and shows the
 * data you captured yourself.
 *
 * Runs after the card is built and mutates it in place. Every exit path is
 * a silent return: if the API is slow, down, or has nothing stored, the card
 * simply stays as it was rendered.
 *
 * @param {HTMLElement} container - The card this request was fired for
 * @param {string} spotifyAlbumId - Album id, already validated
 * @param {Object} config - Configuration object the card was built with
 * @returns {Promise<void>}
 */
async function upgradeFromApi(container, spotifyAlbumId, config) {
  const data = await fetchAlbumData(spotifyAlbumId, config);
  if (!data) return;

  // Anything that happened while the request was in flight - a skip to another
  // album, a non-album track, a settings change - replaced or cleared rymCard,
  // and this response belongs to a card that is no longer current. Compared by
  // identity rather than looked up in the DOM: the current card may not be
  // attached yet (panel still loading, or the sidebar showing Queue).
  if (container !== rymCard) return;

  applyPooledLink(container, data.link, spotifyAlbumId, config);

  if (config.showRymData) {
    renderCapturedData(container, data.personal);
  }
}

/**
 * Points the album link at the URL stored for this album.
 *
 * This is the part that fixes 404s no amount of slug logic can: RYM's
 * disambiguation suffixes (/homogenic-17/, /the-blueprint.p/) are not derivable
 * from Spotify metadata by any means, so the only way to know one is for
 * somebody to have landed on it.
 *
 * @param {HTMLElement} container - The RYM card
 * @param {Object|null} link - Pooled link record from the API
 * @param {string} spotifyAlbumId - Album id, for the correlation marker
 * @param {Object} config - Configuration object
 * @returns {void}
 */
function applyPooledLink(container, link, spotifyAlbumId, config) {
  if (!link || !isSafeRymUrl(link.rymUrl)) return;

  const albumLink = container.querySelector('.rym-album-link');
  if (albumLink) {
    albumLink.href = withCorrelation(link.rymUrl, spotifyAlbumId);
    albumLink.classList.add('rym-link-confirmed');
    if (config.showTooltips) {
      // attachTooltip adds listeners rather than replacing them, so the old
      // pair has to go before a second one is attached.
      const replacement = albumLink.cloneNode(true);
      albumLink.replaceWith(replacement);
      attachTooltip(replacement, link.rymUrl);
    }
  }

  // The copy button deliberately keeps the clean URL: the correlation marker is
  // this extension's business, not something to paste into a chat window.
  const copyBtn = container.querySelector('.rym-copy-btn');
  if (copyBtn) {
    copyBtn.setAttribute('data-url', link.rymUrl);
  }
}

/**
 * Renders the rating and genres this user captured for the album.
 *
 * Built with createElement rather than innerHTML. The values are RYM's own
 * strings round-tripped through a server, and interpolating those into markup
 * would make the card an injection sink for anything that gets into the table.
 *
 * @param {HTMLElement} container - The RYM card
 * @param {Object|null} personal - Personal capture record from the API
 * @returns {void}
 */
function renderCapturedData(container, personal) {
  if (!personal) return;

  const content = container.querySelector('.rym-content');
  if (!content) return;

  const existing = content.querySelector('.rym-data');
  if (existing) existing.remove();

  const data = document.createElement('div');
  data.className = 'rym-data';

  if (typeof personal.rating === 'number') {
    const rating = document.createElement('div');
    rating.className = 'rym-data-rating';

    const score = document.createElement('span');
    score.className = 'rym-data-score';
    score.textContent = personal.rating.toFixed(2);
    rating.appendChild(score);

    if (typeof personal.ratingCount === 'number') {
      const count = document.createElement('span');
      count.className = 'rym-data-count';
      count.textContent = `${personal.ratingCount.toLocaleString()} ratings`;
      rating.appendChild(count);
    }

    if (typeof personal.yourRating === 'number') {
      const yours = document.createElement('span');
      yours.className = 'rym-data-yours';
      yours.textContent = `you: ${personal.yourRating}`;
      rating.appendChild(yours);
    }

    data.appendChild(rating);
  }

  if (Array.isArray(personal.genres) && personal.genres.length > 0) {
    const genres = document.createElement('div');
    genres.className = 'rym-data-genres';
    // Capped because the card is a sidebar column, not a page.
    personal.genres.slice(0, 6).forEach((name) => {
      const tag = document.createElement('span');
      tag.className = 'rym-data-genre';
      tag.textContent = name;
      genres.appendChild(tag);
    });
    data.appendChild(genres);
  }

  if (data.childElementCount === 0) return;

  data.title = `Captured from RateYourMusic on ${personal.capturedAt ? personal.capturedAt.slice(0, 10) : 'an earlier visit'}`;
  content.insertBefore(data, content.firstChild);
}

/**
 * Removes RYM UI from Spotify interface
 * @returns {void}
 */
function removeRYMUI() {
  if (rymCard) {
    rymCard.remove();
    rymCard = null;
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
    currentAlbumUri = null;
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
  /* Opaque base: in Spotify 1.3.3+ the card overlaps the bottom of the Canvas video */
  background: linear-gradient(rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.03)),
    var(--background-base, var(--spice-main, #121212));
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

/* Captured RYM data. Only rendered when the companion API is configured. */
.rym-data {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.rym-data-rating {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
}

.rym-data-score {
  color: var(--spice-text, #fff);
  font-size: 20px;
  font-weight: 700;
  line-height: 1;
}

.rym-data-count {
  color: var(--spice-subtext, #b3b3b3);
  font-size: 11px;
}

.rym-data-yours {
  color: var(--spice-button, #1ed760);
  font-size: 11px;
  font-weight: 600;
}

.rym-data-genres {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.rym-data-genre {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 3px;
  color: var(--spice-subtext, #b3b3b3);
  font-size: 11px;
  padding: 2px 6px;
  text-transform: capitalize;
}

/* Marks a link that came from a real capture rather than a generated slug. */
.rym-link-confirmed .rym-link-text::after {
  content: '✓';
  color: var(--spice-button, #1ed760);
  font-size: 10px;
  margin-left: 6px;
  opacity: 0.8;
}

.rym-compact .rym-data-score {
  font-size: 16px;
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

.rym-modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
}

.rym-modal-version {
  color: var(--spice-subtext, #b3b3b3);
  font-size: 0.75rem;
}

.rym-modal-github-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--spice-subtext, #b3b3b3);
}

.rym-modal-github-link:hover {
  color: var(--spice-text, #fff);
}

.rym-modal-github-icon {
  width: 16px;
  height: 16px;
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

.rym-settings-fields {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 12px;
}

.rym-settings-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.rym-settings-field-label {
  color: var(--spice-subtext, #b3b3b3);
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.rym-settings-field input {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 4px;
  color: var(--spice-text, #fff);
  font-family: inherit;
  font-size: 13px;
  padding: 8px 10px;
  width: 100%;
  box-sizing: border-box;
}

.rym-settings-field input:focus {
  border-color: var(--spice-button, #1ed760);
  outline: none;
}

.rym-settings-field input::placeholder {
  color: rgba(255, 255, 255, 0.3);
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
  Spicetify.Player.addEventListener('songchange', handleAlbumChange);

  observePanel();
  handleAlbumChange();

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
