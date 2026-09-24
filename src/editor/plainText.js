/**
 * Plain text for paragraphs.content_text (search, stats, subsection titles):
 * what the reader shows for these blocks, without tags (OPENBRAIN-60/64).
 */
import { contentBlocksToHTML } from "@/composables/chapterTransform.mjs";

export function blocksToPlainText(blocks) {
  const html = contentBlocksToHTML(blocks).text;
  if (typeof document === "undefined") return html.replace(/<[^>]*>/g, "");
  const el = document.createElement("div");
  el.innerHTML = html;
  return el.textContent || "";
}
