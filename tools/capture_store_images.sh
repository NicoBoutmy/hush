#!/bin/sh
# Capture the Chrome Web Store screenshots (1280x800) and the small promo tile
# (440x280) into store/assets/ with headless Chrome, at device pixel ratio 1.
# Needs the fixture server running:  python3 -m http.server 8765 --bind 127.0.0.1
# Set CHROME to use a different Chromium binary.
set -e
cd "$(dirname "$0")/.."
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
BASE="http://127.0.0.1:8765"
OUT="store/assets"

shot() { # file width height url
  profile=$(mktemp -d)  # fresh profile so saved reader settings never leak between shots
  "$CHROME" --headless --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
    --user-data-dir="$profile" --no-first-run --virtual-time-budget=4000 \
    --window-size="$2,$3" --screenshot="$OUT/$1" "$4" >/dev/null 2>&1
  rm -rf "$profile"
  echo "$1: $(sips -g pixelWidth -g pixelHeight "$OUT/$1" | awk '/pixel/ {printf "%s ", $2}')"
}

A="$BASE/test/fixture-article.html?reader=1"
shot screenshot-1.png          1280 800 "$A&theme=light&font=georgia&size=20&width=medium&spacing=normal"
shot screenshot-2-controls.png 1280 800 "$A&theme=light&font=charter&size=20&width=medium&spacing=normal&popover=1"
shot screenshot-3-dark.png     1280 800 "$A&theme=dark&font=system&size=20&width=medium&spacing=normal&scroll=620"
shot screenshot-4-sepia.png    1280 800 "$A&theme=sepia&font=charter&size=22&width=medium&spacing=normal&scroll=1500"
shot screenshot-5-not-article.png 1280 800 "$BASE/test/fixture-nonarticle.html?reader=1&theme=light"
shot promo-small-440x280.png   440 280 "$BASE/store/promo-small.html"
