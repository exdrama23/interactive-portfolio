"""Extrai os clipes do novo contact sheet do Nox (arte refeita pelo Gemini).

O sheet novo nao tem alpha: o fundo e preto solido, com rotulos brancos acima
de cada grupo. Este script:

1. remove o fundo por flood fill dos componentes near-black conectados as
   bordas, sem tocar no pelo escuro do gato;
2. apaga os rotulos brancos por componente de texto, sem usar faixa fixa que
   pudesse cortar coracoes ou efeitos;
3. separa os quadros de cada grupo por projecao de alpha, dividindo as faixas
   que contem dois ou tres quadros encostados;
4. recorta cada quadro preservando o alpha real, sem redimensionar, interpolar
   ou reduzir paleta;
5. monta um canvas comum de 256x256 com a linha dos pes em y=240. Clipes
   aereos usam 256x320 e preservam a altura relativa entre os quadros.

O clipe de celebracao fica de fora de proposito: a arte sera refeita.

    python tools/nox/import_gemini.py --check
    python tools/nox/import_gemini.py
    python tools/nox/import_gemini.py --annotate  # salva a grade em PNG

Nao altera a imagem de origem. Dependencias: Pillow, numpy e scipy.
"""

from __future__ import annotations

import argparse
import shutil
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[2]
SOURCE = (
    ROOT
    / "src"
    / "assets"
    / "img"
    / "logos"
    / "Gemini_Generated_Image_qzei37qzei37qzei.jpeg"
)
SPRITES = ROOT / "src" / "components" / "mascot" / "nox" / "assets" / "sprites"

CANVAS_W = 216
GROUND_H = 216
GROUND_BASELINE = 204  # linha da ancora; o ultimo pixel do pe fica em 203
AIR_H = 280
AIR_BASELINE = 268
MARGIN = 6
CONTENT_ALPHA = 8
MIN_BAND = 25
GAP = 12
SPLIT_WIDTH = 220

BACKGROUND_LUMA = 12


@dataclass
class Frame:
    x0: int
    x1: int
    y0: int
    y1: int


@dataclass
class Row:
    y0: int
    y1: int
    label_y: int
    clips: list[str]
    limits: list[int]


# O sheet tem 7 faixas. A ultima usa 4 grupos e os quadros atravessam a coluna
# de 1896, entao os limites sao proprios.
ROWS = [
    Row(60, 260, 31, ["idle", "walk", "run"], [0, 862, 1690, 2528]),
    Row(330, 525, 290, ["sit", "sleep", "wake"], [0, 862, 1690, 2528]),
    Row(540, 780, 550, ["jump", "fall", "land"], [0, 862, 1690, 2528]),
    Row(790, 1010, 800, ["happy", "angry", "scared"], [0, 862, 1690, 2528]),
    Row(1012, 1240, 1040, ["pet", "held", "dragged"], [0, 862, 1690, 2528]),
    Row(1245, 1480, 1250, ["celebrate", "scratch", "yawn"], [0, 862, 1690, 2528]),
    Row(1480, 1684, 1490, ["meow", "stretch", "lookAround", "tailFlick"], [0, 660, 1280, 1965, 2528]),
]

EXPECTED = {
    "idle": 5,
    "walk": 5,
    "run": 5,
    "sit": 5,
    "sleep": 4,
    "wake": 5,
    "jump": 5,
    "fall": 5,
    "land": 5,
    "happy": 5,
    "angry": 5,
    "scared": 5,
    "pet": 5,
    "held": 5,
    "dragged": 5,
    "celebrate": 5,
    "scratch": 5,
    "yawn": 5,
    "meow": 4,
    "stretch": 3,
    "lookAround": 4,
    "tailFlick": 3,
}

AIR = {"jump", "fall", "land"}
SKIP = {"celebrate"}


def load_rgba() -> np.ndarray:
    """Converte o JPEG em RGBA com o fundo preto conectado as bordas removido."""
    image = Image.open(SOURCE).convert("RGB")
    pixels = np.asarray(image).astype(np.int16)
    luma = pixels.mean(axis=2)

    background = luma <= BACKGROUND_LUMA
    labels, _ = ndimage.label(background)
    edge = set(labels[0, :]) | set(labels[-1, :]) | set(labels[:, 0]) | set(labels[:, -1])
    edge.discard(0)
    alpha = np.where(np.isin(labels, list(edge)), 0, 255).astype(np.uint8)
    return np.dstack([pixels.astype(np.uint8), alpha])


def mask_labels(rgba: np.ndarray, row: Row, x0: int, x1: int) -> None:
    """Apaga os rotulos brancos e a sombra cinza no topo do grupo.

    Os rotulos sao texto branco com uma sombra cinza neutra. Coracoes sao
    vermelhos e o pelo tem tom quente, entao a selecao por cor (branco ou cinza
    neutro) nao atinge a arte. A caixa e limitada a faixa do rotulo para nao
    encostar nos quadros.
    """
    rgb = rgba[:, :, :3].astype(np.int16)
    red, green, blue = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    spread = np.maximum(np.maximum(red, green), blue) - np.minimum(
        np.minimum(red, green), blue
    )
    luma = rgb.mean(axis=2)

    white = (
        (red > 170)
        & (green > 170)
        & (blue > 170)
        & (np.abs(red - green) < 30)
        & (np.abs(green - blue) < 30)
    )
    neutral = (spread <= 20) & (luma <= 210)

    components, _ = ndimage.label(white)
    objects = ndimage.find_objects(components)
    y0 = max(0, row.label_y - 10)
    y1 = min(rgba.shape[0], row.label_y + 32)

    letters: list[tuple[int, int, int, int]] = []
    for index, box in enumerate(objects, 1):
        if box is None:
            continue
        ys, xs = box
        height = ys.stop - ys.start
        width = xs.stop - xs.start
        area = int((components[box] == index).sum())
        if not (y0 <= ys.start <= y1):
            continue
        if xs.stop <= x0 or xs.start >= x1:
            continue
        if not (8 <= height <= 30 and 3 <= width <= 40 and area >= 15):
            continue
        letters.append((ys.start, ys.stop, xs.start, xs.stop))

    if not letters:
        return

    top = min(item[0] for item in letters)
    bottom = max(item[1] for item in letters)
    left = min(item[2] for item in letters)
    right = max(item[3] for item in letters)

    # A sombra de alguns rotulos e maior que o texto e vira uma componente
    # propria. Ela e cinza neutra, mas nao e o fundo preto, entao entra na caixa.
    shadow_mask = (spread <= 20) & (luma > BACKGROUND_LUMA) & (luma <= 90)
    shadows, _ = ndimage.label(shadow_mask)
    for index, box in enumerate(ndimage.find_objects(shadows), 1):
        if box is None:
            continue
        ys, xs = box
        height = ys.stop - ys.start
        width = xs.stop - xs.start
        area = int((shadows[box] == index).sum())
        if area < 20 or height > 60:
            continue
        if not (row.label_y - 24 <= ys.start <= row.label_y + 34):
            continue
        if xs.stop <= left or xs.start >= right:
            continue
        top = min(top, ys.start)
        bottom = max(bottom, ys.stop)
        left = min(left, xs.start)
        right = max(right, xs.stop)

    pad = 4
    top = max(0, top - pad)
    bottom = min(rgba.shape[0], bottom + pad)
    left = max(0, left - pad)
    right = min(rgba.shape[1], right + pad)

    box = (slice(top, bottom), slice(left, right))
    remove = (neutral | white)[box]
    alpha = rgba[box][:, :, 3]
    alpha[remove] = 0


def column_bands(mask: np.ndarray) -> list[tuple[int, int]]:
    columns = mask.sum(axis=0)
    raw: list[tuple[int, int]] = []
    start = None
    for x, value in enumerate(columns):
        if value > 1 and start is None:
            start = x
        elif value <= 1 and start is not None:
            raw.append((start, x - 1))
            start = None
    if start is not None:
        raw.append((start, len(columns) - 1))

    merged: list[list[int]] = []
    for band in raw:
        if merged and band[0] - merged[-1][1] <= GAP:
            merged[-1][1] = band[1]
        else:
            merged.append([band[0], band[1]])
    return [tuple(band) for band in merged if band[1] - band[0] + 1 >= MIN_BAND]


def split_band(mask: np.ndarray, band: tuple[int, int], parts: int) -> list[tuple[int, int]]:
    """Divide uma faixa larga nos pontos de menor projecao vertical."""
    if parts <= 1:
        return [band]

    x0, x1 = band
    width = x1 - x0 + 1
    projection = mask[:, x0:x1 + 1].sum(axis=0).astype(float)
    kernel = np.ones(5) / 5
    smooth = np.convolve(projection, kernel, mode="same")

    margin = min(60, width // 4)
    candidates = list(range(margin, width - margin))
    if not candidates:
        return [band]

    # ponto de menor projecao no meio; repete no lado maior
    split = min(candidates, key=lambda index: smooth[index])
    left = (x0, x0 + split - 1)
    right = (x0 + split + 1, x1)
    left_parts = max(1, round(parts * (split / width)))
    right_parts = max(1, parts - left_parts)
    return split_band(mask, left, left_parts) + split_band(mask, right, right_parts)


def content_box(rgba: np.ndarray, x0: int, x1: int, y0: int, y1: int) -> Frame:
    alpha = rgba[y0:y1, x0:x1, 3]
    ys, xs = np.where(alpha >= CONTENT_ALPHA)
    if xs.size == 0:
        raise SystemExit(f"quadro vazio em x={x0}-{x1} y={y0}-{y1}")
    return Frame(
        x0=x0 + int(xs.min()),
        x1=x0 + int(xs.max()),
        y0=y0 + int(ys.min()),
        y1=y0 + int(ys.max()),
    )


def detect(rgba: np.ndarray) -> dict[str, list[Frame]]:
    found: dict[str, list[Frame]] = {}

    for row in ROWS:
        alpha = rgba[:, :, 3]
        for column, clip in enumerate(row.clips):
            x0, x1 = row.limits[column], row.limits[column + 1]
            mask = alpha[row.y0:row.y1, x0:x1] > 0
            bands = column_bands(mask)

            expected = EXPECTED[clip]
            if len(bands) < expected:
                # faixas encostadas: divide as mais largas ate bater a contagem
                while len(bands) < expected:
                    widest = max(range(len(bands)), key=lambda i: bands[i][1] - bands[i][0])
                    parts = 2
                    replacement = split_band(mask, bands[widest], parts)
                    if len(replacement) < 2:
                        break
                    bands[widest:widest + 1] = replacement

            found[clip] = [
                content_box(rgba, x0 + start, x0 + end + 1, row.y0, row.y1)
                for start, end in bands
            ]
    return found


def write_clip(rgba: np.ndarray, clip: str, frames: list[Frame]) -> int:
    air = clip in AIR
    canvas_width = CANVAS_W
    canvas_height = AIR_H if air else GROUND_H
    baseline = AIR_BASELINE if air else GROUND_BASELINE
    reference_bottom = max(frame.y1 for frame in frames)
    folder = SPRITES / clip
    if folder.is_dir():
        shutil.rmtree(folder)
    folder.mkdir(parents=True)

    for index, frame in enumerate(frames):
        x0 = max(0, frame.x0 - MARGIN)
        y0 = max(0, frame.y0 - MARGIN)
        x1 = min(rgba.shape[1], frame.x1 + MARGIN + 1)
        y1 = min(rgba.shape[0], frame.y1 + MARGIN + 1)
        crop = Image.fromarray(rgba[y0:y1, x0:x1], "RGBA")

        origin_x = round((canvas_width - crop.width) / 2)
        if air:
            target_bottom = baseline - 1 - (reference_bottom - frame.y1)
        else:
            target_bottom = baseline - 1
        draw_y = target_bottom - (frame.y1 - y0)

        canvas = Image.new("RGBA", (canvas_width, canvas_height), (0, 0, 0, 0))
        canvas.alpha_composite(crop, (origin_x, draw_y))

        pixels = np.asarray(canvas)
        ys, xs = np.where(pixels[:, :, 3] >= CONTENT_ALPHA)
        if (
            xs.min() <= 0
            or ys.min() <= 0
            or xs.max() >= canvas_width - 1
            or ys.max() >= canvas_height - 1
        ):
            raise SystemExit(f"{clip}-{index}.png encostou na borda do canvas")

        canvas.save(folder / f"{clip}-{index}.png")

    return len(frames)


def check(found: dict[str, list[Frame]]) -> None:
    total = 0
    for row in ROWS:
        for clip in row.clips:
            frames = found[clip]
            total += len(frames)
            expected = EXPECTED[clip]
            mark = "ok" if len(frames) == expected else f"esperado {expected}"
            spans = " ".join(f"[{f.x0}-{f.x1} {f.y0}-{f.y1}]" for f in frames)
            print(f"{clip:11} {len(frames)} quadro(s)  {mark:12} {spans}")
    print(f"total: {total} quadros em {sum(len(row.clips) for row in ROWS)} clipes")


def annotate(rgba: np.ndarray, found: dict[str, list[Frame]], path: Path) -> None:
    image = Image.fromarray(rgba, "RGBA")
    background = Image.new("RGBA", image.size, (245, 245, 245, 255))
    background.alpha_composite(image)
    draw = ImageDraw.Draw(background)
    for clip, frames in found.items():
        for index, frame in enumerate(frames):
            draw.rectangle(
                [frame.x0, frame.y0, frame.x1, frame.y1],
                outline=(220, 30, 30, 255),
                width=2,
            )
            draw.text((frame.x0 + 2, frame.y0 + 2), f"{clip}-{index}", fill=(255, 0, 0, 255))
    background.convert("RGB").save(path)


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Extrai os clipes do novo sheet do Nox.")
    parser.add_argument("--check", action="store_true", help="so mostra a grade, sem gravar")
    parser.add_argument("--annotate", action="store_true", help="salva a grade marcada em PNG")
    args = parser.parse_args(argv)

    if not SOURCE.is_file():
        raise SystemExit(f"sheet nao encontrado: {SOURCE}")

    rgba = load_rgba()
    for row in ROWS:
        for column, clip in enumerate(row.clips):
            mask_labels(rgba, row, row.limits[column], row.limits[column + 1])

    found = detect(rgba)
    check(found)

    if args.annotate:
        target = Path(__file__).resolve().parent / "gemini-grid.png"
        annotate(rgba, found, target)
        print(f"grade marcada: {target}")

    if args.check:
        return

    missing = [clip for clip in found if not found[clip]]
    if missing:
        raise SystemExit("clipes sem quadro: " + ", ".join(missing))

    total = 0
    for row in ROWS:
        for clip in row.clips:
            if clip in SKIP:
                print(f"{clip:11} ignorado (arte sera refeita)")
                continue
            total += write_clip(rgba, clip, found[clip])
    print(f"gravados {total} quadros em {SPRITES}")


if __name__ == "__main__":
    main()
