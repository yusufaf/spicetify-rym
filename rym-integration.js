// NAME: RateYourMusic Integration
// AUTHOR: yusufaf
// DESCRIPTION: Quick access to RateYourMusic album and artist pages directly from Spotify's Now Playing sidebar
//
// RateYourMusic Integration moved to https://github.com/yusufaf/spicetify-extensions/tree/main/extensions/rym
// This file only loads it from there, so installs from this repository keep updating.
// Install it from the new location to stop depending on this redirect.

(function () {
  if (window.__rymActive) return;
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/gh/yusufaf/spicetify-extensions@main/extensions/rym/rym-integration.js';
  script.onerror = () => console.error('[RateYourMusic Integration] Could not load the extension from https://cdn.jsdelivr.net/gh/yusufaf/spicetify-extensions@main/extensions/rym/rym-integration.js');
  document.head.appendChild(script);
})();
