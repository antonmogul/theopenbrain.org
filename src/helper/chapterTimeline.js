/*
 * Chapter timeline model (OPENBRAIN-128) — the chapter as the bars of the
 * dock at the bottom of the reader, SoundCloud-waveform style: one bar per
 * thing the reader passes (a paragraph, a widget, a break), in the order
 * TextComp renders them, as tall as the paragraph is long.
 *
 * Pure functions over the transformed chapter useText holds (chapterTransform
 * output, or the legacy text.json it mirrors): no Vue, no store, no DOM, so
 * the dock, the map, the composable and the tests share one model.
 * useChapterTimeline measures the DOM against it; ChapterTimeline draws it.
 */

/** Where the reader is: this fraction of the viewport height from the top. */
export const READING_LINE = 0.4;
/** px, the dock at rest (published as --reader-timeline-h). */
export const REST_H = 20;
/** px, the dock expanded (peek). */
export const PEEK_H = 104;

const EXCERPT_MAX = 140;
const MIN_HEIGHT = 0.15;
const BAR_GAP = 1;
const SECTION_GAP = 4;
// Narrower than this, neighbouring items share a bar (≈ 3px per item with
// the 1px gap).
const MIN_BAR_W = 2;
// The references list is a list, not reading (ReferenceList).
const REFERENCES_TITLE = /^(references|footnotes)$/i;
// "Looking forward" carries an animation_config named Placeholder: a
// trigger for an empty pane, not a figure.
const PLACEHOLDER_FIGURE = /^placeholder$/i;

/* ---- Plain text ------------------------------------------------------- */

// Citation and footnote markers go with their numbers, or the numbers glue
// onto the word before them ("amacrine cells17,21."): the Retina's
// <sup data-sup='17'>17,</sup>, citation_ref blocks' <sup class="citation-ref">,
// and a bare <sup>31</sup> right after punctuation. Other <sup>s (mm², 5th,
// Na+) keep their text.
const CITATION_SUP =
  /<sup\b(?=[^>]*\b(?:data-(?:sup|ref|footnote)\b|class\s*=\s*["'][^"']*\b(?:citation-ref|footnote)\b))[^>]*>[\s\S]*?<\/sup>/gi;
const BARE_CITATION_SUP = /([.,;:!?)\]"'”’])\s*<sup>[\d\s,–-]+<\/sup>/gi;
// Block-level tags become a space so "…end.</p><p>Next…" stays two words;
// inline tags vanish so "<strong>Rhodopsin</strong>:" reads "Rhodopsin:".
const BLOCK_TAG =
  /<\/?(?:p|div|br|hr|li|ul|ol|h[1-6]|blockquote|figure|figcaption|table|tr|td|th|section|aside)\b[^>]*>/gi;
const NAMED_ENTITIES = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
};

function decodeEntity(match, body) {
  if (body[0] === "#") {
    const code =
      body[1] === "x" || body[1] === "X"
        ? parseInt(body.slice(2), 16)
        : parseInt(body.slice(1), 10);
    return Number.isInteger(code) && code > 0 && code <= 0x10ffff
      ? String.fromCodePoint(code)
      : match;
  }
  return NAMED_ENTITIES[body.toLowerCase()] ?? match;
}

/** A paragraph's HTML as one line of plain text. */
export function plainText(html) {
  if (typeof html !== "string" || !html) return "";
  return html
    .replace(CITATION_SUP, "")
    .replace(BARE_CITATION_SUP, "$1")
    .replace(BLOCK_TAG, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, decodeEntity)
    .replace(/\s+/g, " ")
    .trim();
}

const countWords = (text) => (text ? text.split(" ").length : 0);

/** ≤ 140 chars, cut at a word where one is near, with "…" when cut. */
function clip(text, max = EXCERPT_MAX) {
  if (!text || text.length <= max) return text || "";
  let cut = text.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  if (space > max * 0.6) cut = cut.slice(0, space);
  return cut.replace(/[\s,;:.–—-]+$/, "") + "…";
}

/* ---- Marks (the content lane) ----------------------------------------- */

const figureKey = (animation) =>
  animation.id || animation.name || animation.title;

function figureMark(animation) {
  return {
    type: "figure",
    title: animation.title || animation.name || "Figure",
  };
}

/** What a paragraph shows besides its text: figure, image, video, widget… */
function marksFor(p) {
  const marks = [];
  if (p.type === "widget")
    marks.push({
      type: "widget",
      title: p.widget?.title || p.widget?.widgetId || "Widget",
    });
  if (p.type === "breakVideo")
    marks.push({ type: "video", title: p.title || "Video" });
  if (p.type === "breakSection")
    marks.push({ type: "break", title: p.title || "Break" });
  if (p.animation && figureKey(p.animation))
    marks.push(figureMark(p.animation));
  // A full-screen figure carries its key, not an animation object
  // (transformParagraph skips `animation` on those rows).
  if (p.animationFull)
    marks.push({
      type: "figure",
      title:
        p.title ||
        String(p.animationId || "").replace(/^animation/, "") ||
        "Figure",
    });
  if (p.img)
    marks.push({ type: "image", title: clip(plainText(p.imgCap)) || "Image" });
  if (p.video) marks.push({ type: "video", title: p.video.title || "Video" });
  return marks;
}

function kindOf(p) {
  if (p.type === "widget") return "widget";
  if (p.type === "breakVideo" || p.type === "breakSection") return "break";
  return "text";
}

/* ---- The model -------------------------------------------------------- */

/* The full-height reference: the 95th percentile (nearest rank) of the
   text items' word counts, so one very long paragraph doesn't flatten the
   rest. ≥ 1. */
function referenceWords(items) {
  const words = items
    .filter((i) => i.kind === "text")
    .map((i) => i.words || 0)
    .sort((a, b) => a - b);
  if (!words.length) return 1;
  return Math.max(1, words[Math.ceil(words.length * 0.95) - 1]);
}

/**
 * The chapter as timeline items, in the order TextComp renders it: the
 * intro, then every top-level section walked depth-first (subsection
 * wrappers, sub-subsection groups), with each anchored breakout box right
 * after the paragraph it follows (SectionComp's boxesAfter).
 *
 * A section a box interrupts comes back as a second run after the box: the
 * same key, label and title, `continued: true`. So `sections` is a partition
 * of the items into contiguous runs in render order, and a consumer that
 * lists sections once (the map) skips the continued runs.
 *
 * Figures triggered by a container (a section's, subsection's or sub-sub
 * group's animation) mark the first item under it, once per figure in a row:
 * the Retina's subsections repeat RetinalCellTypes across three headers.
 *
 * @param {{intro?: object[], sections?: object[]}} text  useText().text
 * @param {{labels?: Record<string,string>}} [opts]       sectionLabelMap(text.sections)
 * @returns {{ items: Item[], sections: Section[], subsections: Sub[],
 *   maxWords: number, byId: Map<string, number> }}
 *
 * Item: { index, id, kind: "text"|"widget"|"break", sectionKey, words, excerpt,
 *   title?, marks: Array<{ type, title }>, widget? }
 *   (id is the paragraph id; one the data lacks becomes "tl-<index>", which
 *   anchors nothing.)
 * Section: { key, label, title, kind: "intro"|"section"|"box", anchorId,
 *   start, end, continued }   — [start, end) item range
 * Sub: { title, anchorId, sectionKey, start }
 */
export function buildTimeline(text, opts = {}) {
  const labels = opts?.labels || {};
  const items = [];
  const sections = [];
  const subsections = [];
  const byId = new Map();

  // Boxes placed after a paragraph (placeBoxes marks them anchored).
  const boxesAfter = new Map();
  for (const s of text?.sections || []) {
    if (!s?.anchored || !s.anchorParagraphId) continue;
    if (!boxesAfter.has(s.anchorParagraphId))
      boxesAfter.set(s.anchorParagraphId, []);
    boxesAfter.get(s.anchorParagraphId).push(s);
  }
  const walked = new Set();

  let current = null; // the section being walked
  const seen = new Set(); // sections that already have a run
  let pending = []; // container figures waiting for their first item
  let lastFigure = null;

  function queueFigure(animation) {
    if (!animation || typeof animation !== "object") return;
    const key = figureKey(animation);
    if (!key || PLACEHOLDER_FIGURE.test(animation.name || "")) return;
    if (key === lastFigure) return;
    lastFigure = key;
    pending.push(figureMark(animation));
  }

  // A container's figures go to its first item; if it has none they lapse
  // rather than land on the next container's.
  function inContainer(animation, walk) {
    const before = items.length;
    const queued = pending.length;
    const figure = lastFigure;
    queueFigure(animation);
    walk();
    if (items.length === before) {
      pending = pending.slice(0, queued);
      lastFigure = figure;
    }
  }

  function push(item) {
    item.index = items.length;
    const run = sections[sections.length - 1];
    if (run && run.desc === current && run.end === item.index) run.end += 1;
    else {
      sections.push({
        desc: current,
        key: current.key,
        label: current.label,
        title: current.title,
        kind: current.kind,
        anchorId: current.anchorId,
        start: item.index,
        end: item.index + 1,
        continued: seen.has(current),
      });
      seen.add(current);
    }
    if (item.id && !byId.has(item.id)) byId.set(item.id, item.index);
    else if (!item.id) item.id = `tl-${item.index}`;
    items.push(item);
  }

  function emit(p) {
    if (p._isFurtherReading || p._isFootnote) return;
    const kind = kindOf(p);
    const own = marksFor(p);
    const plain = kind === "text" ? plainText(p.text) : "";
    const words = countWords(plain);
    // An empty paragraph is no bar, unless it shows something (an image
    // or video paragraph keeps a minimum-height bar).
    if (kind === "text" && !words && !own.length) return;

    const item = {
      index: 0,
      id: p.id != null ? String(p.id) : "",
      kind,
      sectionKey: current.key,
      words,
      excerpt: "",
      marks: [...pending, ...own],
    };
    pending = [];
    if (p.animation && figureKey(p.animation))
      lastFigure = figureKey(p.animation);

    if (kind === "text") item.excerpt = clip(plain);
    else if (kind === "widget") {
      const w = p.widget || {};
      item.title = w.title || w.widgetId || "Widget";
      item.excerpt = clip(plainText(w.blurb)) || item.title;
      item.widget = {
        widgetId: w.widgetId || "",
        placementId: w.placementId || w.widgetId || "",
        kind: w.kind === "inline" ? "inline" : "breakout",
        title: w.title || "",
        blurb: w.blurb || "",
        credit: w.credit || "",
      };
    } else {
      const fallback = p.type === "breakVideo" ? "Video" : "Break";
      item.title = plainText(p.title) || fallback;
      // Its title; an untitled break (the Retina's "Counting photons")
      // opens with its text instead.
      item.excerpt =
        clip(plainText(p.title)) || clip(plainText(p.text)) || fallback;
    }
    push(item);
  }

  function visit(p) {
    if (!p || typeof p !== "object") return;
    // { subSection: [...] } wrapper: each subsection is a header (no bar)
    // over its paragraphs (SubSection.vue).
    if (Array.isArray(p.subSection)) {
      for (const sub of p.subSection) visitSub(sub);
      return;
    }
    // { subSubSection: [...] } wrapper (SubSubSection.vue): leaf entries
    // are paragraphs, entries with `paragraphs` are groups.
    if (Array.isArray(p.subSubSection)) {
      for (const entry of p.subSubSection) visit(entry);
      return;
    }
    if (Array.isArray(p.paragraphs)) {
      // A group: text.json's sub-sub groups and bare { paragraphs } wrappers
      // (the importer flattens both into rows, so live chapters have none).
      inContainer(p.animation, () => walkList(p.paragraphs));
    } else emit(p);
    if (p.id != null)
      for (const box of boxesAfter.get(p.id) || []) walkBox(box);
  }

  function visitSub(sub) {
    if (!sub || typeof sub !== "object") return;
    const entry = {
      title: String(sub.title || "").trim(),
      anchorId: sub.id ?? null,
      sectionKey: current.key,
      start: items.length,
    };
    if (entry.title) subsections.push(entry);
    inContainer(sub.animation, () => walkList(sub.paragraphs));
    // A subsection-level full-screen figure plays after its paragraphs.
    if (sub.animationFull && items.length > entry.start)
      items[items.length - 1].marks.push({
        type: "figure",
        title: sub.title || "Figure",
      });
    // A header with nothing under it has no bar to point at.
    if (entry.title && items.length === entry.start)
      subsections.splice(subsections.indexOf(entry), 1);
  }

  function walkList(list) {
    for (const p of list || []) visit(p);
  }

  function walkSection(section, kind) {
    if (walked.has(section)) return;
    walked.add(section);
    const key = section.id || section.title;
    const outer = current;
    const outerPending = pending;
    current = {
      key,
      label: kind === "intro" ? "" : (labels[key] ?? ""),
      title:
        kind === "intro"
          ? section.sectionTitle || section.title || "Introduction"
          : section.title || "",
      kind,
      anchorId: section.id ?? null,
    };
    pending = [];
    inContainer(section.animation, () => walkList(section.paragraphs));
    current = outer;
    pending = outerPending;
  }

  const walkBox = (box) => walkSection(box, "box");

  const isReferences = (s) =>
    REFERENCES_TITLE.test(String(s.slug || "")) ||
    REFERENCES_TITLE.test(String(s.title || "").trim());

  for (const intro of text?.intro || []) {
    if (intro && typeof intro === "object") walkSection(intro, "intro");
  }
  for (const section of text?.sections || []) {
    if (!section || section.anchored || isReferences(section)) continue;
    walkSection(section, section.kind === "box" ? "box" : "section");
  }

  for (const run of sections) delete run.desc;
  return {
    items,
    sections,
    subsections,
    maxWords: referenceWords(items),
    byId,
  };
}

/** Bar height 0.15..1 for an item: text → clamp(words / maxWords); widget/break → 1. */
export function barHeight(item, maxWords) {
  if (!item) return MIN_HEIGHT;
  if (item.kind === "widget" || item.kind === "break") return 1;
  const ref = maxWords > 0 ? maxWords : 1;
  return Math.min(1, Math.max(MIN_HEIGHT, (item.words || 0) / ref));
}

/* ---- Layout ----------------------------------------------------------- */

/* Contiguous [start, end) runs of one section: section starts from
   `sections`, plus any change of sectionKey (robust to a partial list). */
function sectionRuns(items, sections) {
  const starts = new Set((sections || []).map((s) => s.start));
  const runs = [];
  for (let i = 0; i < items.length; i++) {
    const last = runs[runs.length - 1];
    if (
      !last ||
      starts.has(i) ||
      items[i].sectionKey !== items[i - 1].sectionKey
    )
      runs.push({ start: i, end: i + 1 });
    else last.end = i + 1;
  }
  return runs;
}

/**
 * Lay items out across `width` px: equal-width bars, a 1px gap between bars
 * and 4px before each section's first bar. When a bar would be narrower than
 * 2px (under ~3px per item), neighbouring items of the SAME section share a
 * bar (an even bucket), as few per bar as keep every bar ≥ 2px wide.
 *
 * Bar: { from, to, x, w, height, kind, sectionStart, sectionKey } — [from, to)
 * is the item range (like a Section's [start, end)), height the tallest
 * member's barHeight, kind "block" if any member is a widget or break.
 * indexAtX(x): the item under x (the nearest bar's `from`), clamped to
 * [0, n - 1]; -1 when there are no items.
 *
 * @param {Item[]} items
 * @param {Section[]} sections
 * @param {number} width
 * @param {number} [maxWords]  the model's maxWords; derived from `items`
 *   the same way when omitted
 */
export function layoutBars(items, sections, width, maxWords) {
  const list = items || [];
  const n = list.length;
  if (!n || !(width > 0)) return { bars: [], indexAtX: () => (n ? 0 : -1) };

  const ref = maxWords > 0 ? maxWords : referenceWords(list);
  const runs = sectionRuns(list, sections);
  const longest = Math.max(...runs.map((r) => r.end - r.start));

  // Bar width for a bucket size k: what is left after the gaps, shared.
  const count = (k) =>
    runs.reduce((sum, r) => sum + Math.ceil((r.end - r.start) / k), 0);
  const barWidth = (k) => {
    const bars = count(k);
    const gaps =
      (bars - runs.length) * BAR_GAP + (runs.length - 1) * SECTION_GAP;
    return (width - gaps) / bars;
  };
  let k = 1;
  while (k < longest && barWidth(k) < MIN_BAR_W) k += 1;
  const w = Math.max(0, barWidth(k));

  const bars = [];
  let x = 0;
  for (const run of runs) {
    const size = run.end - run.start;
    const buckets = Math.ceil(size / k);
    for (let b = 0; b < buckets; b++) {
      // Even buckets: sizes differ by at most one item.
      const from = run.start + Math.floor((b * size) / buckets);
      const to = run.start + Math.floor(((b + 1) * size) / buckets);
      if (bars.length) x += b === 0 ? SECTION_GAP : BAR_GAP;
      let height = 0;
      let block = false;
      for (let i = from; i < to; i++) {
        height = Math.max(height, barHeight(list[i], ref));
        if (list[i].kind === "widget" || list[i].kind === "break") block = true;
      }
      bars.push({
        from,
        to,
        x,
        w,
        height,
        kind: block ? "block" : "text",
        sectionStart: b === 0,
        sectionKey: list[from].sectionKey,
      });
      x += w;
    }
  }

  function indexAtX(px) {
    if (!Number.isFinite(px) || px <= bars[0].x) return bars[0].from;
    const last = bars[bars.length - 1];
    if (px >= last.x) return Math.min(n - 1, last.from);
    // Last bar starting at or before px; in a gap, the nearer neighbour.
    let lo = 0;
    let hi = bars.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (bars[mid].x <= px) lo = mid;
      else hi = mid - 1;
    }
    const bar = bars[lo];
    const next = bars[lo + 1];
    if (px > bar.x + bar.w && next && next.x - px < px - (bar.x + bar.w))
      return next.from;
    return bar.from;
  }

  return { bars, indexAtX };
}

/* ---- Scroll geometry -------------------------------------------------- */

/** Cumulative-max copy of `tops`; NaN/undefined entries take the previous value (first: 0). */
export function monotonic(tops) {
  const out = [];
  let prev = null;
  for (const v of tops || []) {
    if (Number.isFinite(v)) prev = prev === null ? v : Math.max(prev, v);
    else if (prev === null) prev = 0;
    out.push(prev);
  }
  return out;
}

/**
 * The reading line's position as a fractional item index in [0, n]:
 * before tops[0] → 0; between tops[i] and tops[i+1] → i + fraction; past
 * `endY` → n; between tops[n-1] and endY → n-1 + fraction. `tops` must be
 * non-decreasing (monotonic()). Without a usable endY (missing, or not
 * below the last top) the last item counts as read once its top passes.
 */
export function positionForY(tops, readingY, endY) {
  const n = tops?.length || 0;
  if (!n || !Number.isFinite(readingY) || !(readingY >= tops[0])) return 0;
  const lastTop = tops[n - 1];
  const end = Number.isFinite(endY) && endY > lastTop ? endY : lastTop;
  if (readingY >= end) return n;
  // Last item whose top is at or above the reading line.
  let lo = 0;
  let hi = n - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (tops[mid] <= readingY) lo = mid;
    else hi = mid - 1;
  }
  const from = tops[lo];
  const to = lo + 1 < n ? tops[lo + 1] : end;
  const fraction = to > from ? (readingY - from) / (to - from) : 0;
  return Math.min(n, lo + Math.min(1, Math.max(0, fraction)));
}

/** scrollY that puts item `index`'s top at `topInset` px below the viewport top (≥ 0). */
export function scrollYForIndex(tops, index, topInset) {
  const n = tops?.length || 0;
  if (!n) return 0;
  const i = Math.min(n - 1, Math.max(0, Math.floor(Number(index) || 0)));
  const y = tops[i] - (Number(topInset) || 0);
  return Number.isFinite(y) ? Math.max(0, y) : 0;
}

/** Index of the section containing item `index` (or -1). */
export function sectionIndexOf(sections, index) {
  if (!Array.isArray(sections) || !Number.isFinite(index)) return -1;
  const i = Math.floor(index);
  return sections.findIndex((s) => s.start <= i && i < s.end);
}
