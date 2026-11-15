"""Build the extension icons (16/32/48/128 px) from the source artwork.

Source: icons/source/hush-icon-original.png (rounded cream square on white).
The white surround is removed by cutting the rounded square out with a clean,
antialiased mask, then the result is box-downsampled to each size.
Pure standard library, no dependencies.  Run:  python3 tools/make_icons.py

Chrome guidance: the 128 px icon is 96 px of artwork with 16 px of
transparent padding; the small toolbar sizes use (almost) the full canvas.
"""
import os
import struct
import zlib

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "..")
SRC = os.path.join(ROOT, "icons", "source", "hush-icon-original.png")

# size -> artwork size inside the canvas
SIZES = {16: 16, 32: 30, 48: 44, 128: 96}


# ------------------------------------------------------------------ PNG I/O

def read_png(path):
    data = open(path, "rb").read()
    assert data[:8] == b"\x89PNG\r\n\x1a\n", "not a PNG"
    pos, idat = 8, b""
    while pos < len(data):
        length, ctype = struct.unpack(">I4s", data[pos:pos + 8])
        body = data[pos + 8:pos + 8 + length]
        if ctype == b"IHDR":
            w, h, depth, color, _, _, interlace = struct.unpack(">IIBBBBB", body)
            assert depth == 8 and color in (2, 6) and interlace == 0, "need 8-bit RGB/RGBA, non-interlaced"
        elif ctype == b"IDAT":
            idat += body
        pos += 12 + length
    bpp = 3 if color == 2 else 4
    raw = zlib.decompress(idat)
    stride = w * bpp
    out = bytearray(h * stride)
    prev = bytearray(stride)
    i = 0
    for y in range(h):
        f = raw[i]; i += 1
        line = bytearray(raw[i:i + stride]); i += stride
        if f == 1:
            for x in range(bpp, stride): line[x] = (line[x] + line[x - bpp]) & 255
        elif f == 2:
            for x in range(stride): line[x] = (line[x] + prev[x]) & 255
        elif f == 3:
            for x in range(stride):
                a = line[x - bpp] if x >= bpp else 0
                line[x] = (line[x] + ((a + prev[x]) >> 1)) & 255
        elif f == 4:
            for x in range(stride):
                a = line[x - bpp] if x >= bpp else 0
                b = prev[x]
                c = prev[x - bpp] if x >= bpp else 0
                p = a + b - c
                pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                pr = a if pa <= pb and pa <= pc else (b if pb <= pc else c)
                line[x] = (line[x] + pr) & 255
        out[y * stride:(y + 1) * stride] = line
        prev = line
    return w, h, bpp, out


def write_png(path, size, rgba):
    rows = b"".join(b"\x00" + bytes(rgba[y * size * 4:(y + 1) * size * 4]) for y in range(size))

    def chunk(t, d):
        c = struct.pack(">I", len(d)) + t + d
        return c + struct.pack(">I", zlib.crc32(t + d) & 0xFFFFFFFF)

    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    with open(path, "wb") as f:
        f.write(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", zlib.compress(rows, 9)) + chunk(b"IEND", b""))


# ------------------------------------------------------------------ processing

def find_tile(w, h, bpp, px):
    """Bounding box of the non-white tile, scanning the middle row/column."""
    def is_bg(x, y):
        i = (y * w + x) * bpp
        return min(px[i], px[i + 1], px[i + 2]) >= 252

    cy, cx = h // 2, w // 2
    left = next(x for x in range(w) if not is_bg(x, cy))
    right = next(x for x in range(w - 1, -1, -1) if not is_bg(x, cy))
    top = next(y for y in range(h) if not is_bg(cx, y))
    bottom = next(y for y in range(h - 1, -1, -1) if not is_bg(cx, y))
    # Corner radius: how far in from the left edge the tile starts on the top row band.
    probe_y = top + 2
    first = next(x for x in range(w) if not is_bg(x, probe_y))
    return left, top, right, bottom, first - left


def render(size, art, w, bpp, px, box):
    left, top, right, bottom, _ = box
    tw, th = right - left + 1, bottom - top + 1
    # Squircle-ish corners like the artwork: radius ~ 22% of the tile.
    radius = 0.22 * art
    inset = 0.012 * tw  # trim a hair so no white fringe from the source edge survives
    sx0, sy0 = left + inset, top + inset
    sw, sh = tw - 2 * inset, th - 2 * inset
    off = (size - art) / 2
    ss = 4  # supersamples per axis for the mask
    out = bytearray(size * size * 4)
    for y in range(size):
        for x in range(size):
            # mask coverage within this output pixel
            cov = 0
            for j in range(ss):
                for i in range(ss):
                    ax = x + (i + 0.5) / ss - off
                    ay = y + (j + 0.5) / ss - off
                    if 0 <= ax <= art and 0 <= ay <= art:
                        cxp = min(max(ax, radius), art - radius)
                        cyp = min(max(ay, radius), art - radius)
                        if (ax - cxp) ** 2 + (ay - cyp) ** 2 <= radius * radius:
                            cov += 1
            if not cov:
                continue
            # box-average the source pixels that map into this output pixel
            u0 = sx0 + (x - off) / art * sw
            u1 = sx0 + (x + 1 - off) / art * sw
            v0 = sy0 + (y - off) / art * sh
            v1 = sy0 + (y + 1 - off) / art * sh
            xs = range(max(int(u0), left), min(max(int(u1), int(u0) + 1), right + 1))
            ys = range(max(int(v0), top), min(max(int(v1), int(v0) + 1), bottom + 1))
            r = g = b = n = 0
            for yy in ys:
                base = yy * w
                for xx in xs:
                    k = (base + xx) * bpp
                    r += px[k]; g += px[k + 1]; b += px[k + 2]; n += 1
            o = (y * size + x) * 4
            out[o:o + 4] = bytes((r // n, g // n, b // n, round(255 * cov / (ss * ss))))
    return out


def main():
    w, h, bpp, px = read_png(SRC)
    box = find_tile(w, h, bpp, px)
    print("tile box (l, t, r, b, corner):", box)
    for size, art in SIZES.items():
        path = os.path.join(ROOT, "icons", f"icon{size}.png")
        write_png(path, size, render(size, art, w, bpp, px, box))
        print("wrote", os.path.relpath(path, ROOT))


if __name__ == "__main__":
    main()
