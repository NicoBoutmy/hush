"""Draw a simple flat bookshelf illustration for the test/screenshot fixture."""
import os, random, struct, zlib

W, H = 1200, 640
random.seed(7)
BG = (232, 226, 214)
SHELF = (122, 92, 64)
PALETTE = [(70, 92, 110), (164, 84, 62), (196, 160, 92), (92, 120, 96), (60, 60, 66),
           (176, 128, 112), (120, 104, 140), (210, 196, 170), (48, 72, 92), (150, 60, 52)]
px = bytearray(BG * (W * H))

def rect(x0, y0, x1, y1, c):
    for y in range(max(0, y0), min(H, y1)):
        row = y * W
        for x in range(max(0, x0), min(W, x1)):
            i = (row + x) * 3
            px[i:i + 3] = bytes(c)

for base in (300, 600):
    rect(40, base, W - 40, base + 22, SHELF)
    x = 70
    while x < W - 110:
        w = random.randint(26, 54); h = random.randint(170, 250)
        if random.random() < 0.08:
            x += random.randint(30, 70); continue
        c = random.choice(PALETTE)
        rect(x, base - h, x + w, base, c)
        band = tuple(max(0, v - 28) for v in c)
        rect(x, base - h + 24, x + w, base - h + 32, band)
        rect(x, base - 40, x + w, base - 34, band)
        x += w + random.randint(2, 6)

raw = b"".join(b"\x00" + bytes(px[y * W * 3:(y + 1) * W * 3]) for y in range(H))
def chunk(t, d):
    c = struct.pack(">I", len(d)) + t + d
    return c + struct.pack(">I", zlib.crc32(t + d) & 0xFFFFFFFF)
out = os.path.join(os.path.dirname(__file__), "..", "test", "img", "shelf.png")
with open(out, "wb") as f:
    f.write(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", W, H, 8, 2, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b""))
print("wrote test/img/shelf.png")
