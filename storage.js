const STORAGE_KEY = 'ai-boundaries-v1';

const BoundariesStorage = {
  // Saves domain selections. Works in both standalone (localStorage) and
  // extension (chrome.storage.sync) contexts.
  save(data) {
    const payload = {
      version: 1,
      savedAt: new Date().toISOString(),
      domains: data.domains.map(d => ({
        id:        d.id,
        name:      d.name,
        cat:       d.cat,
        custom:    d.custom,
        suggestedQ: d.suggestedQ || null,
        x:         d.x !== null ? Math.round(d.x * 1000) / 1000 : null,
        y:         d.y !== null ? Math.round(d.y * 1000) / 1000 : null,
      })),
      newChat: data.newChat && data.newChat.x !== null ? {
        x: Math.round(data.newChat.x * 1000) / 1000,
        y: Math.round(data.newChat.y * 1000) / 1000,
      } : null,
      sycophancy: typeof data.sycophancy === 'number' ? data.sycophancy : 50,
    };

    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.sync.set({ [STORAGE_KEY]: payload });
    } else {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(payload)); } catch (_) {}
    }
  },

  // Loads saved selections and calls callback(data) — data is null if nothing saved.
  load(callback) {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.sync.get(STORAGE_KEY, result => callback(result[STORAGE_KEY] || null));
    } else {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        callback(raw ? JSON.parse(raw) : null);
      } catch (_) { callback(null); }
    }
  },

  // Calls callback(newData) whenever selections change (extension context only).
  onChange(callback) {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'sync' && changes[STORAGE_KEY]) {
          callback(changes[STORAGE_KEY].newValue || null);
        }
      });
    }
  },

  clear() {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.sync.remove(STORAGE_KEY);
    } else {
      try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
    }
  },
};
