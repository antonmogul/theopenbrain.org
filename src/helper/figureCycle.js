/*
 * Image figures in the reader's figure shell (OPENBRAIN-41).
 *
 * A figure's artwork lives on its `animations` row: `config.images` is a list
 * of { src, caption?, alt? } (or bare src strings), and `image_file_url`
 * (mapped to `imageUrl` by useAnimations) is the single-image shorthand. One
 * image is a static figure; several are a set the shell cycles through, as the
 * authors asked for History Figures 6 and 7. Pure functions, so the rules are
 * testable without mounting anything.
 */

/** Normalise whatever the row carries into [{ src, caption, alt }]. */
export function figureImages(animation) {
  if (!animation) return [];
  const raw =
    Array.isArray(animation.images) && animation.images.length
      ? animation.images
      : animation.imageUrl
        ? [animation.imageUrl]
        : [];
  return raw
    .map((item) => (typeof item === "string" ? { src: item } : item))
    .filter((item) => item && typeof item.src === "string" && item.src)
    .map((item) => ({
      src: item.src,
      caption: item.caption || "",
      alt: item.alt || "",
    }));
}

/**
 * The figure shell renders both states of a figure slot: "Artwork pending"
 * and real artwork, and prefers the artwork whenever images are present.
 * Rows filled by a migration keep `placeholder: true` so reader builds that
 * predate the image viewer still route them to the shell; a row authored
 * later with images and no flag lands here too.
 */
export function usesFigureShell(animation) {
  return !!animation?.placeholder || figureImages(animation).length > 0;
}

/** Wrap-around stepping through a set of `count` images. */
export function stepIndex(index, count, direction = 1) {
  if (!count) return 0;
  return (((index + direction) % count) + count) % count;
}

/**
 * How long one image of a cycling figure stays up before auto-advancing, in
 * milliseconds. `image` is { src, caption, alt }; `sharedCaption` is the
 * figure-level caption shown when the image has none of its own.
 *
 * Scales with caption length: ~18 characters per second is comfortable reading
 * pace. Clamped to a 4–12 s window so short-legend figures (like Fig 7's four
 * Vesalius plates) feel brisk while long-caption figures (like Fig 6's ten
 * cell-doctrine plates at 300–600 chars each) give the reader time to finish.
 * The viewer already pauses on hover/focus, stops auto-advancing for good once
 * the reader uses the arrows, and never auto-advances under reduce-motion, so
 * this only sets the untouched, default pace.
 */
const CHARS_PER_SECOND = 18;
const FLOOR_MS = 4000;
const CEILING_MS = 12000;

export function slideDurationMs(image, sharedCaption = "") {
  const text = image?.caption || sharedCaption || "";
  if (!text) return FLOOR_MS;
  const reading = (text.length / CHARS_PER_SECOND) * 1000;
  return Math.max(FLOOR_MS, Math.min(CEILING_MS, reading));
}
