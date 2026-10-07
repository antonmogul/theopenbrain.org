/*
 * Timeline fixtures (OPENBRAIN-128) — the real Retina chapter as the chapter
 * timeline sees it, for the timeline's stories and tests.
 *
 * text.json is the Retina as it was before it moved to Supabase. The
 * fixture gives it what the live chapter has and the JSON lacks: an id on
 * every paragraph and subsection (normalised where one is missing), section
 * slugs, and the chapter's three widgets, placed where src/widgets/
 * placements.js puts them in the reader. The layers (the reader's highlights
 * and notes, other readers' trending passages) quote the chapter's own
 * paragraphs, so every lane and preview card has something real to show.
 */
import text from "@/assets/json_backend/text.json";
import { buildTimeline, plainText } from "@/helper/chapterTimeline";
import { sectionLabelMap } from "@/composables/useChapterOutline";
import {
  applyWidgetPlacements,
  placementsForChapter,
} from "@/widgets/placements";

export const RETINA_TITLE = "The Retina";

const slugify = (title) =>
  String(title || "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/* Ids for anything that renders without one, as the importer would give. */
function normalise(list, prefix) {
  (list || []).forEach((p, i) => {
    if (!p || typeof p !== "object") return;
    const id = `${prefix}-${i}`;
    if (Array.isArray(p.subSection))
      p.subSection.forEach((sub, j) => {
        sub.id ??= `${id}-sub-${j}`;
        normalise(sub.paragraphs, `${id}-sub-${j}`);
      });
    else if (Array.isArray(p.subSubSection)) normalise(p.subSubSection, id);
    else if (Array.isArray(p.paragraphs)) normalise(p.paragraphs, id);
    else p.id ??= id;
  });
}

/** The Retina in the reader's shape, with its widgets placed. */
export function retinaText() {
  const chapter = JSON.parse(JSON.stringify(text));
  for (const [i, section] of [
    ...(chapter.intro || []),
    ...(chapter.sections || []),
  ].entries()) {
    section.id ??= `retina-section-${i}`;
    section.slug ??= slugify(section.title);
    normalise(section.paragraphs, section.id);
  }
  applyWidgetPlacements(chapter, placementsForChapter("the-retina"));
  return chapter;
}

/** buildTimeline over the Retina, labelled as the reader labels it. */
export function retinaModel() {
  const chapter = retinaText();
  return buildTimeline(chapter, { labels: sectionLabelMap(chapter.sections) });
}

/** A chapter with nothing to show yet (a draft without paragraphs). */
export const EMPTY_MODEL = buildTimeline({ intro: [], sections: [] });

export const emptyLayers = () => ({
  highlights: new Map(),
  notes: new Map(),
  trending: new Map(),
});

/** The reading position (fractional item index) at `percent` of the way. */
export function positionAt(model, percent) {
  return (model.items.length * Math.min(100, Math.max(0, percent))) / 100;
}

/** The reading percentage a fractional item index stands for. */
export function percentAt(model, position) {
  const n = model.items.length;
  return n ? Math.min(100, (position / n) * 100) : 0;
}

/** The first `count` words of an item's text, the way a reader selects. */
function quote(item, count) {
  const words = (item?.excerpt || "").replace(/…$/, "").split(" ");
  return words
    .slice(0, count)
    .join(" ")
    .replace(/[,;:]$/, "");
}

/* Prose paragraphs long enough to quote, by position in the chapter. */
const prose = (model) =>
  model.items.filter((i) => i.kind === "text" && i.words >= 40);

/**
 * Layers as useChapterTimeline gathers them: Maps of item index → entries.
 * Signed out, a reader has no highlights or notes; trending is everyone's.
 */
export function retinaLayers(model, { signedIn = true } = {}) {
  const layers = emptyLayers();
  const p = prose(model);
  const at = (n) => p[Math.min(p.length - 1, n)];

  if (signedIn) {
    const highlight = (n, color, words, id) => {
      const item = at(n);
      if (!item) return;
      const list = layers.highlights.get(item.index) || [];
      list.push({ id, color, text: quote(item, words) });
      layers.highlights.set(item.index, list);
    };
    highlight(1, "yellow", 12, "hl-1");
    highlight(8, "green", 9, "hl-2");
    highlight(15, "blue", 14, "hl-3");
    highlight(15, "pink", 6, "hl-4");
    highlight(28, "purple", 10, "hl-5");
    highlight(40, "yellow", 11, "hl-6");

    const note = (n, content, id) => {
      const item = at(n);
      if (!item) return;
      const list = layers.notes.get(item.index) || [];
      list.push({ id, content });
      layers.notes.set(item.index, list);
    };
    note(8, "Compare with the diagram from Tuesday's lecture.", "note-1");
    note(22, "Ask about this in the seminar.", "note-2");
    note(40, "Good summary for the essay.", "note-3");
  }

  const trend = (n, rows) => {
    const item = at(n);
    if (!item) return;
    layers.trending.set(
      item.index,
      rows.map(([count, words]) => ({ count, text: quote(item, words) }))
    );
  };
  trend(3, [[23, 13]]);
  trend(15, [
    [12, 10],
    [4, 6],
  ]);
  trend(25, [[8, 9]]);
  trend(33, [[5, 12]]);
  trend(45, [[3, 8]]);
  return layers;
}

/** The opening paragraphs of "Story of the eye", as plain text: a page
    for a story to put the dock over. */
export function retinaProse(count = 3) {
  const story = text.sections[0]?.paragraphs || [];
  return story
    .map((p) => plainText(p.text))
    .filter((t) => t.split(" ").length > 60)
    .slice(0, count);
}

/** The first item index of a kind ("widget", "break") or matching a test. */
export function firstIndexOf(model, test) {
  const match = model.items.find((item) =>
    typeof test === "function" ? test(item) : item.kind === test
  );
  return match ? match.index : -1;
}
