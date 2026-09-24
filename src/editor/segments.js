/**
 * Split a paragraph's blocks into the pieces the block page draws
 * (OPENBRAIN-60): runs of inline content (text + citations + figure refs,
 * rendered with the reader's own contentBlocksToHTML) and one piece per
 * structured block (heading, list, quote, image, widget, footnote, …).
 */
const INLINE = new Set([
  "text",
  "paragraph",
  "citation_ref",
  "figure_placeholder",
]);

export function blockSegments(blocks) {
  const out = [];
  let inline = null;
  for (const b of Array.isArray(blocks) ? blocks : []) {
    if (!b || typeof b !== "object") continue;
    if (INLINE.has(b.type)) {
      if (!inline) {
        inline = { kind: "inline", blocks: [] };
        out.push(inline);
      }
      inline.blocks.push(b);
      continue;
    }
    inline = null;
    out.push({ kind: b.type, block: b });
  }
  return out;
}

/** Short human label for a block type, for cards and menus. */
export const BLOCK_LABELS = {
  heading: "Heading",
  list: "List",
  blockquote: "Quote",
  image: "Image",
  widget: "Widget",
  video: "Video",
  footnote: "Footnote",
  further_reading: "Further reading",
  break_video: "Break video",
  break_section: "Break section",
  animation_full: "Full-screen figure",
  code: "Code",
};
