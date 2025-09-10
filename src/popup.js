document.addEventListener('DOMContentLoaded', () => {
  const checkbox = document.getElementById('enableToggle');
  const knownBotsCheckbox = document.getElementById('knownBotsToggle');
  const versionEl = document.getElementById('version');

  // Fill "Version: ..." from manifest
  (function setVersion() {
    if (!versionEl) return;
    let v = 'dev';
    try {
      if (
        typeof chrome !== 'undefined' &&
        chrome.runtime &&
        typeof chrome.runtime.getManifest === 'function'
      ) {
        const m = chrome.runtime.getManifest();
        if (m) v = m.version_name || m.version || v;
      }
    } catch (_) {
      // keep fallback
    }
    versionEl.textContent = 'Version: ' + v;
  })();

  // Load settings
  chrome.storage.sync.get(
    { enabled: true, knownBots_enabled: true },
    (data) => {
      if (checkbox) checkbox.checked = data.enabled;
      if (knownBotsCheckbox) knownBotsCheckbox.checked = data.knownBots_enabled;
    },
  );

  // Save settings on change
  if (checkbox) {
    checkbox.addEventListener('change', () => {
      chrome.storage.sync.set({ enabled: checkbox.checked });
    });
  }
  if (knownBotsCheckbox) {
    knownBotsCheckbox.addEventListener('change', () => {
      chrome.storage.sync.set({ knownBots_enabled: knownBotsCheckbox.checked });
    });
  }
});
