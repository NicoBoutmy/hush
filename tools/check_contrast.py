"""Check WCAG contrast for every reader theme defined in src/reader/styles.js.

Run: python3 tools/check_contrast.py   (exits non-zero on failure)
Body text must reach 7:1 (AAA); muted text and links 4.5:1 (AA);
the accent (progress bar, focus ring, selection) 3:1 (non-text, AA).
"""
import os, re, sys

CSS = open(os.path.join(os.path.dirname(__file__), "..", "src", "reader", "styles.js")).read()

def theme_block(name):
    if name == "light":
        m = re.search(r"\.cr-root \{\s*(--bg:.*?)\}", CSS, re.S)
    else:
        m = re.search(r'\.cr-root\[data-theme="%s"\] \{(.*?)\}' % name, CSS, re.S)
    return dict(re.findall(r"--([\w-]+):\s*(#[0-9a-fA-F]{6})", m.group(1)))

def lum(h):
    r, g, b = (int(h[i:i + 2], 16) / 255 for i in (1, 3, 5))
    f = lambda c: c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)

def ratio(a, b):
    hi, lo = sorted((lum(a), lum(b)), reverse=True)
    return (hi + 0.05) / (lo + 0.05)

CHECKS = [("text", "bg", 7.0), ("muted", "bg", 4.5), ("link", "bg", 4.5), ("accent", "bg", 3.0),
          ("text", "surface", 7.0), ("muted", "surface", 4.5), ("accent", "surface", 3.0)]

ok = True
for theme in ("light", "sepia", "gray", "dark"):
    t = theme_block(theme)
    parts = []
    for fg, bg, need in CHECKS:
        r = ratio(t[fg], t[bg])
        flag = "" if r >= need else "  <-- FAIL"
        ok &= r >= need
        parts.append(f"{fg}/{bg} {r:5.2f} (≥{need}){flag}")
    print(f"{theme:6}  " + " | ".join(parts))
print("PASS" if ok else "FAIL")
sys.exit(0 if ok else 1)
