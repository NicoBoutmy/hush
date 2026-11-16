# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

MINT ("Make It Nice to Read", formerly Hush) is a Manifest V3 reader-view extension for Chromium browsers (min Chromium 110). Plain JavaScript: no build step, no npm, no dependencies apart from the vendored Readability.

## Commands

```bash
python3 -m http.server 8765 --bind 127.0.0.1   # then open http://127.0.0.1:8765/test/fixture-article.html, press Alt+Shift+R
python3 tools/check_contrast.py                 # WCAG check of every theme in styles.js; exits non-zero on failure
sh tools/package.sh                             # runs the contrast check, then builds dist/mint-<version>.zip
sh tools/capture_store_images.sh                # store screenshots and promo tile via headless Chrome (needs the server above)
shasum -a 256 vendor/Readability.js             # must match the hash in vendor/README.md
```

There is no automated test suite. The fixture pages (`test/fixture-article.html`, `test/fixture-nonarticle.html`) load the reader scripts directly, with `test/shim.js` standing in for `chrome.storage` (via localStorage). The shim also forces shadow roots open, and it accepts URL params that preset state for screenshots: `?reader=1&theme=dark&font=charter&size=22&width=wide&spacing=loose&popover=1&scroll=400`.

To test the real extension: load it unpacked from `chrome://extensions`, click reload on the extension's card after edits, then reload the tab.

## Architecture

- **No content scripts, no host permissions.** `src/background.js` handles the toolbar icon and the shortcut (`_execute_action`, which grants `activeTab`). It probes the tab for `globalThis.__mint`, injects `READER_FILES` if that is missing, then calls `__mint.toggle()`. If injection fails (chrome:// pages, the Web Store, the PDF viewer), it shows a "–" badge for 2 seconds.
- **Injection order matters.** `vendor/Readability.js` → `settings.js` → `sanitize.js` → `styles.js` → `reader.js`. The modules are IIFEs that register on a shared namespace, `globalThis.__mintNS` (`NS.settings`, `NS.sanitize`, `NS.styles`), and `reader.js` consumes them. If you add a reader file, update **both** `READER_FILES` in `background.js` **and** the `<script>` tags in both test fixtures.
- **Extraction** (`reader.js`): it clones the document, promotes lazy-loaded image attributes, runs Readability, and rejects anything under 150 words (CJK-aware count). The output is then passed through `sanitize.js`, which parses it in an inert DOMParser document and strips scripts, forms, embeds, event handlers, `style`/`class` and unsafe URLs before display.
- **Rendering**: the overlay lives in a closed shadow root on a `[data-mint]` host element. The CSS is a JS string in `styles.js`, deliberately, so that there are no `web_accessible_resources`. Themes are CSS custom-property blocks on `.cr-root[data-theme=…]`, and `check_contrast.py` parses these with regexes, so keep that format (6-digit hex values, same selector shape).
- **Settings** (`settings.js`): `chrome.storage.local` under the key `readerSettings`. Every read goes through `validate()` against the allowed-value lists, and saves are debounced. Adding an option means adding it to those lists, to `DEFAULTS` and to `validate()`.

## Constraints to preserve

- Privacy promise (README, `store/PRIVACY.md`, store listing): no network requests, no analytics, no sync, and permissions limited to `activeTab`, `scripting` and `storage`. Fonts are system stacks only, because web fonts would mean network requests. Any change to permissions or data handling must also update `store/PRIVACY.md` and `store/STORE_LISTING.md`.
- `vendor/Readability.js` is vendored **unmodified** (0.6.0). Don't edit it. Upgrades replace the file and update the version and hashes in `vendor/README.md`.
- Body text must reach a 7:1 contrast ratio, muted text and links 4.5:1, and the accent 3:1, in every theme. `package.sh` refuses to build if they don't.
- The version lives only in `manifest.json`. The packaged zip contains only `manifest.json`, `src/`, `vendor/` and the four icon PNGs. Icons are generated from `icons/source/` by `tools/make_icons.py`.
