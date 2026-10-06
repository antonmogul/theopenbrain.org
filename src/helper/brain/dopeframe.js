/*
 * Dopeframe: the brain atlas's camera and highlight timeline (OPENBRAIN-127).
 *
 * The name and idea are Tyler's (quorumetrix): a dopesheet kept as a
 * dataframe, one row per keyframe, so the cinematography is data a
 * spreadsheet can hold rather than code. Each row is a key:
 *
 *   t          seconds from the start of the loop
 *   azimuth    degrees around the vertical axis: 0 looks at the right
 *              hemisphere, 90 at the front, 180 at the left, 270 the back
 *   elevation  degrees above the horizontal (90 = straight down)
 *   distance   camera distance from the brain, in model units (~50 wide)
 *   open       0 = hemispheres closed, 1 = opened flat like a book
 *   area       the area to highlight from this key on ("" = none)
 *   ease       how the numbers travel INTO this key: "inOut" | "linear"
 *
 * Numbers interpolate between keys; `area` steps. The last row should
 * repeat the first (azimuth modulo 360) so the loop is seamless.
 */

export const DOPEFRAME_COLUMNS = Object.freeze([
  "t",
  "azimuth",
  "elevation",
  "distance",
  "open",
  "area",
  "ease",
]);

/*
 * The atlas loop visits each chapter's part of the brain: first the two on
 * the closed brain's left side (Foundations: Broca's area; Attention:
 * prefrontal and parietal cortex), then the camera rises behind the brain
 * and only then does the book open, for the two on the medial wall (The
 * Retina: visual cortex along the calcarine sulcus; Stress: the
 * parahippocampal gyrus). The book closes before the camera swings back,
 * so moving and opening never happen at once. Highlighting one part lights
 * the whole chapter.
 */
// One keyframe per line, like the spreadsheet rows it stands for.
// prettier-ignore
export const ATLAS_DOPEFRAME = Object.freeze([
  { t: 0, azimuth: 140, elevation: 10, distance: 118, open: 0, area: "", ease: "inOut" },
  { t: 3, azimuth: 175, elevation: 12, distance: 110, open: 0, area: "broca", ease: "inOut" },
  { t: 7, azimuth: 182, elevation: 18, distance: 110, open: 0, area: "prefrontal", ease: "linear" },
  { t: 11, azimuth: 190, elevation: 28, distance: 114, open: 0, area: "", ease: "linear" },
  { t: 13.5, azimuth: 270, elevation: 62, distance: 122, open: 0, area: "", ease: "inOut" },
  { t: 16, azimuth: 270, elevation: 62, distance: 122, open: 1, area: "occipital", ease: "inOut" },
  { t: 20, azimuth: 276, elevation: 60, distance: 120, open: 1, area: "parahippocampal", ease: "inOut" },
  { t: 24, azimuth: 264, elevation: 64, distance: 120, open: 1, area: "", ease: "inOut" },
  { t: 26.5, azimuth: 266, elevation: 62, distance: 120, open: 0, area: "", ease: "inOut" },
  { t: 31, azimuth: 140, elevation: 10, distance: 118, open: 0, area: "", ease: "inOut" },
]);

const EASES = {
  linear: (x) => x,
  inOut: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
};

export function dopeframeDuration(rows) {
  return rows.length ? rows[rows.length - 1].t : 0;
}

const NUMERIC = ["azimuth", "elevation", "distance", "open"];

/**
 * The pose at time `t` (seconds; wraps around the loop). Returns
 * { azimuth, elevation, distance, open, area } with azimuth in [0, 360).
 */
export function sampleDopeframe(rows, t) {
  if (!rows.length) return null;
  const duration = dopeframeDuration(rows);
  const time = duration > 0 ? ((t % duration) + duration) % duration : 0;
  let i = 0;
  while (i < rows.length - 1 && rows[i + 1].t <= time) i++;
  const a = rows[i];
  const b = rows[Math.min(i + 1, rows.length - 1)];
  const span = b.t - a.t;
  const ease = EASES[b.ease] || EASES.inOut;
  const k = span > 0 ? ease(Math.min(1, Math.max(0, (time - a.t) / span))) : 0;
  const pose = { area: a.area || "" };
  for (const key of NUMERIC) pose[key] = a[key] + (b[key] - a[key]) * k;
  pose.azimuth = ((pose.azimuth % 360) + 360) % 360;
  return pose;
}

/** Shortest signed angle (degrees) from `from` to `to`, in (-180, 180]. */
export function angleDelta(from, to) {
  const d = ((((to - from) % 360) + 540) % 360) - 180;
  return d === -180 ? 180 : d;
}
