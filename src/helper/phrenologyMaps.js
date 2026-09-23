/*
 * phrenologyMaps — the Figma faculty maps (Open-Brain-Chapters, Assets 24:31,
 * frames "Front" 207:5161, "Side" 207:5112, "Back" 207:5189) turned into what
 * the 3D skull needs.
 *
 * Each map is an SVG in the engravings' own 750 × 725 frame, one shape per
 * faculty region, named OB2_W1_<View>_<nn>[_L|_R]. For every view we draw:
 *   display — the SVG as designed (lilac fill, dotted violet outlines), which
 *             the skull's shader projects onto the model;
 *   ids     — the same shapes filled with a colour that encodes the region:
 *             red = faculty number, green = which half (0 whole, 1 L, 2 R).
 *             Read on the CPU to pick a region under a click, and sampled by
 *             the shader to light up the selected region.
 * plus the centroid of every region part, where its number marker goes.
 */

export const MAP_W = 750;
export const MAP_H = 725;
const SCALE = 2; // raster at 2x so the dotted outlines stay crisp on the skull

export const MAP_SRC = {
  front: "/publicAssets/images/phrenology/regions-front.svg",
  side: "/publicAssets/images/phrenology/regions-side.svg",
  back: "/publicAssets/images/phrenology/regions-back.svg",
};

/** "OB2_W1_Front_33_L" → { n: 33, part: 1 }; "…_empty…" → null. */
export function parseRegionId(id) {
  const m = /^OB2_W1_[A-Za-z]+_(\d+)(?:_([LR]))?$/.exec(id || "");
  if (!m) return null;
  return { n: Number(m[1]), part: m[2] === "L" ? 1 : m[2] === "R" ? 2 : 0 };
}

/** Decode one pixel of the id map. */
export function decodeId(r, g) {
  return r ? { n: r, part: g } : null;
}

function svgImage(markup) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(
      new Blob([markup], { type: "image/svg+xml" })
    );
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

function canvasOf(img) {
  const c = document.createElement("canvas");
  c.width = MAP_W * SCALE;
  c.height = MAP_H * SCALE;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return c;
}

/** Recolour every region with its id colour and drop the outlines. */
function idMarkup(svgText) {
  const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
  for (const el of doc.querySelectorAll("[id]")) {
    const id = parseRegionId(el.getAttribute("id"));
    const shapes = [
      el,
      ...el.querySelectorAll("path, rect, circle, ellipse, polygon"),
    ];
    for (const s of shapes) {
      if (!id) continue;
      s.setAttribute("fill", `rgb(${id.n},${id.part},0)`);
      s.setAttribute("stroke", "none");
    }
  }
  // Anything not a named region (the "empty" shapes, stray vectors) is not
  // a faculty: make sure it paints nothing.
  for (const s of doc.querySelectorAll(
    "path, rect, circle, ellipse, polygon"
  )) {
    if (!/^rgb\(\d+,\d,0\)$/.test(s.getAttribute("fill") || "")) {
      s.setAttribute("fill", "none");
      s.setAttribute("stroke", "none");
    }
  }
  return new XMLSerializer().serializeToString(doc);
}

/**
 * Load one view's maps.
 * @returns {Promise<{display: HTMLCanvasElement, ids: HTMLCanvasElement,
 *   idAt: (x: number, y: number) => ({n:number, part:number}|null),
 *   centroids: Array<{n:number, part:number, x:number, y:number}>}>}
 *   x/y are in the 750 × 725 frame.
 */
export async function loadRegionMap(src) {
  const text = await (await fetch(src)).text();
  const [displayImg, idImg] = await Promise.all([
    svgImage(text),
    svgImage(idMarkup(text)),
  ]);
  const display = canvasOf(displayImg);
  const ids = canvasOf(idImg);
  const { data, width, height } = ids
    .getContext("2d", { willReadFrequently: true })
    .getImageData(0, 0, ids.width, ids.height);

  // Antialiased edges blend neighbouring id colours; only trust opaque pixels.
  const idAt = (x, y) => {
    const px = Math.round(x * SCALE);
    const py = Math.round(y * SCALE);
    if (px < 0 || py < 0 || px >= width || py >= height) return null;
    const i = (py * width + px) * 4;
    if (data[i + 3] < 250) return null;
    return decodeId(data[i], data[i + 1]);
  };

  const sums = new Map();
  for (let py = 0; py < height; py += 2) {
    for (let px = 0; px < width; px += 2) {
      const i = (py * width + px) * 4;
      if (data[i + 3] < 250 || !data[i]) continue;
      const key = `${data[i]}:${data[i + 1]}`;
      const s = sums.get(key) || {
        n: data[i],
        part: data[i + 1],
        x: 0,
        y: 0,
        k: 0,
      };
      s.x += px;
      s.y += py;
      s.k += 1;
      sums.set(key, s);
    }
  }
  const centroids = [...sums.values()]
    .filter((s) => s.k > 20)
    .map((s) => ({
      n: s.n,
      part: s.part,
      x: s.x / s.k / SCALE,
      y: s.y / s.k / SCALE,
    }));

  return { display, ids, idAt, centroids };
}
