/*
 * Image figures in the reader's figure shell (OPENBRAIN-41).
 *
 * A figure's artwork lives on its `animations` row: `config.images` is a list
 * of { src, caption?, alt? } (or bare src strings), and `image_file_url`
 * (mapped to `imageUrl` by useAnimations) is the single-image shorthand. One
 * image is a static figure; several are a set the shell shows as a rotating
 * gallery (History Figures 2, 6 and 7, the portraits, Milner and H.M.):
 * one image at a time with dots and arrows, stepping every 10 s until the
 * reader takes over (OPENBRAIN-144, after OPENBRAIN-97's thumbnail grid).
 * Pure functions, so the rules are testable without mounting anything.
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
    .map((item) => {
      const out = {
        src: item.src,
        caption: item.caption || "",
        alt: item.alt || "",
      };
      // A gallery item can loop a muted YouTube clip in the viewer, with
      // `src` as its poster and thumbnail (Stuart, 8 Oct: H.M.'s brain).
      if (youtubeId(item.youtube)) {
        out.youtube = item.youtube;
        // "loop" (default): a silent loop in place of the still. "player":
        // an ordinary player, sound and controls, that the reader starts
        // (interviews and films; Stuart's manuscript comments, 11 Oct).
        out.play = item.play === "player" ? "player" : "loop";
        const start = Number(item.start);
        if (Number.isFinite(start) && start > 0) out.start = Math.floor(start);
      }
      return out;
    });
}

/** A YouTube video id (11 characters), or "" for anything else. */
export function youtubeId(value) {
  return typeof value === "string" && /^[\w-]{11}$/.test(value) ? value : "";
}

/**
 * The embed URL for a silent loop: muted autoplay (browsers only allow
 * autoplay muted), looping one video (loop needs playlist=<id>), no controls,
 * inline on iOS, on the privacy-enhanced domain the CSP allows.
 */
export function youtubeLoopUrl(id) {
  const v = youtubeId(id);
  if (!v) return "";
  return (
    `https://www.youtube-nocookie.com/embed/${v}` +
    `?autoplay=1&mute=1&loop=1&playlist=${v}&controls=0&playsinline=1&rel=0`
  );
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

/** The embed URL for a video the reader plays: controls, sound, no
 *  autoplay, optionally from `start` seconds, privacy-enhanced domain. */
export function youtubePlayerUrl(id, start = 0) {
  const v = youtubeId(id);
  if (!v) return "";
  const from =
    Number.isFinite(start) && start > 0 ? `&start=${Math.floor(start)}` : "";
  return `https://www.youtube-nocookie.com/embed/${v}?rel=0&playsinline=1${from}`;
}
