"""Génère les icônes PNG + image Open Graph (sans dépendance lourde au runtime)."""
from __future__ import annotations

import struct
import zlib
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "frontend" / "static" / "icons"
OUT.mkdir(parents=True, exist_ok=True)

PINK = (236, 72, 153)
WHITE = (255, 255, 255)
BG = (250, 247, 245)
INK = (28, 20, 16)


def _chunk(tag: bytes, data: bytes) -> bytes:
    return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)


def write_png(path: Path, width: int, height: int, pixels: bytes) -> None:
    """pixels = RGB bytes length width*height*3"""
    raw = b"".join(b"\x00" + pixels[y * width * 3 : (y + 1) * width * 3] for y in range(height))
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    png = b"\x89PNG\r\n\x1a\n" + _chunk(b"IHDR", ihdr) + _chunk(b"IDAT", zlib.compress(raw, 9)) + _chunk(b"IEND", b"")
    path.write_bytes(png)
    print("wrote", path, f"{width}x{height}")


def fill_rect(buf: bytearray, w: int, h: int, x0: int, y0: int, x1: int, y1: int, color: tuple[int, int, int]):
    r, g, b = color
    for y in range(max(0, y0), min(h, y1)):
        row = y * w * 3
        for x in range(max(0, x0), min(w, x1)):
            i = row + x * 3
            buf[i], buf[i + 1], buf[i + 2] = r, g, b


def make_icon(size: int, path: Path):
    buf = bytearray(size * size * 3)
    fill_rect(buf, size, size, 0, 0, size, size, PINK)
    # bloc blanc "FP" approximatif (deux barres)
    m = size // 8
    fill_rect(buf, size, size, m * 2, m * 2, m * 3, m * 6, WHITE)
    fill_rect(buf, size, size, m * 2, m * 2, m * 5, m * 3, WHITE)
    fill_rect(buf, size, size, m * 2, m * 4, m * 4, m * 5, WHITE)
    fill_rect(buf, size, size, m * 5, m * 2, m * 6, m * 6, WHITE)
    write_png(path, size, size, bytes(buf))


def make_og():
    w, h = 1200, 630
    buf = bytearray(w * h * 3)
    fill_rect(buf, w, h, 0, 0, w, h, BG)
    fill_rect(buf, w, h, 0, 0, w, int(h * 0.48), PINK)
    # barre décorative
    fill_rect(buf, w, h, 80, 360, 420, 368, PINK)
    fill_rect(buf, w, h, 80, 400, 520, 406, INK)
    write_png(OUT / "og-image.png", w, h, bytes(buf))


if __name__ == "__main__":
    make_icon(32, OUT / "icon-32.png")
    make_icon(180, OUT / "apple-touch-icon.png")
    make_icon(192, OUT / "icon-192.png")
    make_icon(512, OUT / "icon-512.png")
    make_og()
