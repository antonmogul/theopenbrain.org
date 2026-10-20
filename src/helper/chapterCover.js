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
export const REACTIVE_COVER_BY_SLUG = Object.freeze({
  // The 2023 Retina opener (theopenbrain.org/chapter): the Matisse portrait
  // whose eyes follow the cursor across the window. Built from the original
  // introAnimation.json by scripts/covers/build-matisse-eyes.mjs.
  "the-retina": Object.freeze({
    lottie: "/publicAssets/animations/covers/matisse-eyes.json",
    axis: "x",
    fit: "slice",
  }),
  // Stuart, 13 Oct: "recycle the Retina chapter one for now" until Sonia and
  // Maura's History graphic arrives. The Matisse reader still stays
  // underneath as the poster.
  "foundations-of-neuroscience": Object.freeze({
    lottie: "/publicAssets/animations/covers/matisse-eyes.json",
    axis: "x",
    fit: "slice",
  }),
});

const REACTIVE_DEFAULTS = Object.freeze({
  axis: "x",
  reverse: false,
  fit: "meet",
  idle: 14,
});

/** Normalise a reactive-cover record; null when it has no usable Lottie. */
export function normalizeReactiveCover(raw) {
  if (!raw || typeof raw !== "object" || !isUsableUrl(raw.lottie)) return null;
  const idle = Number(raw.idle);
  return {
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
