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

/** The map key of each 2D view (tab) of the skull. */
export const VIEW_MAP = {
  anterior: "front",
  lateral: "side",
  posterior: "back",
};

/*
 * Where each map sits on its engraving (skull-*.png, the same 750 × 725
 * frame) for the 2D widget: a scale about the frame's centre, then a shift,
 * in map units. The maps were drawn a little larger than the engravings and
 * higher up. Front and back were fitted to the engravings' own line layer
 * (lines-*.png) by searching for the best overlap of the outlines; the side
 * map is a different drawing from lines-lateral.png, so its fit (the best
 * overlap it has) lands it on the cranium but is approximate. The 2D widget
 * therefore draws the maps' own outlines, so what is drawn is what can be
 * clicked (OPENBRAIN-98).
 */
export const MAP_FIT = {
  front: { sx: 0.978, sy: 0.954, tx: 3, ty: -8.5 },
  side: { sx: 0.94, sy: 0.916, tx: 29.5, ty: 4 },
  back: { sx: 0.984, sy: 1.008, tx: 5, ty: 22 },
};
/** MAP_FIT as an SVG transform. */
export function fitTransform({ sx, sy, tx, ty }) {
  const cx = MAP_W / 2;
  const cy = MAP_H / 2;
  return `translate(${cx + tx} ${cy + ty}) scale(${sx} ${sy}) translate(${-cx} ${-cy})`;
}

/** Every outline in a map (regions, their parts and the unnamed shapes). */
export function mapOutlines(svgText) {
  const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
  return [...doc.querySelectorAll("path")]
    .map((el) => el.getAttribute("d"))
    .filter(Boolean);
}

/**
 * One view's regions as vector shapes, for the 2D widget: every named region
 * (both halves of a paired one) with the path data of its shapes.
 * @returns {Array<{key: string, n: number, part: number, d: string[]}>}
 */
export function regionShapes(svgText) {
  const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
  const out = [];
  for (const el of doc.querySelectorAll("[id]")) {
    const id = parseRegionId(el.getAttribute("id"));
    if (!id) continue;
    const shapes = el.matches("path") ? [el] : [...el.querySelectorAll("path")];
    const d = shapes.map((s) => s.getAttribute("d")).filter(Boolean);
    if (d.length) out.push({ key: el.getAttribute("id"), ...id, d });
  }
  return out;
}

/*
 * Names and blurbs from the mock, matched BY NUMBER, and only for 1–18. The
 * Figma map's regions 1–18 sit where Spurzheim's faculties of those numbers
 * sit (1 at the nape, 10 at the crown, 13 top of the forehead…), and the mock
 * is written in Spurzheim's numbering. Its forehead regions (19–33) follow a
 * different chart, so a Spurzheim name there would be the wrong faculty:
 * those have no name until the authors supply the chart's own list.
 */
export const SPURZHEIM_MATCHES_MAP = 18;
/** n → { name, blurb } from the mock's views. */
export function facultyInfoByNumber(views) {
  const info = new Map();
  for (const v of views)
    for (const r of v.regions)
      if (r.n <= SPURZHEIM_MATCHES_MAP && !info.has(r.n))
        info.set(r.n, { name: r.name, blurb: r.blurb });
  return info;
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
