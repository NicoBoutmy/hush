// Test-only stand-in for chrome.storage so the reader scripts can run on a
// plain web page. Not part of the extension (not listed in the manifest).
(() => {
  const KEY = "__mintTestStorage";
  const read = () => JSON.parse(localStorage.getItem(KEY) || "{}");
  window.chrome = window.chrome || {};
  chrome.storage = {
    local: {
      get: async (k) => { const all = read(); return k in all ? { [k]: all[k] } : {}; },
      set: async (obj) => { localStorage.setItem(KEY, JSON.stringify({ ...read(), ...obj })); },
    },
    onChanged: { addListener() {}, removeListener() {} },
  };
  // Test only: force shadow roots open so tests can inspect the reader.
  const attach = Element.prototype.attachShadow;
  Element.prototype.attachShadow = function (init) { return attach.call(this, { ...init, mode: "open" }); };
  // Simulate the toolbar icon / shortcut.
  window.addEventListener("keydown", (e) => {
    if (e.altKey && e.shiftKey && e.code === "KeyR") { e.preventDefault(); globalThis.__mint.toggle(); }
  });
})();

// Test/screenshot only: ?reader=1 opens the reader on load; theme, font,
// size, width and spacing params preset the settings; popover=1 opens Aa;
// scroll=N scrolls the reader.
window.addEventListener("load", async () => {
  const q = new URLSearchParams(location.search);
  if (!q.has("reader")) return;
  const preset = {};
  for (const k of ["theme", "font", "width", "spacing"]) if (q.has(k)) preset[k] = q.get(k);
  if (q.has("size")) preset.fontSize = Number(q.get("size"));
  if (Object.keys(preset).length) {
    const cur = (await chrome.storage.local.get("readerSettings")).readerSettings || {};
    await chrome.storage.local.set({ readerSettings: { ...cur, ...preset } });
  }
  await globalThis.__mint.toggle();
  const sr = document.querySelector("[data-mint]").shadowRoot;
  if (q.has("scroll")) sr.querySelector(".cr-root").scrollTop = Number(q.get("scroll"));
  if (q.has("popover")) sr.querySelector(".cr-aa").click();
});
