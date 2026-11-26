#!/usr/bin/env python3
"""
A funder's logo without its white ground (OPENBRAIN-91; Maura, 25 Nov: "add
the logo without a background"). The Neuro's logo arrived as a flat picture
on white, which showed as a white chip on the funding banner.

White is taken out the way a "colour to alpha" filter with an opacity
threshold does it. A pixel's distance from white is its furthest channel's.
From SOLID on it is the logo's own ink and stays as it is, fully opaque (both
of the logo's inks, the teal and the purple, are further from white than
that). Nearer than SOLID it is an antialiased edge: ink laid thinly over
white, so its alpha is its share of SOLID and its colour is what gives the
same pixel back when laid over white again. The edges keep their softness,
nothing is left of the ground, and over white the result is the picture it
came from.

Run from the repo root (needs Pillow and numpy):

  git show ccdd4ded:public/publicAssets/images/funders/the-neuro.webp > /tmp/the-neuro-on-white.webp
  python3 scripts/figures/make-logo-transparent.py /tmp/the-neuro-on-white.webp \
    public/publicAssets/images/funders/the-neuro.webp

If the funder sends its own transparent file, export it over the output and
delete this script.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image

# Distance from white, in levels out of 255, from which a pixel is solid ink.
SOLID = 190
# Compression noise in the white ground: anything this close to white is
# ground.
NOISE = 6


def white_to_alpha(image):
    rgb = np.asarray(image.convert("RGB"), dtype=np.float64)
    distance = 255.0 - rgb.min(axis=2)
    alpha = np.clip(distance / SOLID, 0.0, 1.0)
    alpha[distance <= NOISE] = 0.0
    safe = np.where(alpha > 0, alpha, 1.0)[..., None]
    colour = 255.0 - (255.0 - rgb) / safe
    colour[alpha == 0] = 0.0
    out = np.dstack([np.clip(colour, 0, 255), alpha * 255.0])
    return Image.fromarray(out.round().astype(np.uint8))


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    source, target = Path(sys.argv[1]), Path(sys.argv[2])
    logo = white_to_alpha(Image.open(source))
    logo.save(target, "WEBP", lossless=True, quality=100, method=6)
    print(f"{target}: {logo.size[0]} x {logo.size[1]}, {target.stat().st_size} bytes")


if __name__ == "__main__":
    main()
