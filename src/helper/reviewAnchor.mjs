/*
 * reviewAnchor — where a reviewer's note points (OPENBRAIN-204).
 *
 * Anton, 18 Nov: pointing is the most important part of the review widget.
 * A note must say exactly where it is, and whoever picks it up must get
 * back to that exact place. So the widget never stores a bare CSS path: it
 * reads the reader's own DOM contract (the ids the chapter timeline and
 * readerJump already use) and keeps them in an anchor record, with a human
 * label for the dashboard and a point inside the thing pointed at.
 *
 * Three jobs, one file, so the widget and the locate script
 * (scripts/feedback/locate.mjs, which bundles this file into the page)
 * read the page the same way:
 *
 * - pickTarget(stack, opts): the meaningful thing under the pointer, from
 *   the elementsFromPoint stack (topmost first), not the innermost element.
 *   The priority list is the table below and reviewAnchor.test.js holds it;
 * - anchorFor(target, point, ctx): that thing as the anchor record
 *   (the contract in the OPENBRAIN-203/204 brief, `v: 1`);
 * - findAnchorElement(anchor, doc): the way back, the element an anchor
 *   names in a freshly loaded page, and anchorHash(anchor), the URL hash
 *   readerJump lands on first.
 *
 * Priority, first match wins, walking up from the topmost element:
 *
 *   review UI (ignored) → chrome (top bar, timeline dock, scrubber, chapter
 *   map, nav drawer, reader tools, highlight toolbar, a dialog) → widget
 *   (an upload's iframe, the band's stage, the band or card) → rail plate →
 *   rail figure → inline figure → paragraph → heading (a rail part's title
 *   is its part) → rail part → figure pane (the pane's own artwork, or the
 *   empty pane by geometry: opts.paneHit) → breakout box → reference row →
 *   references → contents → cover → back matter → section → element.
 *
 * Reader DOM it relies on (add an attribute rather than guess from classes):
 * [data-paragraph-id], [data-timeline-id], [data-section-slug] (sections,
 * boxes, references), aside.bx (a box), [data-rail-scroller],
 * [data-rail-part], [data-rail-figure] / [data-rail-figure-id],
 * [data-rail-plate], .figure-pane[data-figure-key] (the pane's figure),
 * [data-figure-key] (an inline figure), [data-widget-breakout],
 * [data-widget-stage], [data-fb-slot] / [data-fb-stage] (FullBleed's pair:
 * a band or box teleported to the stage layer leads back to its slot in the
 * text), h3.subT after its <span id=slug> (a subsection), #ref-N rows,
 * #chapter-toc, [data-chapter-opener].
 *
 * No imports, and .mjs: the locate script imports it in Node as it is.
 */

export const ANCHOR_VERSION = 1;
/** The longest textExcerpt, in characters. */
export const EXCERPT_MAX = 200;

/** The kinds an anchor can have (the shared contract). */
export const ANCHOR_KINDS = Object.freeze([
  "paragraph",
  "heading",
  "figure-pane",
  "rail-figure",
  "rail-part",
  "widget",
  "box",
  "opener",
  "toc",
  "chrome",
  "references",
  "element",
]);

/** The review widget's own elements carry this; they are never a target. */
export const REVIEW_UI = "[data-review-ui]";

/* The reader's chrome, each with the name a label uses. Order matters: the
   first selector an element is inside wins. */
const CHROME = [
  ['[data-testid="reader-top-bar"], .reader-top-bar', "Top bar"],
  [".help-panel", "Reader help"],
  [".tls", "Timeline scrubber"],
  [".ctl-map", "Chapter map"],
  [".ctl", "Chapter timeline"],
  [".drawer, .nav-backdrop", "Menu"],
  [".toolkit-panel", "Reader tools"],
  ["[data-highlight-toolbar]", "Highlight toolbar"],
  [".citation-tooltip", "Citation tooltip"],
  [".reading-rail", "Reading rail"],
];

const BOX = "aside.bx[data-section-slug]";
const READER_SECTION = "section.reader-section";
const INLINE_FIGURE =
  "[data-figure-key], figure.ve, .illu-inline, .fig-shell, [data-break-demo]";
const HEADING = "h1, h2, h3, h4";

/* ── Small DOM helpers ───────────────────────────────────────────────── */

const text = (el) =>
  String(el?.textContent || "")
    .replace(/\s+/g, " ")
    .trim();

/** A title shortened to `max` characters, on a word where it can be. */
export function shorten(value, max = 60) {
  const s = String(value || "")
    .replace(/\s+/g, " ")
    .trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,;:.–—-]+$/, "")}…`;
}

/** A value for a CSS attribute selector in double quotes. */
function quoted(value) {
  return String(value).replace(/["\\]/g, "\\$&");
}

function cssId(id) {
  const css = globalThis.CSS;
  return css?.escape ? css.escape(id) : String(id).replace(/[^\w-]/g, "\\$&");
}

/**
 * Element.closest that also crosses FullBleed's teleport: a band or box
 * floating in the stage layer continues from its slot in the text, so a
 * figure in a floating box still finds the section it sits in.
 */
export function closestAcross(el, selector) {
  let node = el;
  const seen = new Set();
  while (node && !seen.has(node)) {
    seen.add(node);
    const hit = node.closest?.(selector);
    if (hit) return hit;
    const stage = node.closest?.("[data-fb-stage]");
    const id = stage?.getAttribute("data-fb-stage");
    if (!id) return null;
    node = stage.ownerDocument.querySelector(`[data-fb-slot="${quoted(id)}"]`);
  }
  return null;
}

/** The floating stage of a FullBleed slot inside `el`, or null. */
function stageOf(el) {
  const slot = el?.matches?.("[data-fb-slot]")
    ? el
    : el?.querySelector?.("[data-fb-slot]");
  const id = slot?.getAttribute("data-fb-slot");
  if (!id) return null;
  return slot.ownerDocument.querySelector(`[data-fb-stage="${quoted(id)}"]`);
}

function chromeOf(el) {
  for (const [selector, name] of CHROME) {
    const hit = el.closest?.(selector);
    if (hit) return { el: hit, name };
  }
  return null;
}

const isRailTitle = (el) => el?.matches?.(".rp-title");

/* ── 1. The meaningful thing under the pointer ───────────────────────── */

/**
 * The thing a note made at this point is about: `{ el, kind }`, where `el`
 * is the element the point is measured against. `stack` is
 * document.elementsFromPoint's list, topmost first (the overlay's own
 * elements are skipped). `opts.paneHit(top)` says whether the point is on
 * the figure pane when nothing in it takes the pointer (the pane is
 * pointer-events: none, so elementsFromPoint never lists it); `opts.pane`
 * is the pane element then. Null when there is nothing.
 */
export function pickTarget(stack, opts = {}) {
  const list = Array.from(stack || []).filter(
    (el) => el && el.nodeType === 1 && !el.closest?.(REVIEW_UI)
  );
  const top = list[0];
  if (!top) return null;

  const chrome = chromeOf(top);
  if (chrome) return { el: chrome.el, kind: "chrome" };
  const dialog = top.closest('[role="dialog"], dialog');
  if (dialog) return { el: dialog, kind: "element" };

  // A widget: an upload runs in an iframe that can't be entered, so the
  // frame is the anchor and the point is where on it.
  if (top.tagName === "IFRAME" && closestAcross(top, "[data-widget-breakout]"))
    return { el: top, kind: "widget" };
  const stage = top.closest("[data-widget-stage]");
  if (stage) {
    const frame = stage.querySelector("iframe");
    return { el: frame && covers(frame, list) ? frame : stage, kind: "widget" };
  }
  const band = top.closest(".wb-body, .wb-layout, aside.wb");
  if (band) return { el: band, kind: "widget" };

  const plate = top.closest("[data-rail-plate]");
  if (plate) return { el: plate, kind: "rail-figure" };
  const railFigure = top.closest("[data-rail-figure]");
  if (railFigure) return { el: railFigure, kind: "rail-figure" };

  const pane = top.closest(".figure-pane");
  if (pane) return { el: pane, kind: "figure-pane" };

  const figure = top.closest(INLINE_FIGURE);
  if (figure) return { el: outerFigure(figure), kind: "element" };

  const paragraph = top.closest("[data-paragraph-id]");
  if (paragraph) return { el: paragraph, kind: "paragraph" };

  const heading = top.closest(HEADING);
  if (heading && isRailTitle(heading)) {
    const part = heading.closest("[data-rail-part]");
    if (part) return { el: part, kind: "rail-part" };
  }
  if (heading && headingContext(heading))
    return { el: heading, kind: "heading" };

  const part = top.closest("[data-rail-part]");
  if (part) return { el: part, kind: "rail-part" };

  if (opts.paneHit?.(top) && opts.pane)
    return { el: opts.pane, kind: "figure-pane" };

  const box = top.closest(BOX) || boxOfStage(top);
  if (box) return { el: box, kind: "box" };

  const ref = top.closest("li.ref-list__item, li[id^='ref-']");
  if (ref && ref.closest("[data-chapter-references], .cr"))
    return { el: ref, kind: "references" };
  const refs = top.closest("[data-chapter-references]");
  if (refs) return { el: refs, kind: "references" };

  const toc = top.closest("#chapter-toc");
  if (toc) {
    const row = top.closest(
      ".otoc__section, .opener-toc__row, .opener-toc__section"
    );
    return { el: row && toc.contains(row) ? row : toc, kind: "toc" };
  }
  const opener = top.closest("[data-chapter-opener]");
  if (opener) return { el: opener, kind: "opener" };

  const back = top.closest(
    "[data-chapter-close], .further-reading, .chapter-foot, [data-reader-end] > *"
  );
  if (back) return { el: back, kind: "element" };

  const section = closestAcross(top, READER_SECTION);
  if (section) return { el: section, kind: "element" };
  return { el: top, kind: "element" };
}

/**
 * pickTarget at a viewport point of `doc`. The figure pane takes no
 * pointer events, so it is found by geometry: the point is on it when it
 * is laid out (from 1024px) and nothing that covers it (a floating box or
 * band, the cover, the back matter) is on top.
 */
export function targetAt(x, y, doc = globalThis.document) {
  if (!doc?.elementsFromPoint) return null;
  const stack = doc.elementsFromPoint(x, y);
  const pane = doc.querySelector(".figure-pane");
  const paneHit = (top) => {
    const r = pane?.getBoundingClientRect?.();
    if (!r || r.width < 1 || r.height < 1) return false;
    if (x < r.left || x >= r.right || y < r.top || y >= r.bottom) return false;
    return !top.closest(
      "[data-fb-stage], [data-chapter-opener], [data-reader-end]"
    );
  };
  return pickTarget(stack, { paneHit, pane });
}

/** Whether `frame` is in the hit list (the point is on the frame). */
function covers(frame, list) {
  return list.includes(frame);
}

/** The outermost figure element of an inline figure (the figure shell
 *  sits inside .illu-inline, which carries the key). */
function outerFigure(el) {
  return el.parentElement?.closest?.("[data-figure-key]") || el;
}

/** The box of a floating box's pause room or stage (outside the aside). */
function boxOfStage(el) {
  const stage = el.closest?.("[data-breakout-box]");
  return stage?.querySelector?.(BOX) || null;
}

/** A heading the reader owns: a section's, a subsection's, a box's, the
 *  intro's, or one in the back matter. Null for headings inside widgets. */
function headingContext(h) {
  if (h.matches(".subT")) return "subsection";
  if (h.matches(".bx-title")) return "box";
  if (h.matches(".T, .subChapter")) return "section";
  if (h.closest(".wb, .wb-layout, [data-widget-stage]")) return null;
  if (h.closest(READER_SECTION)) return "section";
  if (h.closest("[data-reader-end]")) return "back";
  return null;
}

/* ── 2. The anchor record ────────────────────────────────────────────── */

/** The figure number as the book prints it in a label: "07", "K". */
export function figureNumberLabel(n) {
  if (n === undefined || n === null || n === "") return "";
  const s = String(n).trim();
  return /^\d+$/.test(s) ? s.padStart(2, "0") : s;
}

/** "Fig 07 · Galen silences a squealing pig", or the title, or "". */
export function figureName({ figureNumber, figureTitle } = {}) {
  const n = figureNumberLabel(figureNumber);
  const title = shorten(figureTitle, 70);
  if (n && title) return `Fig ${n} · ${title}`;
  if (n) return `Fig ${n}`;
  return title;
}

/** "FIG 05" → "05"; "FIG K" → "K". */
function numberFromLabel(label) {
  const m = /fig(?:ure)?\.?\s*([0-9]+|[A-Z]{1,2})\b/i.exec(String(label || ""));
  return m ? m[1] : "";
}

function figureFromRecord(key, recordFor) {
  if (!key) return {};
  const record = recordFor?.(key);
  if (!record) return {};
  return {
    // The record's own spelling (the pane keeps a lowercased key).
    figureKey: record.id ? String(record.id) : undefined,
    figureNumber:
      record.figureNumber !== undefined && record.figureNumber !== null
        ? String(record.figureNumber)
        : undefined,
    figureTitle: record.title ? String(record.title) : undefined,
  };
}

/** A figure's key from an animation trigger id: "triggerAnimationFig1"
 *  → "AnimationFig1" (records match it with or without "animation"). */
export function figureKeyOfTrigger(trigger) {
  const id = trigger?.id || "";
  return /^trigger/i.test(id) ? id.replace(/^trigger/i, "") : "";
}

/** The trigger a pane figure key belongs to, in the reader (not a box). */
function paneTrigger(doc, key) {
  if (!key) return null;
  const wanted = String(key).toLowerCase();
  const bare = wanted.replace(/^animation/, "");
  const all = Array.from(doc.querySelectorAll(".animationTrigger[id]")).filter(
    (t) => {
      if (t.closest("[data-breakout-box]")) return false;
      const k = figureKeyOfTrigger(t).toLowerCase();
      return k === wanted || k.replace(/^animation/, "") === bare;
    }
  );
  // A figure shown beside several paragraphs has a trigger at each; the
  // one on now is the last active one (IllustrationsComp's rule).
  return (
    all.filter((t) => t.classList.contains("active")).pop() || all[0] || null
  );
}

/** A section's own title: its h2.T (not the number badge, h2.TN), or the
 *  intro's h1, never a heading further down. */
function sectionHeading(section) {
  for (const child of section?.children || []) {
    if (child.matches("h2.T, h2.subChapter, h1")) return child;
    const h1 = child.matches("div") ? child.querySelector("h1") : null;
    if (h1 && h1.parentElement === child) return h1;
  }
  return null;
}

/** The reader section an element is in (crossing a floating stage), its
 *  slug (null for the introduction, which has none) and its title. */
function sectionOf(el) {
  const section = closestAcross(el, READER_SECTION);
  if (!section) return {};
  const heading = sectionHeading(section);
  return {
    section,
    sectionSlug: section.getAttribute("data-section-slug") || undefined,
    sectionTitle: text(heading) || undefined,
  };
}

/** The subsection heading before `el` in its section: { subsectionId,
 *  subsectionTitle } (the id is the slug span SubSection puts before it). */
function subsectionOf(el, section) {
  if (!section) return {};
  let found = null;
  for (const h of section.querySelectorAll("h3.subT")) {
    // An untitled subsection (a merged wrapper) is no heading to name.
    if (!text(h)) continue;
    if (h === el || h.contains(el)) {
      found = h;
      break;
    }
    // eslint-disable-next-line no-bitwise
    if (h.compareDocumentPosition(el) & 4) found = h;
    else break;
  }
  if (!found) return {};
  let id = found.previousElementSibling?.id || "";
  if (!id) {
    // EditableBlock wraps the creator's title: the span is before that.
    id = found.parentElement?.previousElementSibling?.id || "";
  }
  return {
    subsectionId: id || undefined,
    subsectionTitle: text(found) || undefined,
    subsectionHeading: found,
  };
}

function boxOf(el) {
  const box = closestAcross(el, BOX);
  if (!box) return {};
  return {
    box,
    boxSlug: box.getAttribute("data-section-slug") || undefined,
    boxTitle: text(box.querySelector(".bx-title")) || undefined,
  };
}

function railPartOf(el, box) {
  const part = el.closest?.("[data-rail-part]");
  if (!part) return {};
  const scope =
    box || part.closest("[data-rail-scroller]") || part.parentElement;
  const parts = Array.from(scope.querySelectorAll("[data-rail-part]"));
  const index = parts.indexOf(part);
  const title = text(part.querySelector(".rp-title")) || undefined;
  return {
    part,
    railPart: {
      index: Math.max(0, index),
      count: parts.length,
      ...(title ? { title } : {}),
    },
  };
}

/** Where the point is on `el`, as fractions of its box (0–1, 3 places). */
export function pointIn(rect, x, y) {
  const fx = rect && rect.width > 0 ? (x - rect.left) / rect.width : 0.5;
  const fy = rect && rect.height > 0 ? (y - rect.top) / rect.height : 0.5;
  const clamp = (v) => Math.round(Math.min(1, Math.max(0, v)) * 1000) / 1000;
  return { x: clamp(fx), y: clamp(fy) };
}

/** A short fallback path: the nearest id, then up to four steps of
 *  tag.class:nth-of-type below it. */
export function selectorFor(el) {
  if (!el || el.nodeType !== 1) return "";
  const steps = [];
  let node = el;
  while (node && node.nodeType === 1 && steps.length < 5) {
    if (node.id && !/^\d/.test(node.id) && !/[^\w:-]/.test(node.id)) {
      steps.unshift(`#${cssId(node.id)}`);
      return steps.join(" > ");
    }
    if (node.id) {
      steps.unshift(`[id="${quoted(node.id)}"]`);
      return steps.join(" > ");
    }
    const para = node.getAttribute?.("data-paragraph-id");
    if (para) {
      steps.unshift(`[data-paragraph-id="${quoted(para)}"]`);
      return steps.join(" > ");
    }
    const tag = node.tagName.toLowerCase();
    const cls = Array.from(node.classList || [])
      .filter((c) => /^[a-z][\w-]*$/i.test(c) && !c.includes(":"))
      .slice(0, 1)
      .map((c) => `.${c}`)
      .join("");
    const parent = node.parentElement;
    let nth = "";
    if (parent) {
      const same = Array.from(parent.children).filter(
        (c) => c.tagName === node.tagName
      );
      if (same.length > 1) nth = `:nth-of-type(${same.indexOf(node) + 1})`;
    }
    steps.unshift(`${tag}${cls}${nth}`);
    node = parent;
  }
  return steps.join(" > ");
}

/** The paragraph ordinal of `el` among the paragraphs of `scope` in the
 *  same box as it (none, in a section: a box's paragraphs are counted in
 *  the box), 1-based, or 0. */
function ordinal(el, scope, after = null) {
  if (!scope) return 0;
  const box = closestAcross(el, BOX);
  const list = Array.from(scope.querySelectorAll("[data-paragraph-id]")).filter(
    (p) =>
      closestAcross(p, BOX) === box &&
      // eslint-disable-next-line no-bitwise
      (!after || after.compareDocumentPosition(p) & 4)
  );
  const i = list.indexOf(el);
  return i < 0 ? 0 : i + 1;
}

function firstParagraphId(el) {
  return (
    el
      ?.querySelector?.("[data-paragraph-id]")
      ?.getAttribute("data-paragraph-id") || undefined
  );
}

/** Copy the defined, non-empty fields. */
function compact(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = v;
  }
  return out;
}

const pct = (v) => `${Math.round((v || 0) * 100)}%`;
const q = (s) => `“${shorten(s)}”`;

/**
 * The anchor record for a picked target. `point` is { clientX, clientY };
 * `ctx` gives what the DOM does not hold: { recordFor(key) → animation
 * record, page: { scrollY, docHeight, viewport, layout, theme,
 * reduceMotion } } (pageState(window) builds `page`).
 */
export function anchorFor(target, point = {}, ctx = {}) {
  if (!target?.el) return null;
  const { el, kind } = target;
  const doc = el.ownerDocument;
  const rect = el.getBoundingClientRect?.() || null;
  const at =
    point && typeof point.clientX === "number"
      ? pointIn(rect, point.clientX, point.clientY)
      : { x: 0.5, y: 0.5 };
  const recordFor = ctx.recordFor;
  const page = ctx.page || {};
  const paneKey =
    doc?.querySelector?.(".figure-pane")?.getAttribute("data-figure-key") ||
    undefined;

  const sec = sectionOf(el);
  const bx = boxOf(el);
  const sub = bx.box ? {} : subsectionOf(el, sec.section);
  const timeline = closestAcross(el, "[data-timeline-id]");
  const base = {
    sectionSlug: sec.sectionSlug,
    subsectionId: sub.subsectionId,
    boxSlug: bx.boxSlug,
    timelineId: timeline?.getAttribute("data-timeline-id") || undefined,
  };
  const where = bx.boxTitle
    ? q(bx.boxTitle)
    : sub.subsectionTitle
      ? q(sub.subsectionTitle)
      : sec.sectionTitle
        ? q(sec.sectionTitle)
        : "";
  const inWhere = where ? ` in ${where}` : "";
  let fields = {};
  let label = "";

  switch (kind) {
    case "paragraph": {
      const rp = railPartOf(el, bx.box);
      const scope = bx.box || sec.section;
      // Counted from the subsection heading the label names, if any.
      const n = ordinal(el, scope, bx.box ? null : sub.subsectionHeading);
      const partBit = rp.railPart
        ? `, part ${rp.railPart.index + 1} of ${rp.railPart.count}`
        : "";
      fields = {
        paragraphId: el.getAttribute("data-paragraph-id") || undefined,
        railPart: rp.railPart,
        textExcerpt: shorten(text(el), EXCERPT_MAX),
      };
      label = `¶ ${n || "?"}${inWhere}${partBit}`;
      break;
    }
    case "heading": {
      const which = headingContext(el);
      fields = { textExcerpt: shorten(text(el), EXCERPT_MAX) };
      if (which === "subsection")
        fields.subsectionId = subsectionOf(el, sec.section).subsectionId;
      const what =
        which === "subsection"
          ? "Subsection heading"
          : which === "box"
            ? "Box title"
            : which === "back"
              ? "Heading"
              : "Section heading";
      label = `${what} ${q(text(el))}`;
      break;
    }
    case "rail-part": {
      const rp = railPartOf(el, bx.box);
      fields = {
        railPart: rp.railPart,
        paragraphId: firstParagraphId(el),
        textExcerpt: shorten(text(el), EXCERPT_MAX),
      };
      const r = rp.railPart || { index: 0, count: 1 };
      label = `Part ${r.index + 1} of ${r.count}${r.title ? ` · ${shorten(r.title)}` : ""}${inWhere}`;
      break;
    }
    case "rail-figure": {
      const figureEl = el.closest("[data-rail-figure]") || el;
      const rp = railPartOf(figureEl, bx.box);
      const key = figureEl.getAttribute("data-rail-figure-id") || undefined;
      const plates = Array.from(figureEl.querySelectorAll("[data-rail-plate]"));
      const plateIndex = el.matches("[data-rail-plate]")
        ? plates.indexOf(el)
        : undefined;
      // A plate that is a figure of its own carries its own label.
      const plateLabel =
        plateIndex !== undefined
          ? el.querySelector("[data-rail-plate-label]")
          : null;
      const fromRecord = figureFromRecord(key, recordFor);
      const domNumber = numberFromLabel(
        text(
          plateLabel?.querySelector(".rf-label") ||
            figureEl.querySelector(".rf-bar .rf-label")
        )
      );
      const domTitle = text(
        plateLabel?.querySelector(".rf-name") ||
          figureEl.querySelector(".rf-bar .rf-name")
      );
      const figureNumber = plateLabel
        ? domNumber || fromRecord.figureNumber
        : fromRecord.figureNumber || domNumber || undefined;
      const figureTitle = plateLabel
        ? domTitle || fromRecord.figureTitle
        : fromRecord.figureTitle || domTitle || undefined;
      fields = {
        figureKey: fromRecord.figureKey || key,
        figureNumber,
        figureTitle,
        railPart: rp.railPart,
        plateIndex: plateIndex >= 0 ? plateIndex : undefined,
        paragraphId: firstParagraphId(rp.part),
      };
      const name =
        figureName({ figureNumber, figureTitle }) ||
        (rp.railPart?.title
          ? `Picture for ${q(rp.railPart.title)}`
          : "Picture");
      const plateBit =
        plateIndex >= 0 && plates.length > 1 && !plateLabel
          ? `, image ${plateIndex + 1} of ${plates.length}`
          : "";
      const partBit =
        rp.railPart && !figureNumber && !rp.railPart.title
          ? `, part ${rp.railPart.index + 1} of ${rp.railPart.count}`
          : "";
      label = `${name}${plateBit}${partBit}${inWhere}`;
      break;
    }
    case "figure-pane": {
      const key = el.getAttribute("data-figure-key") || undefined;
      const fromRecord = figureFromRecord(key, recordFor);
      const figureNumber =
        fromRecord.figureNumber ||
        numberFromLabel(text(el.querySelector(".fig-label"))) ||
        undefined;
      const figureTitle =
        fromRecord.figureTitle ||
        text(el.querySelector(".fig-name")) ||
        undefined;
      const trigger = paneTrigger(doc, key);
      const card = doc?.querySelector?.("[data-section-card]");
      fields = {
        figureKey: fromRecord.figureKey || key,
        figureNumber,
        figureTitle,
        paragraphId: firstParagraphId(trigger),
      };
      if (trigger) {
        // The text the figure is beside decides the section, not the pane.
        const tsec = sectionOf(trigger);
        const tsub = subsectionOf(trigger, tsec.section);
        fields.sectionSlug = tsec.sectionSlug;
        fields.subsectionId = tsub.subsectionId;
        base.sectionSlug = tsec.sectionSlug;
        base.subsectionId = tsub.subsectionId;
      }
      const name = figureName({ figureNumber, figureTitle });
      label = key
        ? name || "Figure in the pane"
        : card && text(card)
          ? `Section card · ${shorten(text(card))}`
          : "Figure pane (no figure showing)";
      label += `, at ${pct(at.x)} across, ${pct(at.y)} down`;
      break;
    }
    case "widget": {
      const host = closestAcross(el, "[data-widget-breakout]");
      const widgetId =
        el.closest("[data-widget-stage]")?.getAttribute("data-widget-stage") ||
        host?.getAttribute("data-widget-breakout") ||
        undefined;
      const layout =
        el.closest(".wb-layout") || stageOf(host)?.querySelector(".wb-layout");
      const title =
        text(layout?.querySelector(".wb-title")) ||
        text(host?.querySelector(".wb-title")) ||
        widgetId ||
        "Interactive";
      fields = {
        widgetId,
        paragraphId: undefined,
        textExcerpt: shorten(title, EXCERPT_MAX),
      };
      const name = /\b(widget|interactive)\b/i.test(title)
        ? shorten(title)
        : `${shorten(title)} widget`;
      label = `${name}, at ${pct(at.x)} across, ${pct(at.y)} down`;
      break;
    }
    case "box": {
      fields = { textExcerpt: shorten(bx.boxTitle, EXCERPT_MAX) };
      label = `Box ${q(bx.boxTitle || "")}`;
      break;
    }
    case "references": {
      const row = el.matches("li, [id^='ref-']") ? el : null;
      const n = row
        ? row.id.replace(/^ref-/, "") || row.getAttribute("value")
        : "";
      fields = { textExcerpt: shorten(text(row || el), EXCERPT_MAX) };
      label = row
        ? `Reference ${n} · ${shorten(text(row.querySelector(".ref-list__text") || row), 50)}`
        : "References";
      break;
    }
    case "toc": {
      const row = el.id === "chapter-toc" ? null : el;
      fields = {
        textExcerpt: row ? shorten(text(row), EXCERPT_MAX) : undefined,
      };
      label = row ? `Contents · ${shorten(text(row), 50)}` : "Contents";
      break;
    }
    case "opener":
      label = `Chapter cover, at ${pct(at.x)} across, ${pct(at.y)} down`;
      break;
    case "chrome": {
      const name = chromeOf(el)?.name || "Reader chrome";
      label = `${name}, at ${pct(at.x)} across`;
      break;
    }
    default: {
      const key =
        el.getAttribute?.("data-figure-key") ||
        figureKeyOfTrigger(el.closest?.(".animationTrigger[id]")) ||
        undefined;
      const isFigure = el.matches?.(INLINE_FIGURE) || el.tagName === "FIGURE";
      if (isFigure && key) {
        const fromRecord = figureFromRecord(key, recordFor);
        const figureNumber =
          fromRecord.figureNumber ||
          numberFromLabel(text(el.querySelector(".fig-label"))) ||
          undefined;
        const figureTitle =
          fromRecord.figureTitle ||
          text(el.querySelector(".fig-name")) ||
          undefined;
        const trigger = el.closest(".animationTrigger[id]");
        fields = {
          figureKey: fromRecord.figureKey || key,
          figureNumber,
          figureTitle,
          paragraphId: firstParagraphId(trigger),
        };
        label = `${figureName({ figureNumber, figureTitle }) || "Figure"} (in the text)${inWhere}`;
      } else if (el.matches?.("[data-break-demo]")) {
        label = `Demo ${q(text(el.querySelector("h4, h3")) || el.getAttribute("data-break-demo"))}`;
      } else if (el.matches?.(READER_SECTION)) {
        label = where ? `Section ${where}` : "Chapter text";
      } else if (el.matches?.("[data-chapter-close]")) {
        label = "End of chapter";
      } else if (el.closest?.("main, .chapter-reader")) {
        label = where ? `Chapter text${inWhere}` : "Chapter text";
      } else {
        label = `${el.tagName?.toLowerCase() || "element"}${inWhere}`;
      }
    }
  }

  return compact({
    v: ANCHOR_VERSION,
    kind,
    label: shorten(label, 160),
    ...base,
    ...compact(fields),
    point: at,
    selector: selectorFor(el),
    scrollY: page.scrollY,
    docHeight: page.docHeight,
    viewport: page.viewport,
    layout: page.layout,
    paneFigureKey: page.layout === "two-column" ? paneKey : undefined,
    theme: page.theme,
    reduceMotion: page.reduceMotion,
  });
}

/** The page's state for an anchor, from a window. */
export function pageState(win = globalThis.window) {
  if (!win?.document) return {};
  const doc = win.document;
  const html = doc.documentElement;
  const wide = win.matchMedia?.("(min-width: 1024px)")?.matches;
  const motion = html.getAttribute("data-reduce-motion");
  const systemReduce = win.matchMedia?.(
    "(prefers-reduced-motion: reduce)"
  )?.matches;
  return {
    scrollY: Math.round(win.scrollY || 0),
    docHeight: Math.round(html.scrollHeight || 0),
    viewport: {
      w: win.innerWidth,
      h: win.innerHeight,
      dpr: Math.round((win.devicePixelRatio || 1) * 100) / 100,
    },
    layout: wide ? "two-column" : "one-column",
    theme: html.getAttribute("data-theme") || "light",
    reduceMotion: motion === "1" || (motion !== "0" && !!systemReduce),
  };
}

/* ── 3. The way back ─────────────────────────────────────────────────── */

/**
 * The URL hash readerJump lands on first (ChapterView's #hash landing):
 * the paragraph, else the widget's or break's timeline id, else the
 * subsection, the box, the section; "chapter-toc" for the contents. Null
 * for the cover and the chrome, which are found by scroll position.
 */
export function anchorHash(anchor) {
  if (!anchor) return null;
  if (anchor.kind === "toc") return "chapter-toc";
  if (anchor.kind === "opener" || anchor.kind === "chrome") return null;
  if (anchor.kind === "references") {
    const m = /#(ref-\d+)/.exec(anchor.selector || "");
    return m ? m[1] : "references";
  }
  if (anchor.kind === "box" || anchor.kind === "heading") {
    if (anchor.kind === "heading" && anchor.subsectionId)
      return anchor.subsectionId;
    if (anchor.boxSlug) return anchor.boxSlug;
  }
  return (
    anchor.paragraphId ||
    anchor.timelineId ||
    anchor.subsectionId ||
    anchor.boxSlug ||
    anchor.sectionSlug ||
    null
  );
}

function bySelector(doc, selector) {
  if (!selector) return null;
  try {
    return doc.querySelector(selector);
  } catch {
    return null;
  }
}

function boxEl(doc, anchor) {
  return anchor.boxSlug
    ? doc.querySelector(
        `${BOX.split("[")[0]}[data-section-slug="${quoted(anchor.boxSlug)}"]`
      )
    : null;
}

function railPartEl(doc, anchor) {
  const box = boxEl(doc, anchor);
  const i = anchor.railPart?.index;
  if (!box || typeof i !== "number") return null;
  return box.querySelectorAll("[data-rail-part]")[i] || null;
}

function sectionEl(doc, anchor) {
  return anchor.sectionSlug
    ? doc.querySelector(
        `${READER_SECTION}[data-section-slug="${quoted(anchor.sectionSlug)}"]`
      )
    : null;
}

/** The widget's visible element: the frame, else the stage, else the
 *  band, for the widget an anchor names (its floating stage if it floats). */
function widgetEl(doc, anchor) {
  let host = anchor.timelineId
    ? doc.querySelector(`[data-timeline-id="${quoted(anchor.timelineId)}"]`)
    : null;
  if (host && !host.matches("[data-widget-breakout]"))
    host = host.querySelector("[data-widget-breakout]") || host;
  if (!host && anchor.widgetId)
    host = doc.querySelector(
      `[data-widget-breakout="${quoted(anchor.widgetId)}"]`
    );
  if (!host) return null;
  const stage = stageOf(host) || host;
  const layout = stage.querySelector?.(".wb-layout") || stage;
  const widgetStage = layout.querySelector?.("[data-widget-stage]");
  const frame = widgetStage?.querySelector("iframe");
  const sel = anchor.selector || "";
  let pointedAtFrame = /iframe/i.test(sel);
  try {
    pointedAtFrame = pointedAtFrame || (!!sel && !!frame?.matches(sel));
  } catch {
    // not a selector this page understands
  }
  if (frame && pointedAtFrame) return frame;
  return widgetStage || layout.querySelector?.(".wb-body") || layout;
}

/**
 * The element an anchor names in the page as it is now, or null. The
 * identifiers first; the stored selector only when they find nothing.
 */
export function findAnchorElement(anchor, doc = globalThis.document) {
  if (!anchor || !doc) return null;
  const k = anchor.kind;
  const para = anchor.paragraphId
    ? doc.querySelector(`[data-paragraph-id="${quoted(anchor.paragraphId)}"]`)
    : null;
  let el = null;
  switch (k) {
    case "paragraph":
      el = para;
      break;
    case "heading": {
      if (anchor.subsectionId) {
        const span = doc.getElementById(anchor.subsectionId);
        el = span?.nextElementSibling?.matches?.("h3")
          ? span.nextElementSibling
          : span?.nextElementSibling?.querySelector?.("h3") || null;
      }
      if (!el && anchor.boxSlug)
        el = boxEl(doc, anchor)?.querySelector(".bx-title");
      if (!el && anchor.sectionSlug)
        el = sectionHeading(sectionEl(doc, anchor));
      break;
    }
    case "rail-part":
      el = railPartEl(doc, anchor) || para?.closest("[data-rail-part]");
      break;
    case "rail-figure": {
      const box = boxEl(doc, anchor) || doc;
      let fig = anchor.figureKey
        ? box.querySelector(
            `[data-rail-figure-id="${quoted(anchor.figureKey)}"]`
          )
        : null;
      if (!fig)
        fig =
          railPartEl(doc, anchor)?.querySelector("[data-rail-figure]") || null;
      if (fig && typeof anchor.plateIndex === "number")
        el =
          fig.querySelectorAll("[data-rail-plate]")[anchor.plateIndex] || fig;
      else el = fig;
      break;
    }
    case "figure-pane":
      el = doc.querySelector(".figure-pane");
      break;
    case "widget":
      el = widgetEl(doc, anchor);
      break;
    case "box":
      el = boxEl(doc, anchor);
      break;
    case "references": {
      const m = /#(ref-\d+)/.exec(anchor.selector || "");
      el =
        (m && doc.getElementById(m[1])) ||
        doc.querySelector("[data-chapter-references]");
      break;
    }
    case "toc": {
      const toc = doc.getElementById("chapter-toc");
      const want = anchor.textExcerpt;
      el =
        (want &&
          Array.from(
            toc?.querySelectorAll(
              ".otoc__section, .opener-toc__row, .opener-toc__section"
            ) || []
          ).find((row) => shorten(text(row), EXCERPT_MAX) === want)) ||
        toc;
      break;
    }
    case "opener":
      el = doc.querySelector(
        "[data-chapter-opener] .opener-hero, [data-chapter-opener]"
      );
      break;
    default:
      if (anchor.figureKey)
        el = doc.querySelector(
          `[data-figure-key="${quoted(anchor.figureKey)}"]`
        );
  }
  return el || bySelector(doc, anchor.selector) || null;
}

/** The trigger whose figure a figure-pane anchor shows, or null. */
export function paneTriggerFor(anchor, doc = globalThis.document) {
  return anchor?.figureKey ? paneTrigger(doc, anchor.figureKey) : null;
}

/* Fields that say which thing an anchor is (not where on it). */
const IDENTITY = [
  "kind",
  "paragraphId",
  "sectionSlug",
  "subsectionId",
  "boxSlug",
  "figureKey",
  "widgetId",
  "plateIndex",
];

/**
 * Whether two anchors name the same thing: the same kind and the same
 * identifiers wherever the first has one, and the same rail part. Used by
 * the locate script to check that the place it found, pointed at again,
 * is the place the note was made on.
 */
export function sameAnchor(a, b) {
  if (!a || !b) return false;
  for (const key of IDENTITY) {
    if (a[key] === undefined) continue;
    // Figure keys match as the records do, whatever their case.
    const same =
      key === "figureKey"
        ? String(a[key]).toLowerCase() === String(b[key] ?? "").toLowerCase()
        : a[key] === b[key];
    if (!same) return false;
  }
  if (a.railPart && (!b.railPart || a.railPart.index !== b.railPart.index))
    return false;
  return true;
}
