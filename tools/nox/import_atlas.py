"""Extrai os clipes do contact sheet oficial do Nox para quadros em PNG.

O atlas de referencia e um contact sheet 1536x1024 com 22 grupos rotulados, nao
um spritesheet pronto. Este script:

1. remove as pilulas de rotulo pela componente conectada exata;
2. separa os quadros de cada grupo por projecao de alpha;
3. recorta cada quadro preservando o alpha original (sem binarizar, sem
   redimensionar e sem reduzir paleta);
4. monta um canvas comum de 128x128 com a linha dos pes em y=120.

Clipes de chao tem o frame apoiado na linha dos pes. Clipes aereos preservam a
altura relativa entre os quadros, para o salto e a queda nao perderem o arco.

O clipe de celebracao fica de fora de proposito: a arte sera refeita.

    python tools/nox/import_atlas.py
    python tools/nox/import_atlas.py --check   # so mostra a grade detectada

Nao altera a imagem de origem. Dependencias: Pillow, numpy e scipy.
"""

from __future__ import annotations

import argparse
import shutil
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "src" / "assets" / "img" / "logos" / "Atlas de Animações do Gato Preto.png"
SPRITES = ROOT / "src" / "components" / "mascot" / "nox" / "assets" / "sprites"

CANVAS_W = 128
GROUND_H = 128
GROUND_BASELINE = 120  # linha da ancora; o ultimo pixel do pe fica em 119
AIR_H = 160
AIR_BASELINE = 152     # canvas mais alto para o arco do salto nao ser cortado
MARGIN = 4      # margem transparente em volta do recorte
CONTENT_ALPHA = 8  # ignora o ruido de recorte com alpha 1..5
BAND_ALPHA = 100   # separa o desenho do halo fraco
MIN_BAND = 20

# Faixas de linha do contact sheet (topo de cada faixa de rotulos) e os clipes.
ROW_TOPS = [0, 167, 325, 477, 623, 751, 894, 1024]
ROW_CLIPS = [
    ["idle", "walk", "run"],
    ["sit", "sleep", "wake"],
    ["jump", "fall", "land"],
    ["happy", "angry", "scared"],
    ["pet", "held", "dragged"],
    ["celebrate", "scratch", "yawn"],
]
LAST_ROW_CLIPS = ["meow", "stretch", "lookAround", "tailFlick"]
# Limites horizontais da ultima linha: os quadros atravessam as colunas de 384.
LAST_ROW_LIMITS = [410, 790, 1200]
AIR = {"jump", "fall", "land"}
SKIP = {"celebrate"}


@dataclass
class Frame:
    x0: int
    x1: int
    y0: int
    y1: int


def load_clean() -> tuple[np.ndarray, list[tuple[int, int, int, int]]]:
    rgba = np.asarray(Image.open(SOURCE).convert("RGBA")).copy()
    alpha = rgba[:, :, 3]
    labels = ndimage.label(alpha > BAND_ALPHA)
    objects = ndimage.find_objects(labels[0])

    label_mask = np.zeros(alpha.shape, dtype=bool)
    found = []
    for index, box in enumerate(objects, 1):
        if box is None:
            continue
        ys, xs = box
        height = ys.stop - ys.start
        width = xs.stop - xs.start
        area = int((labels[0][box] == index).sum())
        # Pilula de rotulo: faixa baixa, larga e opaca no topo do grupo.
        if height <= 45 and width >= 80 and area > 800 and ys.start < 1010:
            # O rotulo tem um halo fraco que nao pertence a componente opaca.
            # Apagar a caixa com uma folga pequena remove o halo inteiro; a arte
            # fica varios pixels abaixo, entao a folga nao toca no desenho.
            pad = 3
            label_mask[
                max(0, ys.start - pad):ys.stop + pad,
                max(0, xs.start - pad):xs.stop + pad,
            ] = True
            found.append((xs.start, ys.start, width, height))

    if len(found) != 22:
        raise SystemExit(f"esperava 22 rotulos, encontrei {len(found)}")

    rgba[label_mask] = 0
    return rgba, found


def bands(mask: np.ndarray) -> list[tuple[int, int]]:
    columns = mask.sum(axis=0)
    raw = []
    start = None
    for x, value in enumerate(columns):
        if value > 0 and start is None:
            start = x
        elif value == 0 and start is not None:
            raw.append((start, x - 1))
            start = None
    if start is not None:
        raw.append((start, len(columns) - 1))

    merged = []
    for band in raw:
        if merged and band[0] - merged[-1][1] <= 4:
            merged[-1] = (merged[-1][0], band[1])
        else:
            merged.append(list(band))
    return [tuple(band) for band in merged if band[1] - band[0] + 1 >= MIN_BAND]


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


def detect() -> dict[str, list[Frame]]:
    rgba, _ = load_clean()
    alpha = rgba[:, :, 3]
    found: dict[str, list[Frame]] = {}

    for row, clips in enumerate(ROW_CLIPS):
        y0, y1 = ROW_TOPS[row], ROW_TOPS[row + 1]
        edges = [0, 512, 1024, 1536]
        for column, clip in enumerate(clips):
            x0, x1 = edges[column] + 6, edges[column + 1] - 6
            region = alpha[y0:y1, x0:x1]
            found[clip] = [
                content_box(rgba, x0 + start, x0 + end + 1, y0, y1)
                for start, end in bands(region > BAND_ALPHA)
            ]

    y0, y1 = ROW_TOPS[6], ROW_TOPS[7]
    last = bands(alpha[y0:y1, :] > BAND_ALPHA)
    assigned: dict[str, list[Frame]] = {clip: [] for clip in LAST_ROW_CLIPS}
    for start, end in last:
        center = (start + end) / 2
        index = 0
        while index < len(LAST_ROW_LIMITS) and center >= LAST_ROW_LIMITS[index]:
            index += 1
        clip = LAST_ROW_CLIPS[index]
        assigned[clip].append(content_box(rgba, start, end + 1, y0, y1))

    found.update(assigned)
    return found


def write_clip(rgba: np.ndarray, clip: str, frames: list[Frame]) -> int:
    cleaned = rgba
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
        x1 = min(cleaned.shape[1], frame.x1 + MARGIN + 1)
        y1 = min(cleaned.shape[0], frame.y1 + MARGIN + 1)
        crop = Image.fromarray(cleaned[y0:y1, x0:x1], "RGBA")
        # Cada quadro e centrado no canvas. O contact sheet espalha os quadros
        # ao longo da faixa; a posicao relativa entre eles nao cabe nem deve
        # ser levada para o frame individual.
        origin_x = round((canvas_width - crop.width) / 2)

        if air:
            target_bottom = baseline - 1 - (reference_bottom - frame.y1)
        else:
            target_bottom = baseline - 1
        draw_y = target_bottom - (frame.y1 - y0)

        canvas = Image.new("RGBA", (canvas_width, canvas_height), (0, 0, 0, 0))
        canvas.alpha_composite(crop, (origin_x, draw_y))

        # Falha alto se o recorte encostar na borda: seria arte cortada em
        # silencio. Os canvases tem folga suficiente para todos os quadros.
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
    for clip, frames in found.items():
        total += len(frames)
        spans = " ".join(f"[{f.x0}-{f.x1} {f.y0}-{f.y1}]" for f in frames)
        print(f"{clip:11} {len(frames)} quadro(s)  {spans}")
    print(f"total: {total} quadros em {len(found)} clipes")


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Extrai os clipes do atlas do Nox.")
    parser.add_argument("--check", action="store_true", help="so mostra a grade, sem gravar")
    args = parser.parse_args(argv)

    if not SOURCE.is_file():
        raise SystemExit(f"atlas nao encontrado: {SOURCE}")

    found = detect()
    check(found)
    if args.check:
        return

    missing = [clip for clip in found if not found[clip]]
    if missing:
        raise SystemExit("clipes sem quadro: " + ", ".join(missing))

    rgba, _ = load_clean()
    total = 0
    for clip, frames in found.items():
        if clip in SKIP:
            print(f"{clip:11} ignorado (arte sera refeita)")
            continue
        total += write_clip(rgba, clip, frames)
    print(f"gravados {total} quadros em {SPRITES}")


if __name__ == "__main__":
    main()
