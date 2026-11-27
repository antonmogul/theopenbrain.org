#!/usr/bin/env python3
"""OPENBRAIN-97: prepare Stuart's section art, preserving the complete plates.

Run with Pillow: python prepare-retina-stuart-art.py --source /path/to/images
Provide the private fundus source separately with --fundus /path/to/photo.
Its name and metadata are never copied into a public asset or the manifest.
The three Zinn originals are retained outside public/ for recomposition.
Like History's section art, each 1440x1920 plate has the chapter colour
baked in. No CSS filter, text, generated image or replacement drawing.
"""
import argparse
import json
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[2]
SIZE = (1440, 1920)
GROUND = "#39D8BA"  # chapterTheme.js: perc.main


def plate(path):
    image = ImageOps.exif_transpose(Image.open(path)).convert("RGB")
    grey = ImageOps.autocontrast(ImageOps.grayscale(image), cutoff=0.5)
    # Preserve the scan's tonal range; paper takes the chapter ground.
    return ImageOps.colorize(grey, black="#1c1c1c", white=GROUND)


def put(frame, image, box):
    x, y, w, h = box
    image = ImageOps.contain(image, (w, h), Image.Resampling.LANCZOS)
    frame.paste(image, (x + (w-image.width)//2, y + (h-image.height)//2))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", required=True, type=Path)
    parser.add_argument("--fundus", required=True, type=Path)
    args = parser.parse_args()
    entries = json.loads((ROOT / "scripts/figures/retina-stuart-section-art.json").read_text())
    for entry in entries:
        frame = Image.new("RGB", SIZE, GROUND)
        if entry["section"] == "story-of-the-eye":
            # Two portrait plates above, the third below; all three stay whole.
            sources = ROOT / "scripts/figures/sources/retina-zinn"
            for name, box in [("eye-1.png", (240, 400, 480, 560)),
                              ("eye-2.png", (720, 400, 480, 560)),
                              ("eye-3.jpg", (480, 980, 480, 560))]:
                put(frame, plate(sources / name), box)
        else:
            source = args.fundus if entry["section"] == "diseases-disorders-and-treatments" else args.source / entry["source"]
            # The middle square survives the wide contents crop as well as
            # the portrait pane; never cut labels or anatomical panels off.
            put(frame, plate(source), (160, 400, 1120, 1120))
        target = ROOT / "public" / entry["art"]["src"].lstrip("/")
        # A fresh pixel-only image and no exif/icc/xmp arguments strip metadata.
        frame.save(target, "WEBP", quality=84, method=6)
        print(f"{target.relative_to(ROOT)}: {target.stat().st_size} bytes")


if __name__ == "__main__":
    main()
