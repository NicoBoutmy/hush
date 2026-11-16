# Making the store images

The store needs at least one screenshot (1280×800) and a small promo tile (440×280). They are captured from the fixture pages, which use original placeholder text, so there's no third-party content in the images.

## Scripted (recommended)

```bash
python3 -m http.server 8765 --bind 127.0.0.1
```

Then, in a second terminal:

```bash
sh tools/capture_store_images.sh
```

This runs headless Chrome at device pixel ratio 1, with a fresh profile per shot, and writes every image into `store/assets/`, printing each file's size. Set `CHROME=/path/to/chrome` to use another Chromium binary.

## By hand in Chrome

1. Open one of the URLs below in Chrome.
2. Open DevTools (Cmd+Option+I) and turn on the device toolbar (Cmd+Shift+M).
3. Choose **Responsive**, set the size to **1280 × 800**, and set DPR to **1** (in the ⋮ menu of the device toolbar, enable "Add device pixel ratio" first).
4. ⋮ menu of the device toolbar → **Capture screenshot**. Save it into `store/assets/`.

The query string presets the reader (`test/shim.js` reads it; it isn't part of the extension). Reload after changing it.

| File | URL |
|---|---|
| `screenshot-1.png` | http://127.0.0.1:8765/test/fixture-article.html?reader=1&theme=light&font=georgia&size=20&width=medium&spacing=normal |
| `screenshot-2-controls.png` | http://127.0.0.1:8765/test/fixture-article.html?reader=1&theme=light&font=charter&size=20&width=medium&spacing=normal&popover=1 |
| `screenshot-3-dark.png` | http://127.0.0.1:8765/test/fixture-article.html?reader=1&theme=dark&font=system&size=20&width=medium&spacing=normal&scroll=620 |
| `screenshot-4-sepia.png` | http://127.0.0.1:8765/test/fixture-article.html?reader=1&theme=sepia&font=charter&size=22&width=medium&spacing=normal&scroll=1500 |
| `screenshot-5-not-article.png` | http://127.0.0.1:8765/test/fixture-nonarticle.html?reader=1&theme=light |

Promo tile: open http://127.0.0.1:8765/store/promo-small.html with the device toolbar at **440 × 280**, DPR 1, and capture it as `promo-small-440x280.png`. It uses `icons/icon128.png` and `store/wordmark.png` (the wordmark cut from `icons/source/mint-identity.png`).

Tip: the store crops nothing, so check each capture is exactly 1280×800 (or 440×280) before uploading.
