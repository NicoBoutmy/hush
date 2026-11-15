# Hush

A minimal, private reader view for Chrome and other Chromium-based browsers, such as Edge, Brave, Dia, Arc, Vivaldi and Opera (Manifest V3). One job: turn a cluttered article page into a clean, readable view.

- No account, no sync, no analytics, no network requests.
- Permissions: `activeTab`, `scripting`, `storage`. No host permissions.
- Article extraction: Mozilla Readability 0.6.0, vendored unmodified (see `vendor/README.md`).

## Browser support

Hush uses only standard Chromium extension APIs and nothing specific to one browser, so it should work in any Chromium-based browser built on Chromium 110 or later.

Installing from the Chrome Web Store:

- **Chrome, Brave, Dia, Arc, Vivaldi:** install directly from the Chrome Web Store.
- **Edge:** on the Chrome Web Store page, click **Allow extensions from other stores** when Edge asks, then install.
- **Opera:** add Opera's **Install Chrome Extensions** add-on first, then install from the Chrome Web Store.

## Load it from source

1. Open `chrome://extensions`.
2. Turn on **Developer mode**.
3. Click **Load unpacked** and select this folder.
4. Optional: pin the extension from the extensions menu.

After editing files, click the reload icon on the extension's card, then reload any tab you're testing.

## Use it

- Click the toolbar icon, or press **Alt+Shift+R** (Option+Shift+R on a Mac), to open or close reader view.
- Press **Esc** or click × to close. The page returns to where you were.
- Click **Aa** (top right) for text size, theme, font, column width and line spacing. Changes apply instantly and are remembered.
- To change the shortcut, open the extension's **Options** page → **Change shortcut**.

Reader view can't run on the browser's own pages (`chrome://`, `edge://`, `brave://` and so on), extension stores such as the Chrome Web Store, or the built-in PDF viewer, because the browser blocks extensions there. The icon briefly shows "–" instead.

## Project layout

```
manifest.json
src/background.js        icon/shortcut → inject the reader into the active tab, or toggle it
src/reader/settings.js   defaults, allowed values, chrome.storage.local
src/reader/sanitize.js   cleans Readability's HTML before display
src/reader/styles.js     reader CSS (shadow DOM), four themes
src/reader/reader.js     overlay, Aa popover, progress bar, keyboard handling
src/options/             options page (shortcut info + link)
vendor/                  Mozilla Readability (Apache-2.0)
icons/                   16/32/48/128 icons, built from icons/source/ by tools/make_icons.py
tools/check_contrast.py  WCAG contrast check for every theme
test/                    fixture pages for testing without installing the extension
store/                   listing copy, privacy policy, screenshot guide, promo tile
tools/package.sh         builds dist/hush-<version>.zip for the Chrome Web Store
```

## Testing without installing

```bash
python3 -m http.server 8765 --bind 127.0.0.1
```

Then open http://127.0.0.1:8765/test/fixture-article.html (or `fixture-nonarticle.html`) and press Alt+Shift+R. `test/shim.js` fakes `chrome.storage` with `localStorage`. It is not part of the extension.

```bash
python3 tools/check_contrast.py
```

## License

Hush is released under the [MIT License](LICENSE).

`vendor/Readability.js` is Copyright (c) 2010 Arc90 Inc and is licensed under the Apache License 2.0. See [vendor/LICENSE.md](vendor/LICENSE.md).
