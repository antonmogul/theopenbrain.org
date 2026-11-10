/*
 * Chapter cover image for the opener hero (OPENBRAIN-32).
 *
 * Resolution order: modules.cover_image_url (migration 20260911000100)
 * → code-side map by slug → the neutral default. The slug map exists so the
 * covers Sonia has already chosen render before the column is populated in
 * production; a DB value wins once it is set.
 *
 * The Attention painting is the low-resolution export of the image in
 * Sonia's frame (1495:34229); the full-resolution asset is still hers to
 * supply — replace the file, not the map.
 */
export const DEFAULT_COVER = "/publicAssets/images/background.jpg";

export const COVER_BY_SLUG = Object.freeze({
  // Anton's choice, 24 Sep: Matisse's girl reading, shared with Attention
  // until that chapter gets its own. Set a cover on the chapter page to
  // override (OPENBRAIN-67).
  "foundations-of-neuroscience":
    "/publicAssets/images/attention-matisse-reader.jpg",
  "the-retina": "/publicAssets/images/00-matisse-bg.jpg",
  "attention-and-working-memory":
    "/publicAssets/images/attention-matisse-reader.jpg",
});

function isUsableUrl(value) {
  return typeof value === "string" && value.trim().length > 0;
}

export function coverForModule(module) {
  if (!module || typeof module !== "object") return DEFAULT_COVER;
  if (isUsableUrl(module.cover_image_url)) return module.cover_image_url.trim();
  return COVER_BY_SLUG[module.slug] || DEFAULT_COVER;
}

/*
 * Reactive cover (OPENBRAIN-146). Stuart, 1 Oct: "Make sure the top drawing
 * is mouse responsive (like the eyes in the retina chapter)"; 13 Oct: "just
 * recycle the Retina chapter one for now, so that you implement the reactive
 * graphic at the top of the page". A reactive cover is data: a Lottie the
 * opener scrubs from the pointer, laid over the still cover, which stays the
 * poster and the fallback when the file is missing or motion is reduced.
 *
 * Resolution order mirrors the still cover: modules.reactive_cover (a JSON
 * column with the shape below; not migrated yet) → the slug map → none. To
 * swap a chapter's reactive graphic, drop the Lottie into
 * public/publicAssets/animations/covers/ and point its entry here (or, once
 * the column exists, at a chapter-media URL from the chapter page).
 *
 *   lottie   path or URL of the Lottie JSON
 *   axis     "x" | "y": which pointer coordinate drives the frame
 *   reverse  true runs the frames the other way
 *   fit      "meet" (whole graphic visible, default) | "slice" (fills, crops)
 *   idle     seconds per gentle sweep when no pointer is about (0 = none)
 */
/*
 * The second kind of reactive cover, `kind: "head"` (OPENBRAIN-171): the
 * History opener as Sonia and Maura delivered it (10 Nov 2026), drawn by
 * HeadCover.vue on a canvas with helper/headCover.js. A girl writes in a
 * loop; a hand with a tool follows the pointer, and rubbing it over her
 * head slides the top off and lets the brain rise. Everything is in pixels
 * of the artwork (`size`), as their config.json gave it.
 *
 *   paper, ink   the drawing's ground, and the colour the hero's arrow takes
 *                on it
 *   fit          [x, y, w, h]: the part that must always show (girl and pen)
 *   poster       the resting drawing as one still, the whole canvas: first
 *                paint, reduced motion, and what stays if the layers fail
 *   oval, brain  the dark opening of the head, and the brain under the lid
 *   body         the girl, `frames` played at `fps`
 *   lid          the top of the head: plain, and outlined (shown once it
 *                lifts); it turns about `pivot`
 *   hand         the photograph, its tool's `tip` (which sits on the
 *                pointer), `scale`, and its pixel `size`
 *   zone         where the hand may appear (the designers' red lines)
 *   head         the ellipse in which strokes count
 *   keys         [lid dx, lid dy, lid turn°, brain dx, brain dy] per frame of
 *                the artist's gif, from `first` (closed) to `open`
 */
const HEAD = "/publicAssets/images/covers/foundations-hero/head";
export const HISTORY_HEAD = Object.freeze({
  kind: "head",
  paper: "#F8F2E4",
  ink: "#1c1c1c",
  size: [2680, 1732],
  fit: [470, 40, 1540, 1660],
  poster: `${HEAD}/poster.webp`,
  oval: { src: `${HEAD}/oval.webp`, at: [1106, 345] },
  brain: { src: `${HEAD}/brain.webp`, at: [1100, 321] },
  body: {
    frames: Array.from(
      { length: 19 },
      (_, i) => `${HEAD}/body/${String(i).padStart(2, "0")}.webp`
    ),
    fps: 12,
    at: [783, 354],
  },
  lid: {
    src: `${HEAD}/lid.webp`,
    outline: `${HEAD}/lidS.webp`,
    at: [991, 305],
    pivot: [1264.6, 459.3],
  },
  hand: {
    src: `${HEAD}/hand.webp`,
    tip: [20, 874],
    scale: 1.2,
    size: [1102, 998],
  },
  zone: [
    [666, -247],
    [2517, -247],
    [2517, 263],
    [1183, 1275],
    [1154, 1298],
    [666, 670],
  ],
  head: { x: 1183, y: 405, rx: 436, ry: 353 },
  keys: {
    first: 5,
    open: 16,
    keys: [
      [0, 0, 0, 46, 74],
      [-1.1, -1, 0, 44, 72],
      [-5.5, -5.6, 0.16, 41, 71],
      [-14.1, -13.8, 0.85, 37, 70],
      [-35.2, -34.8, 2.6, 29, 63],
      [-112.3, -106.1, 6.5, 8, 28],
      [-195.1, -178.3, 4.7, -13, -7],
      [-218.9, -200.1, 3.9, -20, -17],
      [-229.4, -209.9, 3.7, -22, -21],
      [-234.1, -214.2, 3.8, -24, -23],
      [-235, -215.3, 3.75, -24, -24],
      [-235, -215.3, 3.75, -24, -24],
    ],
  },
});

export const REACTIVE_COVER_BY_SLUG = Object.freeze({
  // The 2023 Retina opener (theopenbrain.org/chapter): the Matisse portrait
  // whose eyes follow the cursor across the window. Built from the original
  // introAnimation.json by scripts/covers/build-matisse-eyes.mjs.
  "the-retina": Object.freeze({
    lottie: "/publicAssets/animations/covers/matisse-eyes.json",
    axis: "x",
    fit: "slice",
  }),
  // Sonia and Maura's History graphic: the girl writing, whose head the
  // reader opens with the hand (OPENBRAIN-171; it replaced the cutaway
  // rebuilt from two drawings, OPENBRAIN-156).
  "foundations-of-neuroscience": HISTORY_HEAD,
});

const REACTIVE_DEFAULTS = Object.freeze({
  axis: "x",
  reverse: false,
  fit: "meet",
  idle: 14,
});

const numbers = (value, n) =>
  Array.isArray(value) &&
  value.length === n &&
  value.every((v) => Number.isFinite(v))
    ? value
    : null;
const polygon = (value) =>
  Array.isArray(value) && value.length >= 3 && value.every((p) => numbers(p, 2))
    ? value
    : null;
const layer = (raw) =>
  raw && isUsableUrl(raw.src) && numbers(raw.at, 2)
    ? { src: raw.src.trim(), at: [...raw.at] }
    : null;

/** Check a head record and copy it; null when any part is unusable. */
export function normalizeHeadCover(raw) {
  if (!raw || typeof raw !== "object") return null;
  const size = numbers(raw.size, 2);
  const fit = numbers(raw.fit, 4);
  const oval = layer(raw.oval);
  const brain = layer(raw.brain);
  const lid = layer(raw.lid);
  const hand = raw.hand;
  const body = raw.body;
  const head = raw.head;
  const keys = raw.keys;
  if (!isUsableUrl(raw.poster) || !size || !fit || !oval || !brain || !lid)
    return null;
  if (!(size[0] > 0 && size[1] > 0 && fit[2] > 0 && fit[3] > 0)) return null;
  if (!isUsableUrl(raw.lid.outline) || !numbers(raw.lid.pivot, 2)) return null;
  if (
    !body ||
    !Array.isArray(body.frames) ||
    !body.frames.length ||
    !body.frames.every(isUsableUrl) ||
    !(body.fps > 0) ||
    !numbers(body.at, 2)
  )
    return null;
  if (
    !hand ||
    !isUsableUrl(hand.src) ||
    !numbers(hand.tip, 2) ||
    !numbers(hand.size, 2) ||
    !(hand.scale > 0)
  )
    return null;
  if (!polygon(raw.zone)) return null;
  if (!head || ![head.x, head.y, head.rx, head.ry].every(Number.isFinite))
    return null;
  if (!(head.rx > 0 && head.ry > 0)) return null;
  if (
    !keys ||
    !Array.isArray(keys.keys) ||
    keys.keys.length < 3 ||
    !keys.keys.every((k) => numbers(k, 5)) ||
    !Number.isFinite(keys.first) ||
    keys.open !== keys.first + keys.keys.length - 1
  )
    return null;
  return {
    kind: "head",
    poster: raw.poster.trim(),
    paper: isUsableUrl(raw.paper) ? raw.paper.trim() : null,
    ink: isUsableUrl(raw.ink) ? raw.ink.trim() : null,
    size: [...size],
    fit: [...fit],
    oval,
    brain,
    body: {
      frames: body.frames.map((f) => f.trim()),
      fps: body.fps,
      at: [...body.at],
    },
    lid: { ...lid, outline: raw.lid.outline.trim(), pivot: [...raw.lid.pivot] },
    hand: {
      src: hand.src.trim(),
      tip: [...hand.tip],
      scale: hand.scale,
      size: [...hand.size],
    },
    zone: raw.zone.map((p) => [...p]),
    head: { x: head.x, y: head.y, rx: head.rx, ry: head.ry },
    keys: {
      first: keys.first,
      open: keys.open,
      keys: keys.keys.map((k) => [...k]),
    },
  };
}

/**
 * Normalise a reactive-cover record: a Lottie (`kind: "lottie"`, the
 * default) or a head; null when it has no usable Lottie or artwork. A head
 * brings its own `poster` and `paper`, which HeadCover lays out itself, so
 * the hero shows no chapter cover behind it.
 */
export function normalizeReactiveCover(raw) {
  if (!raw || typeof raw !== "object") return null;
  if (raw.kind === "head") return normalizeHeadCover(raw);
  if (!isUsableUrl(raw.lottie)) return null;
  const idle = Number(raw.idle);
  return {
    kind: "lottie",
    poster: null,
    lottie: raw.lottie.trim(),
    axis: raw.axis === "y" ? "y" : REACTIVE_DEFAULTS.axis,
    reverse: raw.reverse === true,
    fit: raw.fit === "slice" ? "slice" : REACTIVE_DEFAULTS.fit,
    idle: Number.isFinite(idle) && idle >= 0 ? idle : REACTIVE_DEFAULTS.idle,
  };
}

export function reactiveCoverForModule(module) {
  if (!module || typeof module !== "object") return null;
  return (
    normalizeReactiveCover(module.reactive_cover) ||
    normalizeReactiveCover(REACTIVE_COVER_BY_SLUG[module.slug])
  );
}
