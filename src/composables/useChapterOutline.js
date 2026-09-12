/*
 * Chapter outline — the table of contents the opener prints (OPENBRAIN-32),
 * and the per-section stats the overview page shows. Both derive from the
 * transformed chapter shape the reader already holds (useText: { intro,
 * sections }), so they cannot disagree with what renders below them.
 *
 * Pure functions: no store, no DOM, testable without a browser.
 */
import { toSlug } from "@/helper/general";

const WORDS_PER_MINUTE = 200;

/**
 * Figure count and reading-time estimate for one section. Walks nested
 * subsections; honest derivations from the data, no fabricated numbers.
 */
export function sectionStats(section) {
  const paras = section?.paragraphs || [];
  let figures = 0;
  let words = 0;
  const walk = (list) => {
    for (const p of list || []) {
      if (p.animation || p.animationFull || p.img) figures += 1;
      if (typeof p.text === "string") {
        words += p.text
          .replace(/<[^>]+>/g, " ")
          .split(/\s+/)
          .filter(Boolean).length;
      }
      if (p.subSection) walk(p.subSection);
      if (p.subSubSection) walk(p.subSubSection);
      if (p.paragraphs) walk(p.paragraphs);
    }
  };
  walk(paras);
  return { figures, mins: Math.max(1, Math.round(words / WORDS_PER_MINUTE)) };
}

/* Subsection headers directly under a section, in reading order. The reader
   anchors each with <span :id="toSlug(title)"> (SubSection.vue), so that is
   the link target. */
function collectSubsections(paragraphs) {
  const subs = [];
  for (const p of paragraphs || []) {
    for (const sub of p.subSection || []) {
      if (!sub?.title) continue;
      subs.push({
        id: sub.id || toSlug(sub.title),
        title: sub.title,
        anchor: `#${toSlug(sub.title)}`,
      });
    }
  }
  return subs;
}

/**
 * Section labels keyed by section id (or title): numbered sections count
 * from 1, breakout boxes (kind "box", Foundations' sidebars) are lettered
 * A, B, C… so they read as asides rather than steps. This is the ONE place
 * the numbering lives — TextComp/SectionComp print these labels in the
 * prose and the opener's TOC prints the same ones.
 */
export function sectionLabelMap(sections) {
  const labels = {};
  let number = 0;
  let box = 0;
  for (const section of sections || []) {
    if (!section) continue;
    const key = section.id || section.title;
    labels[key] =
      section.kind === "box"
        ? String.fromCharCode(65 + (box++ % 26))
        : String(++number);
  }
  return labels;
}

/**
 * Build the outline the opener's TOC renders. The intro is "0"; every other
 * label comes from sectionLabelMap so the TOC and the prose agree. Each entry
 * links to the section's own id (SectionComp renders <section :id="section.id">).
 *
 * @param {{ intro?: Array, sections?: Array } | null} text
 * @returns {Array<{ id, kind, label, title, anchor, subsections }>}
 */
export function buildOutline(text) {
  const out = [];
  const intro = text?.intro?.[0];
  if (intro) {
    out.push({
      id: intro.id,
      kind: "intro",
      label: "0",
      // The transform names the intro after the module (the reader's old h1);
      // the section's own title is what the TOC wants.
      title: intro.sectionTitle || intro.title || "Introduction",
      anchor: `#${intro.id}`,
      subsections: [],
    });
  }
  const labels = sectionLabelMap(text?.sections);
  for (const s of text?.sections || []) {
    if (!s) continue;
    out.push({
      id: s.id,
      kind: s.kind === "box" ? "box" : "section",
      label: labels[s.id || s.title],
      title: s.title,
      anchor: `#${s.id}`,
      subsections: collectSubsections(s.paragraphs),
    });
  }
  return out;
}
