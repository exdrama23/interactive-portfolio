"""Monta o atlas e o JSON de animacoes do Nox a partir dos quadros em PNG.

Cada sprint de movimento entrega uma pasta em
``src/components/mascot/nox/assets/sprites/<clipe>/`` com quadros numerados.
Este script le a pasta, valida os quadros e empacota tudo no atlas, sem
interpolar, redimensionar ou tocar na arte.

A configuracao dos clipes fica em ``tools/nox/clips.json``: fps, loop, status,
sequencia, duracao por quadro, offsets e eventos. O script e a unica fonte do
``nox-animations.json``; nao edite o JSON gerado a mao.

    python tools/nox/build_atlas.py
    python tools/nox/build_atlas.py --strict-palette
    python tools/nox/build_atlas.py --dry-run

Dependencias: Pillow e numpy. O site nao depende de Python.
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / "src" / "components" / "mascot" / "nox" / "assets"
SPRITES = ASSETS / "sprites"
MANIFEST = Path(__file__).resolve().parent / "clips.json"
PALETTE_FILE = ASSETS / "nox-palette.json"


def natural_key(path: Path):
    return [int(part) if part.isdigit() else part.lower() for part in re.split(r"(\d+)", path.stem)]


def hex_rgb(value: str):
    return tuple(int(value[index:index + 2], 16) for index in (1, 3, 5))


def load_palette() -> set[tuple[int, int, int]]:
    data = json.loads(PALETTE_FILE.read_text(encoding="utf-8"))
    return {hex_rgb(color) for color in data["colors"]}


def clip_files(folder: Path) -> list[Path]:
    if not folder.is_dir():
        return []
    return sorted(
        (path for path in folder.glob("*.png") if path.is_file()),
        key=natural_key,
    )


def inspect_frame(
    path: Path,
    size: tuple[int, int],
    anchor: tuple[int, int],
    air: bool,
    palette: set[tuple[int, int, int]],
    strict_palette: bool,
) -> list[str]:
    """Valida um quadro e devolve os avisos que nao impedem o build."""
    warnings: list[str] = []
    image = Image.open(path).convert("RGBA")
    if image.size != size:
        raise SystemExit(
            f"{path.name}: {image.width}x{image.height}, esperado {size[0]}x{size[1]}. "
            "Nao redimensione a arte para caber; ajuste o canvas ou a configuracao."
        )

    pixels = np.asarray(image)
    alpha = pixels[:, :, 3]
    # O alpha e real: o recorte do atlas oficial tem bordas suaves. Ignoramos
    # apenas o ruido de recorte (alpha 1..7), que nao e desenho.
    opaque = alpha >= 8

    if not opaque.any():
        raise SystemExit(f"{path.name}: quadro vazio, nenhum pixel opaco.")

    ys, xs = np.where(opaque)
    left, right = int(xs.min()), int(xs.max())
    top, bottom = int(ys.min()), int(ys.max())

    if right >= size[0] or bottom >= size[1]:
        raise SystemExit(f"{path.name}: desenho sai do canvas {size[0]}x{size[1]}.")

    if not air and bottom != anchor[1] - 1:
        raise SystemExit(
            f"{path.name}: o pixel mais baixo esta em y={bottom}, "
            f"mas a ancora dos pes exige y={anchor[1] - 1}. "
            "Nao mova a ancora; corrija o desenho."
        )

    used = {tuple(int(value) for value in color) for color in np.unique(pixels[opaque][:, :3], axis=0)}
    outside = sorted(used - palette)
    if outside and strict_palette:
        raise SystemExit(
            f"{path.name}: {len(outside)} cor(es) fora da paleta, "
            f"ex.: {[f'#{r:02x}{g:02x}{b:02x}' for r, g, b in outside[:3]]}. "
            "Use --dry-run para so listar."
        )

    return warnings


def resolve_offset(value) -> tuple[int, int]:
    if isinstance(value, dict):
        return int(value.get("x", 0)), int(value.get("y", 0))
    return int(value[0]), int(value[1])


def build(strict_palette: bool = False, dry_run: bool = False) -> dict:
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    palette = load_palette()

    base_size = (int(manifest["frameWidth"]), int(manifest["frameHeight"]))
    base_anchor = (
        int(manifest["meta"]["anchor"]["x"]),
        int(manifest["meta"]["anchor"]["y"]),
    )
    gap = int(manifest.get("padding", 1))
    atlas_width = int(manifest.get("atlasWidth", 512))

    pending: list[tuple[str, Path, Image.Image, dict]] = []
    warnings: list[str] = []

    for name, config in manifest["clips"].items():
        folder = SPRITES / config.get("folder", name)
        files = clip_files(folder)
        if not files:
            continue

        size = (
            int(config.get("frameWidth", base_size[0])),
            int(config.get("frameHeight", base_size[1])),
        )
        anchor = base_anchor
        if "anchor" in config:
            anchor = (int(config["anchor"]["x"]), int(config["anchor"]["y"]))
        air = bool(config.get("air", False))

        for path in files:
            warnings.extend(inspect_frame(path, size, anchor, air, palette, strict_palette))

        sequence = config.get("sequence", list(range(len(files))))
        for index in sequence:
            if not 0 <= int(index) < len(files):
                raise SystemExit(f"{name}: sequence aponta para o quadro {index}, mas a pasta tem {len(files)}.")
        durations = config.get("durations", [])
        offsets = config.get("offsets", [])

        for position, index in enumerate(sequence):
            image = Image.open(files[int(index)]).convert("RGBA")
            pending.append(
                (
                    name,
                    files[int(index)],
                    image,
                    {
                        "duration": durations[position] if position < len(durations) else None,
                        "offset": resolve_offset(offsets[position]) if position < len(offsets) else (0, 0),
                    },
                )
            )

        if config.get("status") == "pending":
            warnings.append(
                f"{name}: tem quadros na pasta mas ainda esta como pending em clips.json."
            )

    if not pending:
        raise SystemExit("nenhum quadro encontrado; nada para montar.")

    widest = max(image.width for _, _, image, _ in pending)
    atlas_width = max(atlas_width, widest + gap * 2)

    rects: dict[str, list[dict]] = {name: [] for name in manifest["clips"]}
    cursor_x = gap
    cursor_y = gap
    row_height = 0
    placements: list[tuple[Image.Image, int, int]] = []

    for name, _, image, extra in pending:
        if cursor_x + image.width + gap > atlas_width:
            cursor_x = gap
            cursor_y += row_height + gap
            row_height = 0

        rect = {"x": cursor_x, "y": cursor_y, "w": image.width, "h": image.height}
        if extra["duration"] is not None:
            rect["duration"] = int(extra["duration"])
        offset_x, offset_y = extra["offset"]
        if offset_x:
            rect["offsetX"] = offset_x
        if offset_y:
            rect["offsetY"] = offset_y
        rects[name].append(rect)
        placements.append((image, cursor_x, cursor_y))

        cursor_x += image.width + gap
        row_height = max(row_height, image.height)

    atlas_height = cursor_y + row_height + gap
    atlas = Image.new("RGBA", (atlas_width, atlas_height), (0, 0, 0, 0))
    for image, x, y in placements:
        atlas.alpha_composite(image, (x, y))

    animations: dict[str, dict] = {}
    for name, config in manifest["clips"].items():
        clip = {
            "fps": config.get("fps"),
            "loop": bool(config.get("loop", False)),
            "status": config.get("status", "pending"),
            "frames": rects[name],
        }
        if "note" in config:
            clip["note"] = config["note"]
        if "anchor" in config:
            clip["anchor"] = {
                "x": int(config["anchor"]["x"]),
                "y": int(config["anchor"]["y"]),
            }
        if "events" in config:
            clip["events"] = config["events"]
        animations[name] = clip

    meta = dict(manifest["meta"])
    meta["frameWidth"] = base_size[0]
    meta["frameHeight"] = base_size[1]

    output = {"meta": meta, "animations": animations}
    atlas_path = (ASSETS / "animations" / str(meta["atlas"])).resolve()
    json_path = ASSETS / "animations" / "nox-animations.json"

    if not dry_run:
        atlas.save(atlas_path)
        json_path.write_text(
            json.dumps(output, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )

    total = sum(len(value) for value in rects.values())
    ready = sum(1 for clip in animations.values() if clip["frames"])
    print(f"atlas: {atlas_width}x{atlas_height} em {atlas_path.name}")
    print(f"clipes com quadro: {ready}/{len(animations)} ({total} quadros)")
    for name, clip in animations.items():
        if clip["frames"]:
            print(f"  {name:12} {len(clip['frames'])} quadro(s)  {clip['status']}")
    missing = [name for name, clip in animations.items() if not clip["frames"]]
    if missing:
        print("pendentes:", ", ".join(missing))
    for message in warnings:
        print("aviso:", message)
    if dry_run:
        print("dry-run: nada foi gravado.")

    return output


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Monta o atlas e o JSON de animacoes do Nox.")
    parser.add_argument("--strict-palette", action="store_true", help="falha se houver cor fora da paleta")
    parser.add_argument("--dry-run", action="store_true", help="valida sem gravar atlas nem JSON")
    args = parser.parse_args(argv)
    build(strict_palette=args.strict_palette, dry_run=args.dry_run)


if __name__ == "__main__":
    main()
