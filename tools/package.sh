#!/bin/sh
# Build the Chrome Web Store upload: dist/mint-<version>.zip
# Contains only what the extension needs at runtime (no tests, tools, docs
# or source artwork).
set -e
cd "$(dirname "$0")/.."
VERSION=$(python3 -I -c 'import json; print(json.load(open("manifest.json"))["version"])')
OUT="dist/mint-$VERSION.zip"
python3 -I tools/check_contrast.py >/dev/null || { echo "contrast check failed"; exit 1; }
mkdir -p dist
rm -f "$OUT"
zip -q -X -r "$OUT" manifest.json src vendor icons/icon16.png icons/icon32.png icons/icon48.png icons/icon128.png \
  -x "*.DS_Store"
echo "built $OUT"
unzip -l "$OUT"
