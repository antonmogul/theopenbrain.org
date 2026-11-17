#!/usr/bin/env python3
"""
The contents' picture for History's References row (OPENBRAIN-193; Stuart,
14 Nov: "when you hover over '6. References' - change image that is
displayed to the Brenda Milner photo").

The other section pictures are the designers' exports from Figma (see
src/helper/sectionArt.js): 1440 x 1920, the chapter's violet baked in. This
one is made here from the chapter's own figure, hm-brenda-milner.jpg (1000 x
563, a studio portrait on a plain backdrop), in the same treatment:

  1. The portrait is enlarged 2.6 times and stands on the frame's bottom
     edge, centred on the face. The frame is taller than the photograph, so
     the backdrop is carried on above it: the photograph's top rows, column
     by column, smoothed, with the photograph's own grain.
  2. Its greys, with a little more contrast, are multiplied into the violet
     (the `fund` ramp's main step, #8D4CF6), as the designers' pictures
     are: paper becomes violet, ink stays dark.

Run from the repo root (needs Pillow, numpy and cwebp):

  python3 scripts/figures/make-references-art.py

It writes public/publicAssets/images/foundations/sections/references-milner.webp.
If the designers draw their own, export it over this file and delete this
script.
"""
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "public/publicAssets/images/foundations/hm-brenda-milner.jpg"
OUT = ROOT / "public/publicAssets/images/foundations/sections/references-milner.webp"

W, H = 1440, 1920  # the other section pictures' size
SCALE = 2.6  # the portrait's enlargement
FACE_X = 480  # the face's centre in the photograph, px
VIOLET = np.array([141, 76, 246], dtype=np.float32)  # #8D4CF6
BACKDROP_ROWS = 3  # rows at the top that are backdrop in every column
GRAIN = 2.2  # the backdrop's grain in the photograph, grey levels (sd)
BLACK, WHITE = 0.14, 0.93  # the levels: these greys become 0 and 1


def main():
    photo = Image.open(SOURCE).convert("L")
    pw, ph = photo.size

    # The backdrop above the photograph: its top rows' column means, smoothed
    # along the row so no column streaks, with grain like the photograph's.
    top = np.asarray(photo, dtype=np.float32)[:BACKDROP_ROWS].mean(axis=0)
    kernel = np.hanning(81)
    kernel /= kernel.sum()
    top = np.convolve(np.pad(top, 40, mode="edge"), kernel, mode="valid")
    extra = int(np.ceil(H / SCALE)) - ph
    rng = np.random.default_rng(193)
    sky = np.tile(top, (extra, 1)) + rng.normal(0, GRAIN, (extra, pw))
    sky = Image.fromarray(np.clip(sky, 0, 255).astype(np.uint8))
    # Grain as soft as the photograph's own (it is a small JPEG).
    sky = sky.filter(ImageFilter.GaussianBlur(0.6))

    tall = Image.new("L", (pw, extra + ph))
    tall.paste(sky, (0, 0))
    tall.paste(photo, (0, extra))
    # A short blend over the join.
    join = np.asarray(tall, dtype=np.float32)
    for i in range(6):
        t = (i + 1) / 7
        join[extra + i] = (1 - t) * np.asarray(sky, dtype=np.float32)[-1] + t * join[extra + i]
    tall = Image.fromarray(np.clip(join, 0, 255).astype(np.uint8))

    # The frame: W wide around the face, the photograph's foot on its foot.
    crop_w = W / SCALE
    left = FACE_X - crop_w / 2
    box = (left, tall.height - H / SCALE, left + crop_w, tall.height)
    frame = tall.resize((W, H), Image.LANCZOS, box=box)

    # A little more contrast than the scan has, so the darks hold against the
    # violet as they do in the designers' pictures.
    grey = np.asarray(frame, dtype=np.float32) / 255.0
    grey = np.clip((grey - BLACK) / (WHITE - BLACK), 0, 1)
    out = grey[..., None] * VIOLET[None, None, :]
    picture = Image.fromarray(np.clip(out + 0.5, 0, 255).astype(np.uint8))

    with tempfile.TemporaryDirectory() as tmp:
        png = Path(tmp) / "references-milner.png"
        picture.save(png)
        subprocess.run(
            ["cwebp", "-quiet", "-q", "82", "-m", "6", str(png), "-o", str(OUT)],
            check=True,
        )
    print(f"{OUT.relative_to(ROOT)}: {W} x {H}, {OUT.stat().st_size // 1024} KB")


if __name__ == "__main__":
    sys.exit(main())
