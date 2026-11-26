#!/usr/bin/env python3
"""
History's Closing words picture, the brain of H.M. (OPENBRAIN-86; Maura,
25 Nov, review note 0ca2e51d: "I replaced the image so it has more padding
around it, especially on top. You can use the same image for the section
cover and for the left side, full width and without the top margin. I added
extra margin, so feel free to zoom in so it's nicely centered.")

Her file is hm-brain.jpg, 1762 x 2289 (sha256 SOURCE_SHA256 below), not kept
in the repo. This makes the two pictures the reader uses from it, on ONE
pixel grid, so the section's cover and the figure that follows it register
exactly when one fades into the other (helper/sectionCard.js):

  public/publicAssets/images/foundations/hm-brain-v3.webp
      Fig 26 (animationFoundationsClosingHM), the photograph itself.
  public/publicAssets/images/foundations/sections/closing-words-v2.webp
      the section's cover (helper/sectionArt.js) and the figure's baked
      wash (config.images[0].wash): the same frame in the chapter's violet.

The frame. A 3:4 crop (the other section pictures' shape) centred on the
brain, which is ZOOM of its width. The figure fills the pane
(config.fill), which crops this frame again to the pane's shape around its
centre: at 3:4 the brain's height is 38% of the frame's, so it stays whole
in any pane up to about twice as wide as it is tall.

The violet. As the designers' covers and make-references-art.py: the
photograph's greys multiplied into the `fund` ramp's main step (#8D4CF6),
so paper becomes violet and ink stays dark, with a little grain like their
exports.

Run from the repo root (needs Pillow, numpy and cwebp):

  python3 scripts/figures/make-closing-words-art.py <path to hm-brain.jpg>

If the designers export their own cover, it must be this frame exactly
(1440 x 1920, the same crop), or the cover and the figure stop registering.
"""
import hashlib
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
FOUNDATIONS = ROOT / "public/publicAssets/images/foundations"
PHOTO = FOUNDATIONS / "hm-brain-v3.webp"
COVER = FOUNDATIONS / "sections/closing-words-v2.webp"
SOURCE_SHA256 = "923caf8db09d82b68cde8a5f400a80b1424ccc18ce3067346367e4e7cf9b1f0c"

W, H = 1440, 1920  # the other section pictures' size
ZOOM = 0.72  # the brain's width as a share of the frame's
VIOLET = np.array([141, 76, 246], dtype=np.float32)  # #8D4CF6
LEVEL, GAMMA = 0.86, 1.15  # the backdrop's grey lands near the designers'
GRAIN = 0.022  # sd, as a share of full scale


def brain_box(rgb):
    """The brain's bounding box: the only warm pixels in the photograph."""
    px = rgb.astype(int)
    warm = (px[..., 0] - px[..., 2] > 18) & (px[..., 0] > 90)
    ys, xs = np.where(warm)
    x0, x1 = np.percentile(xs, [0.2, 99.8])
    y0, y1 = np.percentile(ys, [0.2, 99.8])
    return x0, y0, x1, y1


def webp(image, out, quality):
    with tempfile.TemporaryDirectory() as tmp:
        png = Path(tmp) / "frame.png"
        image.save(png)
        subprocess.run(
            ["cwebp", "-quiet", "-q", str(quality), "-m", "6", str(png), "-o", str(out)],
            check=True,
        )
    print(f"{out.relative_to(ROOT)}: {W} x {H}, {out.stat().st_size // 1024} KB")


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    source = Path(sys.argv[1])
    digest = hashlib.sha256(source.read_bytes()).hexdigest()
    if digest != SOURCE_SHA256:
        print(f"note: not the 25 Nov file (sha256 {digest})", file=sys.stderr)
    photo = Image.open(source).convert("RGB")
    x0, y0, x1, y1 = brain_box(np.asarray(photo))
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    crop_w = (x1 - x0) / ZOOM
    crop_h = crop_w * H / W
    box = (cx - crop_w / 2, cy - crop_h / 2, cx + crop_w / 2, cy + crop_h / 2)
    if box[0] < 0 or box[1] < 0 or box[2] > photo.width or box[3] > photo.height:
        sys.exit("the frame runs off the photograph: raise ZOOM")
    frame = photo.resize((W, H), Image.LANCZOS, box=box)
    webp(frame, PHOTO, 84)

    grey = np.asarray(frame.convert("L"), dtype=np.float32) / 255.0
    tone = LEVEL * grey**GAMMA
    rng = np.random.default_rng(86)
    # Grain in proportion to the tone, so the black table stays black.
    tone = np.clip(tone + rng.normal(0, GRAIN, tone.shape) * np.sqrt(tone), 0, 1)
    cover = Image.fromarray((tone[..., None] * VIOLET + 0.5).astype(np.uint8))
    webp(cover, COVER, 82)


if __name__ == "__main__":
    main()
