#!/usr/bin/env node
// Bake the one authored trim-start expression without changing the source scan,
// gaze coordinates, timing or easing. No eval and no CSP exception needed.
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
const source = new URL(
  "../../public/publicAssets/animations/animationEyeMovements.json",
  import.meta.url
);
const target = new URL(
  "../../public/publicAssets/animations/derived/animationEyeMovements.json",
  import.meta.url
);
const bytes = readFileSync(source);
const data = JSON.parse(bytes);
const trim = data.layers[0].shapes.find((shape) => shape.ty === "tm");
const expression =
  "var $bm_rt;\n$bm_rt = $bm_sub(content('Pfade trimmen 1').end, 0.4);";
if (trim.s.x !== expression || trim.e.a !== 1)
  throw new Error(
    "Eye-movement source changed; review the derivative before rebuilding."
  );
const start = structuredClone(trim.e);
start.ix = trim.s.ix;
for (const keyframe of start.k) {
  for (const endpoint of ["s", "e"])
    if (keyframe[endpoint])
      keyframe[endpoint] = keyframe[endpoint].map((v) => v - 0.4);
}
trim.s = start;
data.presentationSource = {
  path: "/publicAssets/animations/animationEyeMovements.json",
  sha256: createHash("sha256").update(bytes).digest("hex"),
  change:
    "Trim start = trim end minus 0.4; baked using the same keyframes and easing.",
};
mkdirSync(new URL(".", target), { recursive: true });
writeFileSync(target, JSON.stringify(data));
console.log(fileURLToPath(target));
