// MINT: reader settings (defaults, allowed values, persistence).
// Stored only in chrome.storage.local. Never synced, never sent anywhere.
(() => {
  const NS = (globalThis.__mintNS = globalThis.__mintNS || {});

  const STORAGE_KEY = "readerSettings";

  const FONT_SIZE = { min: 14, max: 28, step: 2 };

  const THEMES = [
    { id: "light", label: "Light" },
    { id: "sepia", label: "Sepia" },
    { id: "gray", label: "Gray" },
    { id: "dark", label: "Dark" },
  ];

  // System font stacks only: downloading web fonts would mean network requests.
  const FONTS = [
    { id: "georgia", label: "Georgia", stack: 'Georgia, "Times New Roman", serif' },
    {
      id: "charter",
      label: "Charter",
      stack: 'Charter, "Bitstream Charter", "Sitka Text", Cambria, "Iowan Old Style", serif',
    },
    {
      id: "system",
      label: "System",
      stack: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    },
    { id: "helvetica", label: "Helvetica", stack: '"Helvetica Neue", Helvetica, Arial, sans-serif' },
  ];

  const WIDTHS = [
    { id: "narrow", label: "Narrow", value: "60ch" },
    { id: "medium", label: "Medium", value: "68ch" },
    { id: "wide", label: "Wide", value: "80ch" },
  ];

  const SPACINGS = [
    { id: "tight", label: "Tight", value: "1.45" },
    { id: "normal", label: "Normal", value: "1.65" },
    { id: "loose", label: "Loose", value: "1.85" },
  ];

  const DEFAULTS = {
    fontSize: 20,
    theme: "light",
    font: "georgia",
    width: "medium",
    spacing: "normal",
  };

  const ids = (list) => list.map((x) => x.id);

  function validate(raw) {
    const s = { ...DEFAULTS };
    if (!raw || typeof raw !== "object") return s;
    const size = Number(raw.fontSize);
    if (Number.isFinite(size)) {
      s.fontSize = Math.min(FONT_SIZE.max, Math.max(FONT_SIZE.min, Math.round(size)));
    }
    if (ids(THEMES).includes(raw.theme)) s.theme = raw.theme;
    if (ids(FONTS).includes(raw.font)) s.font = raw.font;
    if (ids(WIDTHS).includes(raw.width)) s.width = raw.width;
    if (ids(SPACINGS).includes(raw.spacing)) s.spacing = raw.spacing;
    return s;
  }

  async function load() {
    try {
      const data = await chrome.storage.local.get(STORAGE_KEY);
      return validate(data[STORAGE_KEY]);
    } catch (_) {
      return { ...DEFAULTS };
    }
  }

  let saveTimer = null;
  function save(settings) {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      chrome.storage.local.set({ [STORAGE_KEY]: validate(settings) }).catch(() => {});
    }, 150);
  }

  function onChange(callback) {
    const listener = (changes, area) => {
      if (area === "local" && changes[STORAGE_KEY]) {
        callback(validate(changes[STORAGE_KEY].newValue));
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }

  NS.settings = {
    FONT_SIZE,
    THEMES,
    FONTS,
    WIDTHS,
    SPACINGS,
    DEFAULTS,
    validate,
    load,
    save,
    onChange,
  };
})();
