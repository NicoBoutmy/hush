// Hush: styles for the reader view, injected into its shadow root.
// Kept as a string so no extension file has to be exposed to web pages
// (no web_accessible_resources). Contrast of each theme is checked by
// tools/check_contrast.py.
(() => {
  const NS = (globalThis.__hushNS = globalThis.__hushNS || {});

  NS.styles = String.raw`
:host { all: initial; }

/* ---------- Themes ---------- */
.cr-root {
  --bg: #ffffff; --surface: #ffffff; --text: #1d1d1f; --muted: #5c5c61;
  --link: #0b57d0; --accent: #0b57d0; --border: rgba(0,0,0,.12);
  --control: rgba(0,0,0,.05); --control-hover: rgba(0,0,0,.09);
  --shadow: 0 8px 28px rgba(0,0,0,.16), 0 1px 3px rgba(0,0,0,.12);
  --code-bg: rgba(0,0,0,.05); --seg-on: #ffffff;
}
.cr-root[data-theme="sepia"] {
  --bg: #f8f1e3; --surface: #fbf6ec; --text: #3b2f23; --muted: #6b5843;
  --link: #8a4a0b; --accent: #8a4a0b; --border: rgba(59,47,35,.16);
  --control: rgba(59,47,35,.06); --control-hover: rgba(59,47,35,.11);
  --code-bg: rgba(59,47,35,.07); --seg-on: #fffdf8;
}
.cr-root[data-theme="gray"] {
  --bg: #4a4a4d; --surface: #505054; --text: #f2f2f2; --muted: #d0d0d4;
  --link: #b9d4ff; --accent: #b9d4ff; --border: rgba(255,255,255,.16);
  --control: rgba(255,255,255,.08); --control-hover: rgba(255,255,255,.14);
  --shadow: 0 8px 28px rgba(0,0,0,.35), 0 1px 3px rgba(0,0,0,.3);
  --code-bg: rgba(255,255,255,.08); --seg-on: rgba(255,255,255,.24);
}
.cr-root[data-theme="dark"] {
  --bg: #161618; --surface: #232326; --text: #dcdcde; --muted: #a3a3a9;
  --link: #8ab4f8; --accent: #8ab4f8; --border: rgba(255,255,255,.12);
  --control: rgba(255,255,255,.07); --control-hover: rgba(255,255,255,.12);
  --shadow: 0 8px 28px rgba(0,0,0,.5), 0 1px 3px rgba(0,0,0,.4);
  --code-bg: rgba(255,255,255,.07); --seg-on: rgba(255,255,255,.2);
}

/* ---------- Frame ---------- */
.cr-root {
  position: fixed; inset: 0;
  overflow-y: auto; overflow-x: hidden;
  background: var(--bg); color: var(--text);
  color-scheme: light;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  outline: none;
}
.cr-root[data-theme="gray"], .cr-root[data-theme="dark"] { color-scheme: dark; }
.cr-root *, .cr-root *::before, .cr-root *::after { box-sizing: border-box; }

.cr-progress {
  position: fixed; top: 0; left: 0; right: 0; height: 3px; z-index: 3;
  background: var(--accent);
  transform-origin: 0 50%; transform: scaleX(0);
  pointer-events: none;
}

/* ---------- Top-right controls ---------- */
.cr-toolbar {
  position: fixed; top: 14px; right: 18px; z-index: 4;
  display: flex; gap: 8px;
}
.cr-btn {
  appearance: none; border: 1px solid var(--border); margin: 0;
  background: var(--surface); color: var(--text);
  font: 500 15px/1 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  border-radius: 8px; cursor: pointer;
}
.cr-btn:hover { background: color-mix(in srgb, var(--surface), var(--text) 8%); }
.cr-icon-btn {
  width: 34px; height: 34px; padding: 0;
  display: inline-flex; align-items: center; justify-content: center;
}
.cr-aa { font-size: 15px; letter-spacing: -.02em; }
.cr-aa .cr-aa-small { font-size: 11px; }
.cr-aa[aria-expanded="true"] { background: var(--control-hover); }

:focus { outline: none; }
:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

/* ---------- Popover ---------- */
.cr-popover {
  position: fixed; top: 56px; right: 18px; z-index: 5;
  width: 264px; max-height: calc(100vh - 72px); overflow-y: auto;
  padding: 10px;
  background: var(--surface); color: var(--text);
  border: 1px solid var(--border); border-radius: 12px;
  box-shadow: var(--shadow);
  font: 14px/1.3 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
}
.cr-popover[hidden] { display: none; }
.cr-section + .cr-section { margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--border); }

.cr-size-row { display: flex; gap: 6px; }
.cr-size-row .cr-ctl {
  flex: 1; height: 38px;
  font-family: Georgia, "Times New Roman", serif;
}
.cr-size-dec { font-size: 14px; }
.cr-size-inc { font-size: 22px; }

.cr-ctl {
  appearance: none; margin: 0; border: 0; cursor: pointer;
  background: var(--control); color: var(--text);
  border-radius: 8px;
  display: inline-flex; align-items: center; justify-content: center;
}
.cr-ctl:hover:not(:disabled) { background: var(--control-hover); }
.cr-ctl:disabled { opacity: .4; cursor: default; }

.cr-themes { display: flex; justify-content: space-between; padding: 2px 8px; }
.cr-swatch {
  appearance: none; margin: 0; cursor: pointer;
  width: 36px; height: 36px; border-radius: 50%;
  border: 1px solid rgba(128,128,128,.55);
  position: relative;
}
.cr-swatch[aria-checked="true"] { box-shadow: 0 0 0 2px var(--surface), 0 0 0 4px var(--accent); }
.cr-swatch[data-value="light"] { background: #ffffff; }
.cr-swatch[data-value="sepia"] { background: #f8f1e3; }
.cr-swatch[data-value="gray"]  { background: #4a4a4d; }
.cr-swatch[data-value="dark"]  { background: #161618; }
.cr-swatch:focus-visible { outline-offset: 5px; }

.cr-fonts { display: flex; flex-direction: column; gap: 2px; }
.cr-font {
  appearance: none; margin: 0; border: 0; cursor: pointer;
  background: transparent; color: var(--text);
  display: flex; align-items: center; justify-content: space-between;
  height: 34px; padding: 0 10px; border-radius: 8px;
  font-size: 16px; text-align: left;
}
.cr-font:hover { background: var(--control); }
.cr-font .cr-check { visibility: hidden; color: var(--accent); }
.cr-font[aria-checked="true"] .cr-check { visibility: visible; }
.cr-font:focus-visible { outline-offset: -2px; }

.cr-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.cr-row + .cr-row { margin-top: 8px; }
.cr-row-label { color: var(--muted); font-size: 13px; }
.cr-seg { display: inline-flex; gap: 2px; padding: 2px; background: var(--control); border-radius: 8px; }
.cr-seg .cr-ctl { width: 44px; height: 28px; background: transparent; border-radius: 6px; color: var(--muted); }
.cr-seg .cr-ctl:hover { background: var(--control-hover); }
.cr-seg .cr-ctl[aria-checked="true"] { background: var(--seg-on); color: var(--text); box-shadow: 0 1px 2px rgba(0,0,0,.18); }
.cr-seg svg { display: block; }

.cr-visually-hidden {
  position: absolute !important; width: 1px; height: 1px; overflow: hidden;
  clip: rect(0 0 0 0); white-space: nowrap;
}

/* ---------- Article ---------- */
.cr-article {
  --font: Georgia, "Times New Roman", serif;
  --size: 20px; --leading: 1.65; --measure: 68ch;
  max-width: var(--measure);
  margin: 0 auto;
  padding: 80px 24px 120px;
  font-family: var(--font);
  font-size: var(--size);
  line-height: var(--leading);
  overflow-wrap: break-word;
  hyphens: auto;
}
.cr-header { margin-bottom: 2em; }
.cr-title {
  font-size: 1.75em; line-height: 1.2; font-weight: 700;
  margin: 0 0 .5em; letter-spacing: -.01em;
  text-wrap: balance;
}
.cr-meta { color: var(--muted); font-size: .8em; line-height: 1.5; margin: 0; }
.cr-meta + .cr-meta { margin-top: .15em; }

.cr-content > :first-child { margin-top: 0; }
.cr-content p, .cr-content ul, .cr-content ol, .cr-content dl,
.cr-content blockquote, .cr-content pre, .cr-content table, .cr-content figure {
  margin: 0 0 1.1em;
}
.cr-content h1, .cr-content h2, .cr-content h3,
.cr-content h4, .cr-content h5, .cr-content h6 {
  line-height: 1.25; margin: 1.8em 0 .6em; font-weight: 700;
}
.cr-content h1 { font-size: 1.45em; }
.cr-content h2 { font-size: 1.3em; }
.cr-content h3 { font-size: 1.15em; }
.cr-content h4, .cr-content h5, .cr-content h6 { font-size: 1em; }
.cr-content a { color: var(--link); text-decoration-thickness: 1px; text-underline-offset: .15em; }
.cr-content a:hover { text-decoration-thickness: 2px; }
.cr-content ul, .cr-content ol { padding-left: 1.4em; }
.cr-content li + li { margin-top: .3em; }
.cr-content blockquote {
  margin-left: 0; padding-left: 1em;
  border-left: 3px solid var(--border); color: var(--text); font-style: italic;
}
.cr-content img, .cr-content svg, .cr-content picture {
  display: block; max-width: 100%; height: auto; margin: 0 auto; border-radius: 2px;
}
.cr-content p img { display: inline-block; vertical-align: middle; }
.cr-content figure { margin-left: 0; margin-right: 0; }
.cr-content figcaption, .cr-content caption {
  color: var(--muted); font-size: .8em; line-height: 1.45; margin-top: .6em; text-align: left;
}
.cr-content hr { border: 0; border-top: 1px solid var(--border); margin: 2em 0; }
.cr-content pre, .cr-content code, .cr-content kbd, .cr-content samp {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: .85em;
}
.cr-content code { background: var(--code-bg); padding: .1em .3em; border-radius: 4px; }
.cr-content pre {
  background: var(--code-bg); padding: .9em 1em; border-radius: 6px;
  overflow-x: auto; line-height: 1.5; hyphens: none;
}
.cr-content pre code { background: none; padding: 0; font-size: 1em; }
.cr-content table { display: block; overflow-x: auto; border-collapse: collapse; font-size: .9em; }
.cr-content th, .cr-content td { border: 1px solid var(--border); padding: .4em .6em; text-align: left; }
.cr-content sup, .cr-content sub { line-height: 0; }

/* ---------- Not-an-article message ---------- */
.cr-empty {
  min-height: 100vh; display: flex; align-items: center; justify-content: center;
  padding: 24px; text-align: center;
}
.cr-empty-inner { max-width: 26em; font: 17px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
.cr-empty h1 { font-size: 22px; margin: 0 0 .4em; }
.cr-empty p { color: var(--muted); margin: 0 0 1.4em; }
.cr-empty .cr-btn { padding: 10px 18px; }

@media (max-width: 560px) {
  .cr-article { padding: 64px 18px 96px; }
  .cr-popover { right: 10px; left: 10px; width: auto; }
}
@media (prefers-reduced-motion: no-preference) {
  .cr-ctl, .cr-font, .cr-btn { transition: background-color .12s ease; }
}
`;
})();
