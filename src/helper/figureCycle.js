/*
 * Image figures in the reader's figure shell (OPENBRAIN-41).
 *
 * A figure's artwork lives on its `animations` row: `config.images` is a list
 * of { src, caption?, alt? } (or bare src strings), and `image_file_url`
 * (mapped to `imageUrl` by useAnimations) is the single-image shorthand. One
 * image is a static figure; several are a set the shell shows as a gallery
 * (History Figures 2, 6 and 7; OPENBRAIN-97 replaced the auto-advancing
 * slider). Pure functions, so the rules are testable without mounting
 * anything.
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

/** Wrap-around stepping through a set of `count` images (the viewer). */
export function stepIndex(index, count, direction = 1) {
  if (!count) return 0;
  return (((index + direction) % count) + count) % count;
}
