/*
 * boxTitleCard — how a side-scrolling breakout box opens (OPENBRAIN-77,
 * Maura's scroll sketch of 23 Nov, idea 1; the box itself is
 * helper/exploreRail.js).
 *
 * A box whose first part leads with a picture opens on that picture alone,
 * filling the screen. The box's title, the first sentence or two of its
 * text, a "more" link and a "Skip" pill then fade in over it, darkened.
 * Scrolling on, the picture shrinks into its place at the start of the
 * track and the track takes over. A box with no lead picture opens as it
 * always did.
 *
 * On the pinned track the card is a stretch of the pin's scroll before the
 * track moves (CARD_SCREENS of the screen, which useExploreRail adds to the
 * pin's lead-in, so every landing on the track is past it). Nothing here
 * runs on a clock except the copy's fade-in: the picture's flight is the
 * page's scroll position, forwards and back. Under reduced motion, and on
 * the phone's swipe track, the card is a still block before the box, and
 * nothing is said or shown twice: the card carries the box's title (the
 * box's own heading is kept for screen readers only) and its picture (the
 * track leaves that plate out; the card's expand button opens it full
 * screen, where its legend is).
 *
 * This file is the part with no framework in it: which picture leads,
 * which words are quoted, and what the card shows at each point of its
 * scroll. BoxTitleCard.vue draws it; BreakoutBox places and drives it.
 */
import { imageUrl } from "@/editor/media.mjs";
import { plainText } from "@/helper/chapterTimeline";
import { figureImages } from "@/helper/figureCycle";
import { railPlatesOf } from "@/helper/railFigure";

/** Screens of page scroll the card takes before the track's own lead-in. */
export const CARD_SCREENS = 1.1;
/** The part of that scroll in which nothing moves: the card is read. */
export const CARD_HOLD = 0.42;
/** By this point of it the words are gone and only the picture travels. */
export const CARD_COPY_OUT = 0.6;
/** The copy fades in once the box is within this much of a screen of its
 *  pin (it is the picture alone that arrives). */
export const CARD_NEAR = 0.3;
/** A named-box jump opens with readable copy, after the image-only arrival. */
export const CARD_READ = 0.25;
/** The longest quotation, in characters. */
export const CARD_EXCERPT_MAX = 220;
/** A first sentence shorter than this brings the second with it. */
export const CARD_EXCERPT_MIN = 90;

const clamp01 = (n) => Math.min(1, Math.max(0, Number(n) || 0));
/* Ease in and out: the picture starts and settles gently, whatever the
   wheel does. */
const ease = (t) => t * t * (3 - 2 * t);

/**
 * The picture a box's track leads with, or null: the first part's Explore
 * picture, else the first image of its first figure (a still, never a
 * video's poster). It is the first picture RailPart draws, so it is where
 * the card's picture lands.
 * @param {{ parts?: { paragraphs?: object[], figures?: object[] }[] } | null} layout
 *   from railLayoutOf
 * @param {object | null} [record] the first part's first figure's record
 * @returns {{ src: string, alt: string } | null}
 */
export function cardLeadPicture(layout, record = null) {
  const part = layout?.parts?.[0];
  if (!part) return null;
  const own = part.paragraphs?.[0]?.explore?.image;
  if (own?.src) return { src: imageUrl(own.src), alt: own.alt || "" };
  if (!part.figures?.length || !record) return null;
  if (record.widgetId || record.isTransition) return null;
  const image = figureImages(record)[0];
  if (!image || image.youtube) return null;
  return { src: imageUrl(image.src), alt: image.alt || "" };
}

/**
 * Whether the track draws the lead picture as a plate of its own (an
 * Explore picture, or an image figure of up to three stills: RailFigure),
 * which is what a still card can take off the track (RailPart leaves the
 * plate out, so the picture is not shown twice in a row). A figure the
 * shell draws (a larger set) cannot give one image up: no still card then.
 */
export function cardLeadIsPlate(layout, record = null) {
  const part = layout?.parts?.[0];
  if (!part) return false;
  if (part.paragraphs?.[0]?.explore?.image?.src) return true;
  return !!railPlatesOf(record);
}

/** The id of the figure cardLeadPicture may need the record of, or "". */
export function cardLeadFigureId(layout) {
  const part = layout?.parts?.[0];
  if (!part || part.paragraphs?.[0]?.explore?.image?.src) return "";
  return part.figures?.[0]?.animation?.id || "";
}

/* "Dr." and an initial do not end a sentence. */
const ABBREVIATION =
  /(?:\b(?:Dr|Mr|Mrs|Ms|St|Prof|Fig|vs|etc|ca|c|e\.g|i\.e)|\b[A-Z])\.["”’)\]]*\s*$/;
const SENTENCE = /[^.!?…]+(?:[.!?…]+["”’)\]]*(?:\s+|$)|$)/g;

/**
 * The first sentence or two of a box's opening text, as one plain line:
 * one sentence when it is long enough to stand alone, else two; cut at a
 * word with "…" past CARD_EXCERPT_MAX.
 * @param {string} html the opening paragraph's HTML
 */
export function cardExcerpt(html) {
  const text = plainText(html);
  if (!text) return "";
  const sentences = [];
  let open = "";
  for (const piece of text.match(SENTENCE) || [text]) {
    open += piece;
    if (ABBREVIATION.test(open)) continue;
    sentences.push(open);
    open = "";
    if (sentences.length === 2) break;
  }
  if (open && sentences.length < 2) sentences.push(open);
  let out = (sentences[0] || "").trim();
  if (out.length < CARD_EXCERPT_MIN && sentences[1])
    out = `${out} ${sentences[1].trim()}`;
  if (out.length <= CARD_EXCERPT_MAX) return out;
  let cut = out.slice(0, CARD_EXCERPT_MAX - 1);
  const space = cut.lastIndexOf(" ");
  if (space > CARD_EXCERPT_MAX * 0.6) cut = cut.slice(0, space);
  return cut.replace(/[\s,;:.–—-]+$/, "") + "…";
}

/** The opening text of a box's track: its first part's first paragraph. */
export function cardExcerptOf(layout) {
  return cardExcerpt(layout?.parts?.[0]?.paragraphs?.[0]?.text || "");
}

/**
 * What the card shows `progress` of the way through its scroll (0: the box
 * has just pinned; 1: the track has taken over).
 * - `copy`: the words' and the Skip pill's opacity.
 * - `move`: how far the picture is on its way to the track, eased.
 * - `scrim`: the darkening over the picture.
 * - `ground`: the box's colour behind the picture, which hides the track
 *   until the picture is most of the way there.
 * - `done`: the track has taken over; the card is out of the way.
 * @param {number} progress
 */
export function cardFrame(progress) {
  const p = clamp01(progress);
  const move = ease(clamp01((p - CARD_HOLD) / (0.9 - CARD_HOLD)));
  return {
    copy:
      clamp01((p - 0.1) / (CARD_READ - 0.1)) *
      (1 - clamp01((p - CARD_HOLD) / (CARD_COPY_OUT - CARD_HOLD))),
    move,
    scrim: 1 - move,
    ground: 1 - ease(clamp01((move - 0.3) / 0.7)),
    done: p >= 1,
  };
}

/**
 * The picture's box `t` of the way from `from` to `to` (both
 * { left, top, width, height }).
 */
export function cardRect(from, to, t) {
  const k = clamp01(t);
  const mix = (a, b) => a + (b - a) * k;
  return {
    left: mix(from.left, to.left),
    top: mix(from.top, to.top),
    width: mix(from.width, to.width),
    height: mix(from.height, to.height),
  };
}
