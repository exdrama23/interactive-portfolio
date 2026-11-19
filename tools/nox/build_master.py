"""Reconstroi o Nox Master a partir da referencia oficial.

A referencia e um JPEG 1222x1287 que contem a arte nativa ampliada exatamente
13x (1222 = 94 * 13, 1287 = 99 * 13). O script desfaz essa ampliacao lendo a
mediana do centro de cada bloco de 13 px, remove o fundo creme por bloco e
alinha as cores na paleta extraida da propria arte.

Saida em src/components/mascot/nox/assets:
  reference/       copia intacta da referencia e recorte cru para comparacao
  sprites/master/  arte nativa e frame 64x64 com ancora nos pes
  sprites/idle/    quadros de idle (olhos abertos e piscando)
  atlas/           spritesheet usado pelo runtime
  animations/      metadados dos clipes
  nox-palette.json paleta aprovada

Dependencias: Pillow e numpy. Roda uma vez; o site nao depende de Python.

    python tools/nox/build_master.py
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / "src" / "components" / "mascot" / "nox" / "assets"
REFERENCE = ASSETS / "reference" / "nox-master.jpeg"

CELL = 13
ORIGIN = (5, 11)
CROP = (28, 27, 43, 55)

BG = np.array([248, 219, 179], np.float32)
DARK = np.array([
    (30, 25, 20), (35, 29, 23), (40, 33, 27), (48, 39, 32),
    (55, 46, 38), (63, 53, 44), (69, 59, 50),
], np.int32)
PINK = np.array([
    (110, 72, 57), (128, 82, 65), (136, 89, 69), (149, 98, 78),
    (158, 107, 86), (174, 117, 97), (180, 124, 107), (196, 125, 103),
    (213, 141, 117),
], np.int32)
GLINT = np.array([250, 242, 223], np.int32)
PALETTE = np.vstack([DARK, PINK, GLINT[None, :]])

FRAME = (64, 64)
PLACE = (11, 5)
ANCHOR = (32, 60)

EYE_BOXES = ((7, 10, 13, 17), (18, 21, 13, 17))
EYE_FUR = (63, 53, 44)
EYE_LINE = (30, 25, 20)


def hexcolor(rgb) -> str:
    return "#%02x%02x%02x" % tuple(int(v) for v in rgb)


def erode(mask: np.ndarray) -> np.ndarray:
    """Erosao 4-vizinhos: sobra o que nao encosta no fundo."""
    out = mask.copy()
    out[1:, :] &= mask[:-1, :]
    out[:-1, :] &= mask[1:, :]
    out[:, 1:] &= mask[:, :-1]
    out[:, :-1] &= mask[:, 1:]
    out[0, :] = False
    out[-1, :] = False
    out[:, 0] = False
    out[:, -1] = False
    return out


def nearest(color, palette):
    diff = palette.astype(np.float32) - color
    distance = 2 * diff[:, 0] ** 2 + 4 * diff[:, 1] ** 2 + 3 * diff[:, 2] ** 2
    return int(distance.argmin())


def reconstruct(source: Path):
    rgb = np.asarray(Image.open(source).convert("RGB")).astype(np.float32)
    rows = (rgb.shape[0] - ORIGIN[1]) // CELL
    cols = (rgb.shape[1] - ORIGIN[0]) // CELL

    blocks = np.zeros((rows, cols, 3), np.float32)
    for y in range(rows):
        for x in range(cols):
            top = ORIGIN[1] + y * CELL
            left = ORIGIN[0] + x * CELL
            patch = rgb[top + 4:top + CELL - 4, left + 4:left + CELL - 4]
            blocks[y, x] = np.median(patch.reshape(-1, 3), axis=0)

    mask = np.abs(blocks - BG).sum(axis=2) > 45
    edge = mask & ~erode(mask)

    canvas = np.zeros((rows, cols, 4), np.uint8)
    for y in range(rows):
        for x in range(cols):
            if not mask[y, x]:
                continue
            allowed = DARK if edge[y, x] else PALETTE
            color = PALETTE[nearest(blocks[y, x], allowed)]
            canvas[y, x] = (color[0], color[1], color[2], 255)

    luminance = blocks.mean(axis=2)
    glint = mask & (luminance > 235) & (np.abs(blocks - BG).sum(axis=2) < 130)
    canvas[glint] = (*GLINT, 255)

    # recorte cru, sem paleta, para comparacao lado a lado
    raw = np.zeros((rows, cols, 4), np.uint8)
    raw[mask] = np.c_[blocks[mask].round(), np.full(mask.sum(), 255)]

    return canvas, raw, mask


def frame(image: Image.Image) -> Image.Image:
    out = Image.new("RGBA", FRAME, (0, 0, 0, 0))
    out.alpha_composite(image, PLACE)
    return out


def close_eyes(image: Image.Image) -> Image.Image:
    out = image.copy()
    px = out.load()
    for left, right, top, bottom in EYE_BOXES:
        for y in range(top, bottom + 1):
            for x in range(left, right + 1):
                px[x, y] = (*EYE_FUR, 255)
        for x in range(left, right + 1):
            px[x, (top + bottom) // 2] = (*EYE_LINE, 255)
    return out


def write_json(path: Path, data) -> None:
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def main() -> None:
    if not REFERENCE.exists():
        raise SystemExit(f"referencia ausente: {REFERENCE}")

    canvas, raw, mask = reconstruct(REFERENCE)
    native = Image.fromarray(canvas, "RGBA")

    ys, xs = np.where(mask)
    left, top, width, height = int(xs.min()), int(ys.min()), CROP[2], CROP[3]
    if (int(xs.max()) - left + 1, int(ys.max()) - top + 1) != (width, height):
        raise SystemExit("recorte do personagem mudou, revise CROP")

    cat = native.crop((left, top, left + width, top + height))
    raw_cat = Image.fromarray(raw, "RGBA").crop((left, top, left + width, top + height))

    for folder in ("reference", "sprites/master", "atlas", "animations"):
        (ASSETS / folder).mkdir(parents=True, exist_ok=True)

    native.save(ASSETS / "sprites/master/nox-native.png")
    cat.save(ASSETS / "sprites/master/nox-master-43x55.png")
    raw_cat.save(ASSETS / "reference/nox-raw-43x55.png")

    # A arte antiga fica no master como referencia. O clipe idle agora vem do
    # atlas oficial, entao nao sobrescrevemos a pasta do clipe.
    idle0 = frame(cat)
    idle1 = frame(close_eyes(cat))
    master = frame(cat)
    idle0.save(ASSETS / "sprites/master/nox-idle-0.png")
    idle1.save(ASSETS / "sprites/master/nox-idle-1.png")
    master.save(ASSETS / "sprites/master/nox-master-64.png")

    palette = {
        "name": "nox",
        "colors": [hexcolor(c) for c in PALETTE],
        "roles": {
            "fur": [hexcolor(c) for c in DARK],
            "skin": [hexcolor(c) for c in PINK],
            "glint": hexcolor(GLINT),
        },
    }
    write_json(ASSETS / "nox-palette.json", palette)

    # O atlas e o JSON saem do mesmo pipeline dos sprints, lendo as pastas de
    # sprites. Assim rebuildar o master nunca deixa os dois em formatos diferentes.
    from build_atlas import build as build_atlas

    # A arte oficial atual vem do atlas com bordas suaves e muitas cores. A
    # paleta de 17 cores continua valendo so para a arte nativa reconstruida.
    build_atlas(strict_palette=False)

    # verificacoes objetivas do que acabou de ser gerado
    assert native.size == (93, 98), native.size
    assert cat.size == (43, 55), cat.size
    approved = {tuple(int(v) for v in color) for color in PALETTE}
    for name in ("nox-idle-0", "nox-idle-1"):
        image = Image.open(ASSETS / f"sprites/master/{name}.png").convert("RGBA")
        assert image.size == FRAME
        pixels = np.asarray(image)
        alpha = pixels[:, :, 3]
        assert set(np.unique(alpha)) <= {0, 255}, f"{name} tem alpha parcial"
        opaque = pixels[alpha > 0][:, :3]
        outside = {tuple(int(v) for v in color) for color in np.unique(opaque, axis=0)} - approved
        assert not outside, f"{name} saiu da paleta: {sorted(outside)[:3]}"
        ys2, xs2 = np.where(alpha > 0)
        assert (int(xs2.min()), int(xs2.max())) == (11, 53), (name, xs2.min(), xs2.max())
        assert int(ys2.max()) == 59, (name, ys2.max())

    clean_alpha = np.asarray(cat)[:, :, 3] > 0
    raw_alpha = np.asarray(raw_cat)[:, :, 3] > 0
    assert (clean_alpha == raw_alpha).all(), "a silhueta mudou entre cru e limpo"

    print("nox master:", native.size)
    print("personagem:", cat.size, "em", (PLACE[0], PLACE[1]))
    print("ancora:", ANCHOR)
    print("cores da paleta:", len(PALETTE))


if __name__ == "__main__":
    main()
