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
 * The second kind of reactive cover, `kind: "cutaway"` (OPENBRAIN-156): the
 * History hero's skull cutaway, three rasters CutawayCover.vue composes —
 * the sketch, the cutaway drawing with the violet brain, and the hand with
 * the lifted bone cap. The geometry is in pixels of the sketch (`size`) so
 * it can be read off the artwork; the normaliser turns it into fractions.
 *
 *   base, brain, hand   the three files; `base` is also the hero's poster
 *   paper               the sketch's paper colour, behind the seam of the cut
 *   size                the sketch's pixel size; everything below is in it
 *   brainBox            [left, top, width, height] where the cutaway sits on
 *                       the sketch (scripts/covers/register-history-hero.py)
 *   cap                 the skull cap's outline, its lower edge the cut line
 *   pivot, open         where the cap hinges and how far it lifts, in degrees
 *   band                the brain band, the only part of the cutaway shown
 *   handBox             [left, top, width] of the hand photo when reached in
 *   handRest            how far [right, up] of that it waits, off the canvas
 *   axis, reverse       as for a Lottie: which pointer coordinate drives it
 */
const HISTORY_HERO = "/publicAssets/images/covers/foundations-hero";
export const HISTORY_CUTAWAY = Object.freeze({
  kind: "cutaway",
  base: `${HISTORY_HERO}/hist-header-sketch.png`,
  brain: `${HISTORY_HERO}/hist-header-cutaway.png`,
  hand: `${HISTORY_HERO}/hist-header-hand.png`,
  paper: "#f8f2e3",
  size: [1728, 1116],
  // Chamfer-matched on the body (98% of the cutaway's ink below the cut
  // lands on the sketch's): scale 0.5785, offset (147, 38).
  brainBox: [147, 38, 1477, 949],
  // The crown of the head above the band's lower edge (the hairline over
  // the forehead and ear, measured off the violet, pushed 2 px below it so
  // the band sits inside), closed up the back of the head and round the
  // front of the hair; the temple curls and the bun stay with the face.
  cap: [
    [760, 150],
    [1010, 140],
    [1000, 190],
    [988, 214],
    [972, 236],
    [960, 258],
    [948, 281],
    [934, 300],
    [919, 315],
    [905, 328],
    [890, 339],
    [876, 348],
    [861, 357],
    [847, 364],
    [818, 365],
    [804, 371],
    [789, 373],
    [762, 374],
    [752, 340],
    [742, 300],
    [738, 250],
    [745, 200],
  ],
  // The band is a wedge, 7 px at the forehead and 40 px at the back: the
  // artist hinged the cap at the forehead. The fit says 6.75° about
  // (730, 367); 8° opens a visible gap above the brain.
  pivot: [748, 372],
  open: 8,
  // The violet band's lower edge (2 px inside the cut line) and upper edge
  // (5 px out, to keep its black outline), tips at both ends.
  band: [
    [776, 365],
    [789, 369],
    [804, 367],
    [818, 361],
    [847, 360],
    [861, 353],
    [876, 344],
    [890, 335],
    [905, 324],
    [919, 311],
    [934, 296],
    [948, 277],
    [960, 254],
    [948, 234],
    [934, 259],
    [919, 279],
    [905, 294],
    [890, 306],
    [876, 318],
    [861, 327],
    [847, 336],
    [818, 349],
    [804, 355],
    [789, 359],
  ],
  // The storyboard (Figma 2730:9218): the cap floats above and right of the
  // crown, the forearm leaving by the top-right corner. 1.1× the sketch's
  // width puts the photo's cap at (1050, 150).
  handBox: [-233, -501, 1900],
  // Along the forearm, far enough that nothing of it is on the canvas.
  handRest: [700, -300],
  axis: "x",
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
  // Sonia and Maura's History graphic (OPENBRAIN-155/156): the girl writing,
  // whose skull the pointer lifts. It replaces the recycled Retina eye
  // (Stuart, 13 Oct) and brings its own poster, the sketch.
  "foundations-of-neuroscience": HISTORY_CUTAWAY,
});

const REACTIVE_DEFAULTS = Object.freeze({
  axis: "x",
  reverse: false,
  fit: "meet",
  idle: 14,
});
const CUTAWAY_OPEN_DEFAULT = 8;

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

/** Normalise a cutaway record into fractions of the sketch; null when any part is unusable. */
export function normalizeCutawayCover(raw) {
  if (!raw || typeof raw !== "object") return null;
  if (![raw.base, raw.brain, raw.hand].every(isUsableUrl)) return null;
  const size = numbers(raw.size, 2);
  const brainBox = numbers(raw.brainBox, 4);
  const handBox = numbers(raw.handBox, 3);
  const pivot = numbers(raw.pivot, 2);
  const cap = polygon(raw.cap);
  const band = polygon(raw.band);
  if (!size || !(size[0] > 0 && size[1] > 0)) return null;
  if (!brainBox || !handBox || !(handBox[2] > 0) || !pivot || !cap || !band)
    return null;
  const [w, h] = size;
  const point = ([x, y]) => [x / w, y / h];
  const handRest = numbers(raw.handRest, 2) || [0, 0];
  const open = Number(raw.open);
  return {
    kind: "cutaway",
    axis: raw.axis === "y" ? "y" : REACTIVE_DEFAULTS.axis,
    reverse: raw.reverse === true,
    poster: raw.base.trim(),
    base: raw.base.trim(),
    brain: raw.brain.trim(),
    hand: raw.hand.trim(),
    paper: isUsableUrl(raw.paper) ? raw.paper.trim() : null,
    ratio: w / h,
    brainBox: {
      left: brainBox[0] / w,
      top: brainBox[1] / h,
      width: brainBox[2] / w,
      height: brainBox[3] / h,
    },
    cap: cap.map(point),
    pivot: point(pivot),
    open: Number.isFinite(open) && open > 0 ? open : CUTAWAY_OPEN_DEFAULT,
    band: band.map(point),
    handBox: {
      left: handBox[0] / w,
      top: handBox[1] / h,
      width: handBox[2] / w,
    },
    // Fractions of the hand's own width on both axes; the component turns
    // y into a fraction of its height with the photo's ratio.
    handRest: { x: handRest[0] / handBox[2], y: handRest[1] / handBox[2] },
  };
}

/**
 * Normalise a reactive-cover record: a Lottie (`kind: "lottie"`, the
 * default) or a cutaway; null when it has no usable Lottie or artwork.
 * `poster` is an image the hero should show as its still instead of the
 * chapter cover (the cutaway's sketch, so a missing file or reduced motion
 * leaves the same drawing); null means the chapter cover.
 */
export function normalizeReactiveCover(raw) {
  if (!raw || typeof raw !== "object") return null;
  if (raw.kind === "cutaway") return normalizeCutawayCover(raw);
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
