/**
 * Which paragraphs today's editors can save without losing anything
 * (OPENBRAIN-58).
 *
 * `paragraphs.content` is `{ blocks: [...], animationFlags? }`. The two
 * editors that exist before the shared block format (Phase 1) only
 * understand some block types:
 *
 * - the reader's inline editor saves one `text` block of HTML, so any other
 *   block (a citation, an image, a widget…) would be flattened away;
 * - the dashboard's block editor converts HTML ↔ blocks for text, headings,
 *   lists, quotes, code and plain images only.
 *
 * Each editor asks for a lock reason before editing and again before saving,
 * and refuses rather than drop data. `animationFlags` isn't a reason to lock:
 * the savers keep every key of `content` except `blocks`.
 */

const LABELS = {
  citation_ref: "citations",
  figure_placeholder: "figure references",
  image: "an image",
  widget: "a widget",
  break_video: "a break video",
  break_section: "a break section",
  animation_full: "a full-screen animation",
  further_reading: "further reading",
  footnote: "a footnote",
  heading: "a heading",
  list: "a list",
  blockquote: "a quote",
  code: "code",
};

const READER_OK = new Set(["text", "paragraph"]);
const DASHBOARD_OK = new Set([
  "text",
  "paragraph",
  "heading",
  "list",
  "blockquote",
  "code",
  "image",
]);

function describe(types) {
  const labels = [...new Set(types.map((t) => LABELS[t] || `"${t}" blocks`))];
  if (labels.length === 1) return labels[0];
  return `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
}

function blocksOf(content) {
  return Array.isArray(content?.blocks) ? content.blocks : [];
}

/**
 * Why the reader's inline editor can't save this paragraph, or null if it
 * can. The message is shown to the author as-is.
 */
export function readerLockReason(content) {
  const blocked = blocksOf(content)
    .map((b) => b?.type)
    .filter((t) => !READER_OK.has(t));
  if (!blocked.length) return null;
  return `This paragraph has ${describe(blocked)}, which editing here would remove. It will be editable in the new chapter editor.`;
}

/** Same question for the dashboard block editor's HTML converter. */
export function dashboardLockReason(content) {
  const blocked = blocksOf(content)
    .filter(
      (b) =>
        !DASHBOARD_OK.has(b?.type) ||
        // Its converter keeps src/alt only; a caption would be lost.
        (b.type === "image" && (b.caption || b.closed !== undefined))
    )
    .map((b) => b.type);
  if (!blocked.length) return null;
  return `This paragraph has ${describe(blocked)}, which this editor can't keep yet. It will be editable in the new chapter editor.`;
}

/**
 * The content to PATCH when replacing a paragraph's blocks: every other key
 * (animationFlags, future fields) survives.
 */
export function withBlocks(content, blocks) {
  return { ...(content && typeof content === "object" ? content : {}), blocks };
}
