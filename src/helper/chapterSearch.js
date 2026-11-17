/*
 * Search inside the chapter being read (OPENBRAIN-197). Stuart, 11 Nov:
 * "where it currently says something like 'Ch 1 Where is my mind?', we can
 * remove that, and replace with a search bar."
 *
 * Client-side, over the chapter the reader already holds (useText), in the
 * order it is read: section and subsection headings, paragraphs, breakout
 * boxes, widgets, and each figure's title and legend. The order and the
 * anchors come from buildTimeline, so a result lands where the timeline
 * would. Pure: no store, no DOM.
 */
import { buildTimeline, plainText } from "@/helper/chapterTimeline";

/* How much of a paragraph a result shows around its first match. */
const SNIPPET_BEFORE = 36;
const SNIPPET_LENGTH = 132;

const QUOTES = { "’": "'", "‘": "'", "“": '"', "”": '"' };

/**
 * Lower case, accents dropped ("Ramón" finds "ramon"), curly quotes
 * straightened. One character out per character in, so a match found in
 * the folded text sits at the same place in the original.
 */
export function fold(text) {
  const s = String(text || "");
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    const base = (QUOTES[c] || c.normalize("NFD")[0] || c).toLowerCase();
    out += base.length === 1 ? base : c;
  }
  return out;
}

/* How much of a breakout box's title names it under a result. */
const WHERE_LENGTH = 44;

/*
 * A box is named by its title, cut at a word, never by its letter: the
 * reader no longer shows "Breakout box C" (Stuart, 11 Nov; OPENBRAIN-193),
 * so a letter here would point at nothing on the page.
 */
function shortTitle(title) {
  const text = String(title || "").trim();
  if (text.length <= WHERE_LENGTH) return text;
  let cut = text.slice(0, WHERE_LENGTH - 1);
  const space = cut.lastIndexOf(" ");
  if (space > WHERE_LENGTH * 0.6) cut = cut.slice(0, space);
  return cut.replace(/[\s,;:.–—-]+$/, "") + "…";
}

/* "Fig 05" / "Fig A" / "Fig": the pane toolbar's label for a figure. */
function figureTag(number) {
  if (number === undefined || number === null || number === "") return "Fig";
  const text = String(number);
  return `Fig ${/^\d+$/.test(text) ? text.padStart(2, "0") : text}`;
}

function recordFor(id, figures) {
  if (!id || !Array.isArray(figures)) return null;
  const bare = String(id).replace(/^animation/, "");
  return (
    figures.find((f) => f?.id === id) ||
    figures.find(
      (f) => String(f?.id || "").replace(/^animation/, "") === bare
    ) ||
    null
  );
}

/* A figure's legend: its own, then each image's (a gallery has several). */
function legendOf(record) {
  if (!record) return "";
  const parts = [record.caption || record.description || ""];
  for (const image of Array.isArray(record.images) ? record.images : [])
    if (image?.caption) parts.push(image.caption);
  return parts.map(plainText).filter(Boolean).join(" ");
}

/**
 * The chapter as searchable entries, in reading order.
 *
 * @param {{intro?: object[], sections?: object[]}} text  useText().text
 * @param {{ labels?: Record<string,string>, figures?: object[] }} [opts]
 *   labels: sectionLabelMap(text.sections); figures: the figure records
 *   (useAnimations), for the titles and legends the pane shows.
 * @returns {Entry[]}
 *
 * Entry: { order, kind: "section"|"box"|"subsection"|"text"|"figure"|
 *   "widget"|"video", id (the anchor readerJump finds), tag (what the row
 *   is: "Section 2", "Box", "Fig 05", "Interactive"), where (the section
 *   it is in), title, body, titleFolded, bodyFolded }
 */
export function buildSearchIndex(text, opts = {}) {
  const { items, sections, subsections } = buildTimeline(text, {
    labels: opts.labels,
    source: true,
  });
  const entries = [];
  const add = (entry) => {
    const title = (entry.title || "").trim();
    const body = (entry.body || "").trim();
    if (!entry.id || (!title && !body)) return;
    entries.push({
      ...entry,
      title,
      body,
      order: entries.length,
      titleFolded: fold(title),
      bodyFolded: fold(body),
    });
  };

  const runAt = new Map();
  for (const run of sections) runAt.set(run.start, run);
  const subsAt = new Map();
  for (const sub of subsections) {
    if (!subsAt.has(sub.start)) subsAt.set(sub.start, []);
    subsAt.get(sub.start).push(sub);
  }
  const whereOf = (run) =>
    run.kind === "box"
      ? shortTitle(run.title)
      : run.kind === "intro"
        ? run.title
        : [run.label, run.title].filter(Boolean).join(" · ");

  let run = null;
  let lastFigure = null;
  for (const item of items) {
    const starting = runAt.get(item.index);
    if (starting) {
      run = starting;
      if (!run.continued && run.title)
        add({
          kind: run.kind === "box" ? "box" : "section",
          id: run.anchorId,
          tag:
            run.kind === "box"
              ? "Box"
              : run.kind === "intro"
                ? "Section"
                : `Section ${run.label}`.trim(),
          where: "",
          title: run.title,
        });
    }
    const where = run ? whereOf(run) : "";
    for (const sub of subsAt.get(item.index) || [])
      add({
        kind: "subsection",
        id: sub.anchorId,
        tag: "Part",
        where,
        title: sub.title,
      });

    const p = item.source || {};
    // An item the data gave no id anchors nothing: land on its section.
    const id = /^tl-\d+$/.test(item.id) ? run?.anchorId : item.id;

    if (item.kind === "widget") {
      add({
        kind: "widget",
        id,
        tag: "Interactive",
        where,
        title: plainText(p.widget?.title) || item.title,
        body: plainText(p.widget?.blurb),
      });
      continue;
    }
    if (item.kind === "break") {
      add({
        kind: "video",
        id,
        tag: p.type === "breakVideo" ? "Video" : "Break",
        where,
        title: plainText(p.title),
        body: plainText(p.text),
      });
      continue;
    }

    if (p.explore?.title)
      add({
        kind: "subsection",
        id,
        tag: "Explore",
        where,
        title: plainText(p.explore.title),
        body: plainText(p.explore.prompt),
      });
    add({ kind: "text", id, tag: "", where, body: plainText(p.text) });

    // The figure this paragraph brings into the pane, once in a row.
    const figureId = p.animation?.id || p.animationId || "";
    if (figureId && figureId !== lastFigure) {
      const record = recordFor(figureId, opts.figures);
      const title = plainText(record?.title || p.animation?.title || "");
      const body = legendOf(record);
      if (title || body)
        add({
          kind: "figure",
          id,
          tag: figureTag(record?.figureNumber),
          where,
          title,
          body,
        });
    }
    if (figureId) lastFigure = figureId;
    const legends = [plainText(p.imgCap), plainText(p.explore?.legend)].filter(
      Boolean
    );
    if (legends.length)
      add({ kind: "figure", id, tag: "Fig", where, body: legends.join(" ") });
  }
  return entries;
}

/** The words of a query: folded, split on spaces, at most six. */
export function queryTerms(query) {
  return [...new Set(fold(query).split(/\s+/).filter(Boolean))].slice(0, 6);
}

/* Every place a term occurs in `folded`, merged where they touch. */
function rangesIn(folded, terms) {
  const found = [];
  for (const term of terms) {
    let at = folded.indexOf(term);
    while (at !== -1) {
      found.push([at, at + term.length]);
      at = folded.indexOf(term, at + term.length);
    }
  }
  found.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const merged = [];
  for (const range of found) {
    const last = merged[merged.length - 1];
    if (last && range[0] <= last[1]) last[1] = Math.max(last[1], range[1]);
    else merged.push([...range]);
  }
  return merged;
}

/* `text` from `from` to `to` as [{ text, hit }], the matches marked. */
function partsOf(text, ranges, from = 0, to = text.length) {
  const parts = [];
  let at = from;
  for (const [start, end] of ranges) {
    if (end <= from || start >= to) continue;
    const s = Math.max(start, from);
    const e = Math.min(end, to);
    if (s > at) parts.push({ text: text.slice(at, s), hit: false });
    parts.push({ text: text.slice(s, e), hit: true });
    at = e;
  }
  if (at < to) parts.push({ text: text.slice(at, to), hit: false });
  return parts;
}

/* A window of the body around its first match, cut at words. */
function snippet(body, ranges) {
  if (body.length <= SNIPPET_LENGTH) return partsOf(body, ranges);
  const first = ranges[0]?.[0] ?? 0;
  let from = Math.max(0, first - SNIPPET_BEFORE);
  if (from > 0) {
    const space = body.indexOf(" ", from);
    from = space !== -1 && space < first ? space + 1 : from;
  }
  let to = Math.min(body.length, from + SNIPPET_LENGTH);
  if (to < body.length) {
    const space = body.lastIndexOf(" ", to);
    if (space > from + SNIPPET_LENGTH * 0.6) to = space;
  }
  const parts = partsOf(body, ranges, from, to);
  if (from > 0) parts.unshift({ text: "…", hit: false });
  if (to < body.length) parts.push({ text: "…", hit: false });
  return parts;
}

const HEADING = new Set(["section", "box", "subsection"]);

/**
 * Entries that hold every word of the query, as rows to show. Headings
 * that match come first, then figure and widget titles, then the text, each
 * in reading order.
 *
 * @returns {{ total: number, results: Array<{ entry, title: Part[],
 *   body: Part[] }> }}   Part: { text, hit }
 */
export function searchChapter(index, query, { limit = 20 } = {}) {
  const terms = queryTerms(query);
  if (!terms.length || terms.every((t) => t.length < 2))
    return { total: 0, results: [] };
  const matches = [];
  for (const entry of index || []) {
    const inTitle = terms.filter((t) => entry.titleFolded.includes(t));
    if (
      !terms.every((t) => inTitle.includes(t) || entry.bodyFolded.includes(t))
    )
      continue;
    const titleHit = inTitle.length === terms.length;
    const rank = titleHit ? (HEADING.has(entry.kind) ? 0 : 1) : 2;
    matches.push({ entry, rank });
  }
  matches.sort((a, b) => a.rank - b.rank || a.entry.order - b.entry.order);
  return {
    total: matches.length,
    results: matches.slice(0, limit).map(({ entry }) => {
      const bodyRanges = rangesIn(entry.bodyFolded, terms);
      return {
        entry,
        title: partsOf(entry.title, rangesIn(entry.titleFolded, terms)),
        // A body with no match of its own (the title matched) shows its start.
        body: entry.body ? snippet(entry.body, bodyRanges) : [],
      };
    }),
  };
}
