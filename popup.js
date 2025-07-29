const checkbox = document.getElementById('enableToggle');
const knownBotsCheckbox = document.getElementById('knownBotsToggle');

// Load settings
chrome.storage.sync.get({ enabled: true, knownBots_enabled: true }, (data) => {
    checkbox.checked = data.enabled;
    knownBotsCheckbox.checked = data.knownBots_enabled;
});

// Save settings on change
checkbox.addEventListener('change', () => {
    chrome.storage.sync.set({ enabled: checkbox.checked });
});
knownBotsCheckbox.addEventListener('change', () => {
    chrome.storage.sync.set({ knownBots_enabled: knownBotsCheckbox.checked });
});
