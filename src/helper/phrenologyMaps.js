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
 *
 * Checked against the engravings' alpha (OPENBRAIN-147, Stuart 1 Oct: "on
 * front view the purple overshoots the top of the skull a tiny bit; on
 * lateral view it overshoots the front quite a bit"): the front map's top
 * edge sat 5 px above the skull's, the side map's front edge 11 px past the
 * face. With these fits every map edge is on the skull (0.2 % of region
 * pixels off it, down from 1.5 %), and the widget also masks the map with
 * the engraving so nothing paints outside the bone.
 */
export const MAP_FIT = {
  front: { sx: 0.978, sy: 0.945, tx: 3, ty: -4 },
  side: { sx: 0.93, sy: 0.916, tx: 21, ty: 4 },
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

/** The supplied maps explicitly fill anatomical regions; their nested dotted
 * border segments only have a stroke. Filling those open segments implicitly
 * closes them, creating wedges and overlapping purple patches (R06).
 * Keep this source-format distinction for both 2D targets and 3D picking. */
function filledRegionPaths(el) {
  const paths = el.matches("path") ? [el] : [...el.querySelectorAll("path")];
  return paths.filter((p) => {
    const fill = p.getAttribute("fill");
    return fill && fill !== "none";
  });
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
    const shapes = filledRegionPaths(el);
    const d = shapes.map((s) => s.getAttribute("d")).filter(Boolean);
    if (d.length) out.push({ key: el.getAttribute("id"), ...id, d });
  }
  return out;
}

/** The source appendix supplies the same I–XXXIII numbering as the maps.
 * Keep complete source records; never join a different chart by number.
 * XXII has no labelled location and is available through the faculty list.
 */
export function facultyInfoByNumber(views) {
  const info = new Map();
  for (const view of views)
    for (const region of view.regions)
      if (!info.has(region.n)) info.set(region.n, region);
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
export function idMarkup(svgText) {
  const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
  const filled = new Set();
  for (const el of doc.querySelectorAll("[id]")) {
    const id = parseRegionId(el.getAttribute("id"));
    if (!id) continue;
    for (const s of filledRegionPaths(el)) {
      filled.add(s);
      s.setAttribute("fill", `rgb(${id.n},${id.part},0)`);
      s.setAttribute("stroke", "none");
    }
  }
  // Anything not a named region (the "empty" shapes, stray vectors) is not
  // a faculty: make sure it paints nothing.
  for (const s of doc.querySelectorAll(
    "path, rect, circle, ellipse, polygon"
  )) {
    if (!filled.has(s)) {
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
