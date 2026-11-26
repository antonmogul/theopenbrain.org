/*
 * Image figures in the reader's figure shell (OPENBRAIN-41).
 *
 * A figure's artwork lives on its `animations` row: `config.images` is a list
 * of { src, caption?, alt? } (or bare src strings), and `image_file_url`
 * (mapped to `imageUrl` by useAnimations) is the single-image shorthand. One
 * image is a static figure; several are a set the shell shows as a rotating
 * gallery (History Figures 2, 6 and 7, the portraits, Milner and H.M.):
 * one image at a time with thumbnails and arrows, stepping every 15 s until the
 * reader takes over (OPENBRAIN-144, after OPENBRAIN-97's thumbnail grid), or
 * all of them at once as a grid, which is how a larger set opens
 * (OPENBRAIN-177).
 * Pure functions, so the rules are testable without mounting anything.
 */

/** Normalise whatever the row carries into [{ src, caption, alt, youtube?, loop?, wash? }]. */
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
        // Designer-supplied clean posters can ask for the player's one
        // play control in the corner, away from the subject's face.
        if (item.posterPlay === "corner") out.posterPlay = "corner";
        const start = Number(item.start);
        if (Number.isFinite(start) && start > 0) out.start = Math.floor(start);
      }
      // Or loop a short silent film of our own in place of the still, with
      // `src` as its poster and as the still under reduced motion (Maura,
      // 18 Nov: Plato and Aristotle; scripts/figures/encode-figure-loop.sh).
      const loop = figureLoop(item.loop);
      if (loop && !out.youtube) out.loop = loop;
      // A picture that is already a duotone (the designers' posters) stays
      // out of its figure's chapter-colour wash (OPENBRAIN-80).
      if (item.tint === false) out.tint = false;
      // Or it brings its wash with it: the same frame as a duotone, on the
      // same pixel grid (the H.M. brain and its section cover,
      // OPENBRAIN-86). The pane then fades that copy, not a filtered one.
      if (typeof item.wash === "string" && item.wash.trim())
        out.wash = item.wash.trim();
      // A focal point of its own, "50% 20%": the part that stays in view
      // where the picture is cropped to fill a box, its thumbnail and a
      // video's poster (OPENBRAIN-87; Maura, 25 Nov: no faces cut off).
      const focus = focalPoint(item.focus);
      if (focus) out.focus = focus;
      // A picture with a figure number of its own, in a figure that holds
      // two figures (Descartes' box: the skull in Paris is Figure D, the
      // piece in Lund Figure E; Stuart, 18 Nov, OPENBRAIN-202).
      const own = item.figureNumber;
      if ((typeof own === "string" && own.trim()) || Number.isFinite(own)) {
        out.figureNumber = typeof own === "string" ? own.trim() : own;
        if (typeof item.title === "string" && item.title.trim())
          out.title = item.title.trim();
      }
      return out;
    });
}

/** A same-origin path, "/publicAssets/…": loops are served with the app. */
const sameOrigin = (value) =>
  typeof value === "string" && /^\/(?!\/)\S+$/.test(value) ? value : "";

/**
 * `{ mp4?, webm?, width?, height? }` → the same with only usable values, or
 * null without a source. width and height (the film's pixels) let the
 * browser reserve its shape before the first frame.
 */
export function figureLoop(value) {
  if (!value || typeof value !== "object") return null;
  const mp4 = sameOrigin(value.mp4);
  const webm = sameOrigin(value.webm);
  if (!mp4 && !webm) return null;
  const out = {};
  if (webm) out.webm = webm;
  if (mp4) out.mp4 = mp4;
  const width = Number(value.width);
  const height = Number(value.height);
  if (width > 0 && height > 0) {
    out.width = Math.round(width);
    out.height = Math.round(height);
  }
  return out;
}

/** "50% 30%" as written when it is a focal point, "" for anything else. */
function focalPoint(value) {
  const match =
    typeof value === "string" &&
    value.trim().match(/^(\d{1,3}(?:\.\d+)?)%\s+(\d{1,3}(?:\.\d+)?)%$/);
  if (!match) return "";
  const [x, y] = [Number(match[1]), Number(match[2])];
  return x <= 100 && y <= 100 ? `${x}% ${y}%` : "";
}

/**
 * A focal point, "50% 30%" (across, down): the part of a picture that stays
 * in view when it is cropped to fill a box. Two percentages from 0 to 100;
 * anything else is the centre.
 */
export function figureFocus(value) {
  return focalPoint(value) || "50% 50%";
}

/**
 * A figure can fill its pane (OPENBRAIN-84; Maura, 25 Nov: Plato and
 * Aristotle): `config.fill: true` on its row, with `config.focus` as the
 * focal point. The picture or film then covers the whole pane above the
 * toolbar row, edge to edge from under the top bar, cropped around that
 * point. Returns the focal point, or "" for a figure that keeps its whole
 * picture: every figure without the flag, a gallery (its stage has arrows
 * and thumbnails to keep clear of) and a YouTube item (a player is not
 * cropped). Only the pane uses it: the text column and the fullscreen
 * dialog always show the whole picture.
 */
export function figureFill(animation) {
  if (animation?.fill !== true) return "";
  const images = figureImages(animation);
  if (images.length !== 1 || images[0].youtube) return "";
  return figureFocus(animation.focus);
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

/**
 * The view a gallery opens in: "single" (one image, the first, turning on its
 * own) or "grid" (every image at once). Every set opens on its first image
 * (Anton, 11 Nov: the grid is one press away on "view all", not the start); a
 * figure's row can ask for the grid with `config.galleryStart: "grid"`.
 */
export function galleryStartView(count, preference) {
  if (!(count > 1)) return "single";
  return preference === "grid" ? "grid" : "single";
}

/** Columns for a grid of `count` images: wide (the pane, the dialog) and
 *  narrow (a phone's text column), so no row is left with one stray tile
 *  more often than it must be. */
export function gridColumns(count) {
  const wide =
    count <= 3
      ? Math.max(count, 1)
      : count === 4
        ? 2
        : count <= 6
          ? 3
          : count <= 12
            ? 4
            : 5;
  const narrow = count <= 4 ? Math.min(Math.max(count, 1), 2) : 3;
  return { wide, narrow };
}
