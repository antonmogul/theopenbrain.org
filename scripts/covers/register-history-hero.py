"""
Register the History hero's two drawings (OPENBRAIN-156).

The resting sketch (hist-header-sketch.png, 1728x1116) and the cutaway
(hist-header-cutaway.png, 2553x1640) are two independently drawn pictures of
the same girl at different crops and scales, with the head redrawn. The reveal
(CutawayCover.vue) lifts the sketch's own crown and shows only the cutaway's
violet brain band in the gap, so it needs, in sketch pixels:

  1. where the cutaway sits on the sketch (`brainBox`): a uniform scale and
     offset, chamfer-matched on the ink below the cut — the body, which both
     artists drew in the same place;
  2. the band's lower and upper edges (`band`, and the cut line of `cap`);
  3. the hinge the band implies (`pivot`, `open`): the rotation about the
     forehead that carries the band's lower edge onto its upper edge.

The numbers are baked into HISTORY_CUTAWAY in src/helper/chapterCover.js.
Re-run only if the artwork changes:

    python3 scripts/covers/register-history-hero.py

Needs Pillow and numpy (both on the Mac mini's system Python).
"""

import sys

import numpy as np
from PIL import Image, ImageFilter

DIR = "public/publicAssets/images/covers/foundations-hero/"
SKETCH = DIR + "hist-header-sketch.png"
CUTAWAY = DIR + "hist-header-cutaway.png"


def load(path, scale=1.0):
    im = Image.open(path).convert("RGBA")
    w, h = im.size
    if scale != 1.0:
        im = im.resize((round(w * scale), round(h * scale)), Image.LANCZOS)
    return np.asarray(im).astype(float), (w, h)


def ink_of(a):
    lum = 0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2]
    ink = (lum < 140) & (a[..., 3] > 128)
    return ink & ~violet_of(a)


def violet_of(a):
    return (a[..., 2] > 150) & (a[..., 1] < 150) & (a[..., 0] > 90) & (a[..., 3] > 128)


def dilate(mask, r):
    im = Image.fromarray((mask * 255).astype(np.uint8))
    return np.asarray(im.filter(ImageFilter.MaxFilter(2 * r + 1))) > 0


def score(sk_d, pts, s, tx, ty):
    """Fraction of cutaway ink points, placed on the sketch, that land on ink."""
    x = (pts[:, 0] * s + tx).astype(int)
    y = (pts[:, 1] * s + ty).astype(int)
    h, w = sk_d.shape
    ok = (x >= 0) & (x < w) & (y >= 0) & (y < h)
    return sk_d[y[ok], x[ok]].sum() / len(pts)


def search(level, prior, span, step):
    sk, sk_size = load(SKETCH, level)
    cu, cu_size = load(CUTAWAY, level)
    sk_d = dilate(ink_of(sk), 2)
    cu_ink = ink_of(cu)
    ys, xs = np.nonzero(cu_ink)
    # Only the figure below the cut (the band sits around 42% down the
    # cutaway): the hair above is redrawn in both.
    keep = ys > cu_ink.shape[0] * 0.42
    pts = np.stack([xs[keep], ys[keep]], axis=1).astype(float)
    best = (-1, None)
    s0, tx0, ty0 = prior
    for s in np.arange(s0 - span[0], s0 + span[0] + 1e-9, step[0]):
        for tx in np.arange(tx0 - span[1], tx0 + span[1] + 1e-9, step[1]):
            for ty in np.arange(ty0 - span[2], ty0 + span[2] + 1e-9, step[2]):
                sc = score(sk_d, pts, s, tx * level, ty * level)
                if sc > best[0]:
                    best = (sc, (s, tx, ty))
    return best, sk_size, cu_size


def register():
    """Coarse-to-fine search over scale (sketch px per cutaway px) and offset."""
    best, sk_size, cu_size = search(0.125, (0.70, 0, -100), (0.15, 300, 300), (0.01, 8, 8))
    print("coarse", best, file=sys.stderr)
    best, _, _ = search(0.25, best[1], (0.02, 24, 24), (0.0025, 2, 2))
    print("fine", best, file=sys.stderr)
    best, _, _ = search(0.5, best[1], (0.004, 4, 4), (0.001, 1, 1))
    print("finest", best, file=sys.stderr)
    return best[1], sk_size, cu_size


def band_edges(s, tx, ty):
    """The violet band's lower and upper edges per column, in sketch px."""
    cu, _ = load(CUTAWAY)
    violet = violet_of(cu)
    cols = np.nonzero(violet.any(axis=0))[0]
    lower, upper = [], []
    for x in range(cols.min(), cols.max() + 1, 4):
        col = np.nonzero(violet[:, x])[0]
        if len(col) < 3:
            continue
        lower.append((x * s + tx, col.max() * s + ty))
        upper.append((x * s + tx, col.min() * s + ty))
    return np.array(lower), np.array(upper)


def hinge(lower, upper):
    """The rotation about a pivot near the band's left end that carries the
    lower edge onto the upper one: the cap's open pose."""

    def dist(pts, curve):
        d = np.sqrt(((pts[:, None, :] - curve[None, :, :]) ** 2).sum(-1))
        return d.min(1)

    best = (1e9, None)
    for px in range(730, 800, 2):
        for py in range(355, 395, 2):
            for th in np.radians(np.arange(3, 16, 0.25)):
                c, sn = np.cos(-th), np.sin(-th)
                rel = lower - (px, py)
                rot = np.stack([rel[:, 0] * c - rel[:, 1] * sn, rel[:, 0] * sn + rel[:, 1] * c], 1) + (px, py)
                m = (rot[:, 0] > lower[:, 0].min()) & (rot[:, 0] < lower[:, 0].max())
                err = dist(rot[m], upper).mean()
                if err < best[0]:
                    best = (err, (px, py, round(float(np.degrees(th)), 2)))
    return best


def main():
    (s, tx, ty), (W, H), (cw, ch) = register()
    print(f"scale {s:.4f}, offset ({tx:.0f}, {ty:.0f}) sketch px")
    print("brainBox (sketch px):", [round(tx), round(ty), round(cw * s), round(ch * s)])
    lower, upper = band_edges(s, tx, ty)
    every = slice(None, None, 6)
    print("band lower edge:", [(round(x), round(y)) for x, y in lower[every]])
    print("band upper edge:", [(round(x), round(y)) for x, y in upper[every]])
    err, (px, py, deg) = hinge(lower, upper)
    print(f"hinge: pivot ({px}, {py}), {deg} deg, mean error {err:.1f} px")


if __name__ == "__main__":
    main()
