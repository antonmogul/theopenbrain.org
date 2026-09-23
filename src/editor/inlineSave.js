/**
 * Save one inline edit from the reader (OPENBRAIN-58).
 *
 * Re-reads the stored paragraph, refuses to overwrite anything the inline
 * editor can't keep (readerLockReason), and replaces only `content.blocks`,
 * keeping every other key (animationFlags). `rest(path, init)` performs an
 * authenticated PostgREST request and resolves to the parsed JSON body.
 */
import { readerLockReason, withBlocks } from "./editability.js";

export const PARAGRAPH_SAVES = new Set([
  "paragraph",
  "intro",
  "subSubParagraph",
  "subsection-title",
]);

export const stripTags = (html) => String(html ?? "").replace(/<[^>]*>/g, "");

export async function saveInlineEdit(rest, { paragraphId, content, type }) {
  if (PARAGRAPH_SAVES.has(type)) {
    const [row] = await rest(`paragraphs?id=eq.${paragraphId}&select=content`);
    if (!row)
      throw new Error("This paragraph no longer exists. Reload the chapter.");
    const current = row.content?.blocks || [];
    let blocks;
    if (type === "subsection-title") {
      // Subsection titles live in a header row: keep its single block's type
      // (text or heading) and replace only the words.
      const only = current[0];
      if (
        current.length > 1 ||
        (only && !["text", "paragraph", "heading"].includes(only.type))
      ) {
        throw new Error(
          readerLockReason(row.content) ||
            "This title can't be edited here yet."
        );
      }
      blocks = [
        {
          ...(only || { type: "text" }),
          content: only?.type === "heading" ? stripTags(content) : content,
        },
      ];
    } else {
      const reason = readerLockReason(row.content);
      if (reason) throw new Error(reason);
      blocks = [{ type: "text", content }];
    }
    const saved = await rest(`paragraphs?id=eq.${paragraphId}`, {
      method: "PATCH",
      body: JSON.stringify({
        content: withBlocks(row.content, blocks),
        content_text: stripTags(content),
      }),
    });
    // RLS answers a refused update with 0 rows, not an error.
    if (!saved?.length)
      throw new Error("The database didn't allow this change.");
    return;
  }
  if (type === "section-title" || type === "intro-title") {
    const saved = await rest(`sections?id=eq.${paragraphId}`, {
      method: "PATCH",
      body: JSON.stringify({ title: stripTags(content) }),
    });
    if (!saved?.length)
      throw new Error("The database didn't allow this change.");
    return;
  }
  throw new Error(`Unknown edit type "${type}".`);
}
