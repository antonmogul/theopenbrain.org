/**
 * Reviewer notes (OPENBRAIN-203): the pure half of the dashboard's "Review
 * notes" view and of `npm run feedback:pull`. A note is a `review_feedback`
 * row; its `anchor` is the point-at record the reader's widget builds
 * (OPENBRAIN-204, see docs/review-feedback.md).
 */

export const REVIEW_TYPES = [
  { value: "content", label: "Content" },
  { value: "figure", label: "Figure" },
  { value: "widget", label: "Widget" },
  { value: "design", label: "Design" },
  { value: "bug", label: "Bug" },
  { value: "note", label: "Note" },
];

export const REVIEW_STATUSES = [
  { value: "new", label: "New" },
  { value: "doing", label: "Doing" },
  { value: "question", label: "Question" },
  { value: "done", label: "Done" },
  { value: "wont_do", label: "Won't do" },
];

/** Statuses that still need someone: the dashboard's default filter. */
export const OPEN_STATUSES = ["new", "doing", "question"];

const labelOf = (list, value) =>
  list.find((item) => item.value === value)?.label || value || "";
export const reviewTypeLabel = (value) => labelOf(REVIEW_TYPES, value);
export const reviewStatusLabel = (value) => labelOf(REVIEW_STATUSES, value);

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/i;

/** True when a note matches the filters (`all`, `open`, or one value each). */
export function matchesReviewFilters(note, { chapter, type, status } = {}) {
  if (chapter && chapter !== "all" && note.chapter_slug !== chapter)
    return false;
  if (type && type !== "all" && note.type !== type) return false;
  if (status === "open") return OPEN_STATUSES.includes(note.status);
  if (status && status !== "all" && note.status !== status) return false;
  return true;
}

/**
 * Where "Open in chapter" goes: the reader at the note's paragraph, else its
 * section, built from the module row (the chapter number is display-only, so
 * never from a hard-coded map). Null when the chapter isn't known.
 */
export function reviewNoteHref(note, module) {
  if (!module?.slug || module.order_index == null) return null;
  const base = `/chapter/${encodeURIComponent(module.order_index)}/${encodeURIComponent(module.slug)}`;
  const anchor = note?.anchor || {};
  const candidates = [
    note?.paragraph_id,
    anchor.paragraphId,
    note?.section_slug,
    anchor.sectionSlug,
  ];
  const hash = candidates.find(
    (value) =>
      typeof value === "string" && (UUID_RE.test(value) || SLUG_RE.test(value))
  );
  return hash ? `${base}#${hash}` : base;
}

/** The human place of a note: the widget's label, else what is known. */
export function reviewAnchorLabel(note) {
  const anchor = note?.anchor || {};
  if (typeof anchor.label === "string" && anchor.label.trim())
    return anchor.label.trim();
  if (anchor.figureTitle)
    return [anchor.figureNumber, anchor.figureTitle]
      .filter(Boolean)
      .join(" · ");
  if (anchor.widgetId) return `Widget ${anchor.widgetId}`;
  if (anchor.kind) return anchor.kind;
  if (note?.paragraph_id) return "A paragraph";
  return "No place recorded";
}

/** "1440×900 · two-column · dark" from the anchor and the row. */
export function reviewViewLabel(note) {
  const anchor = note?.anchor || {};
  const size =
    note?.viewport ||
    (anchor.viewport?.w && anchor.viewport?.h
      ? `${anchor.viewport.w}×${anchor.viewport.h}`
      : "");
  return [size, anchor.layout, anchor.theme === "dark" ? "dark" : ""]
    .filter(Boolean)
    .join(" · ");
}

/**
 * Notes grouped chapter → section in reading order, newest first within a
 * section. `modules` rows: { id, slug, title, order_index }; `sections` rows:
 * { module_id, slug, title, order_index }. Unknown chapters and sections keep
 * their slug as title and sort after the known ones.
 */
export function groupReviewNotes(notes, modules = [], sections = []) {
  const moduleBySlug = new Map(modules.map((m) => [m.slug, m]));
  const sectionByKey = new Map();
  for (const s of sections) {
    const module = modules.find((m) => m.id === s.module_id);
    if (module) sectionByKey.set(`${module.slug}/${s.slug}`, s);
  }
  const chapters = new Map();
  for (const note of notes) {
    const slug = note.chapter_slug;
    if (!chapters.has(slug)) {
      const module = moduleBySlug.get(slug);
      chapters.set(slug, {
        slug,
        title: module?.title || slug,
        order: module?.order_index ?? Infinity,
        module: module || null,
        sections: new Map(),
      });
    }
    const chapter = chapters.get(slug);
    const sectionSlug = note.section_slug || note.anchor?.sectionSlug || "";
    if (!chapter.sections.has(sectionSlug)) {
      const section = sectionByKey.get(`${slug}/${sectionSlug}`);
      chapter.sections.set(sectionSlug, {
        slug: sectionSlug,
        title: section?.title || sectionSlug || "No section",
        order: section?.order_index ?? Infinity,
        notes: [],
      });
    }
    chapter.sections.get(sectionSlug).notes.push(note);
  }
  const byOrder = (a, b) =>
    a.order - b.order || String(a.title).localeCompare(String(b.title));
  const newestFirst = (a, b) =>
    String(b.created_at || "").localeCompare(String(a.created_at || "")) ||
    String(b.id).localeCompare(String(a.id));
  return [...chapters.values()].sort(byOrder).map((chapter) => ({
    ...chapter,
    sections: [...chapter.sections.values()].sort(byOrder).map((section) => ({
      ...section,
      notes: section.notes.slice().sort(newestFirst),
    })),
  }));
}
