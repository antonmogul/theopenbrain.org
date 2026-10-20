#!/usr/bin/env node
/*
 * Builds the Retina reactive cover (OPENBRAIN-146) from the 2023 site's
 * intro animation: theopenbrain.org/publicAssets/animations/introAnimation.json
 * and its four images (the Matisse painting, a cut-out of it with the eyes
 * removed, and the two eyes that slide under the holes). Those originals
 * total 7.6 MB and are not in the repo; this halves the composition and
 * re-encodes the images as WebP (about 0.7 MB), writing
 *
 *   public/publicAssets/animations/covers/matisse-eyes.json
 *   public/publicAssets/animations/covers/images/matisse-*.webp
 *
 * Usage: node scripts/covers/build-matisse-eyes.mjs <dir with introAnimation.json and images/>
 * Needs ffmpeg and cwebp on PATH. Re-run only if the source animation changes.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const src = path.resolve(process.argv[2] || "");
if (!process.argv[2]) {
  console.error("usage: build-matisse-eyes.mjs <source dir>");
  process.exit(1);
}
const outDir = path.join(root, "public/publicAssets/animations/covers");
const imgDir = path.join(outDir, "images");
mkdirSync(imgDir, { recursive: true });

const SCALE = 0.5;
// The composition is 3840×2160; the painting runs on below it, so crop each
// full-height image to what the frame can show (plus a margin) before scaling.
const CROP_ROWS = {
  "00-matisse-augen-cutout.png": 1900,
  "00-matisse-bg.jpg": 2200,
};
const OUT_NAME = {
  "00-matisse-augen-cutout.png": "matisse-cutout.webp",
  "00-matisse-bg.jpg": "matisse-bg.webp",
  "00-matisse-auge-1.jpg": "matisse-eye-1.webp",
  "00-matisse-auge-2.jpg": "matisse-eye-2.webp",
};
const QUALITY = {
  "matisse-cutout.webp": ["-q", "82", "-alpha_q", "90"],
  "matisse-bg.webp": ["-q", "72"],
};

const anim = JSON.parse(
  readFileSync(path.join(src, "introAnimation.json"), "utf8")
);
const round = (n) => Math.round(n * 1000) / 1000;
const scaleVec = (v) =>
  Array.isArray(v) ? v.map((n, i) => (i < 2 ? round(n * SCALE) : n)) : v;
const scaleProp = (prop) => {
  if (!prop) return;
  if (prop.a === 1) {
    for (const k of prop.k) {
      for (const key of ["s", "e", "to", "ti"])
        if (k[key]) k[key] = scaleVec(k[key]);
    }
  } else {
    prop.k = scaleVec(prop.k);
  }
};

anim.w = Math.round(anim.w * SCALE);
anim.h = Math.round(anim.h * SCALE);
anim.nm = "retina-matisse-eyes";
for (const asset of anim.assets) {
  const rows = CROP_ROWS[asset.p] || asset.h;
  const w = Math.round(asset.w * SCALE);
  const h = Math.round(rows * SCALE);
  const out = OUT_NAME[asset.p];
  const tmp = path.join(imgDir, `${out}.png`);
  execFileSync("ffmpeg", [
    "-loglevel",
    "error",
    "-y",
    "-i",
    path.join(src, asset.u || "", asset.p),
    "-vf",
    `crop=${asset.w}:${rows}:0:0,scale=${w}:${h}`,
    "-pix_fmt",
    "rgba",
    tmp,
  ]);
  execFileSync("cwebp", [
    "-quiet",
    ...(QUALITY[out] || ["-q", "85"]),
    tmp,
    "-o",
    path.join(imgDir, out),
  ]);
  execFileSync("rm", [tmp]);
  Object.assign(asset, { w, h, u: "images/", p: out });
}
for (const layer of anim.layers) {
  layer.nm = OUT_NAME[layer.nm] || layer.nm;
  scaleProp(layer.ks.a);
  scaleProp(layer.ks.p);
}
writeFileSync(path.join(outDir, "matisse-eyes.json"), JSON.stringify(anim));
console.log(
  "wrote",
  path.relative(root, path.join(outDir, "matisse-eyes.json"))
);
