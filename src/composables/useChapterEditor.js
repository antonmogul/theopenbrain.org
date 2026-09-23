/**
 * Data for the chapter block page, /dashboard/chapters/:slug (OPENBRAIN-60).
 *
 * Loads one chapter as rows (module, sections, paragraphs, and the media
 * library for figure titles), and saves edits through the lossless block
 * format (src/editor/blocks.js): a save re-reads the stored row and replaces
 * only `content.blocks`, keeping every other key. Each change records how to
 * undo it; `undo()` reverts the most recent one.
 *
 * Edits go straight to the chapter (plan Phase 5 adds drafts). The page asks
 * creators to confirm before editing a published chapter.
 */
import { computed, ref } from "vue";
import { authedRequest } from "@/services/api/client";
import { contentBlocksToHTML } from "@/composables/chapterTransform.mjs";
import { withBlocks } from "@/editor/editability.mjs";

const PARAGRAPH_COLUMNS =
  "id,section_id,order_index,content,content_text,is_subsection_header,subsection_level,animation_id,animation_trigger,updated_at";

/** Plain text for paragraphs.content_text (search, stats, subsection titles). */
export function blocksToPlainText(blocks) {
  const el =
    typeof document !== "undefined" ? document.createElement("div") : null;
  const html = contentBlocksToHTML(blocks).text;
  if (!el) return html.replace(/<[^>]*>/g, "");
  el.innerHTML = html;
  return el.textContent || "";
}

export function useChapterEditor(slug) {
  const module = ref(null);
  const sections = ref([]);
  const paragraphs = ref([]);
  const media = ref([]);
  const loading = ref(false);
  const error = ref(null);
  const saving = ref(false);
  const lastSavedAt = ref(null);
  const undoStack = ref([]); // [{ label, run: async () => {} }]

  const mediaById = computed(() => {
    const map = new Map();
    for (const m of media.value) map.set(m.id, m);
    return map;
  });

  const paragraphsBySection = computed(() => {
    const map = new Map();
    for (const s of sections.value) map.set(s.id, []);
    for (const p of paragraphs.value) {
      if (!map.has(p.section_id)) map.set(p.section_id, []);
      map.get(p.section_id).push(p);
    }
    for (const list of map.values())
      list.sort((a, b) => a.order_index - b.order_index);
    return map;
  });

  const stats = computed(() => {
    const words = paragraphs.value.reduce(
      (n, p) => n + (p.content_text || "").split(/\s+/).filter(Boolean).length,
      0
    );
    return {
      sections: sections.value.length,
      paragraphs: paragraphs.value.length,
      words,
      minutes: Math.max(1, Math.ceil(words / 200)),
    };
  });

  async function load() {
    loading.value = true;
    error.value = null;
    try {
      const [row] = await authedRequest(
        `modules?slug=eq.${encodeURIComponent(slug)}&select=*`
      );
      if (!row) throw new Error("No chapter with that address.");
      module.value = row;
      sections.value = await authedRequest(
        `sections?module_id=eq.${row.id}&select=*&order=order_index.asc`
      );
      const ids = sections.value.map((s) => `"${s.id}"`).join(",");
      paragraphs.value = ids
        ? await authedRequest(
            `paragraphs?section_id=in.(${ids})&select=${PARAGRAPH_COLUMNS}&order=order_index.asc`
          )
        : [];
      media.value = await authedRequest(
        "animations?select=id,title,animation_key,media_type,lottie_file_url,file_path&order=title.asc"
      );
    } catch (err) {
      console.error("useChapterEditor: load failed", err);
      error.value = err.message || "Couldn't load this chapter.";
    } finally {
      loading.value = false;
    }
  }

  function replaceLocal(row) {
    const i = paragraphs.value.findIndex((p) => p.id === row.id);
    if (i >= 0)
      paragraphs.value.splice(i, 1, { ...paragraphs.value[i], ...row });
  }

  function pushUndo(label, run) {
    undoStack.value = [...undoStack.value.slice(-19), { label, run }];
  }

  async function withSaving(fn) {
    saving.value = true;
    try {
      const out = await fn();
      lastSavedAt.value = new Date();
      return out;
    } finally {
      saving.value = false;
    }
  }

  async function patchParagraph(id, body) {
    const rows = await authedRequest(`paragraphs?id=eq.${id}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ ...body, updated_at: new Date().toISOString() }),
    });
    // RLS answers a refused update with 0 rows, not an error.
    if (!rows?.length)
      throw new Error("The database didn't allow this change.");
    replaceLocal(rows[0]);
    return rows[0];
  }

  /** Replace a paragraph's blocks (keeping other content keys); undoable. */
  async function saveBlocks(paragraphId, blocks, label = "Edit") {
    return withSaving(async () => {
      const [stored] = await authedRequest(
        `paragraphs?id=eq.${paragraphId}&select=content,content_text`
      );
      if (!stored) throw new Error("This paragraph no longer exists.");
      await patchParagraph(paragraphId, {
        content: withBlocks(stored.content, blocks),
        content_text: blocksToPlainText(blocks),
      });
      pushUndo(label, () =>
        patchParagraph(paragraphId, {
          content: stored.content,
          content_text: stored.content_text,
        })
      );
    });
  }

  async function undo() {
    const last = undoStack.value[undoStack.value.length - 1];
    if (!last) return null;
    await withSaving(() => last.run());
    undoStack.value = undoStack.value.slice(0, -1);
    return last.label;
  }

  return {
    module,
    sections,
    paragraphs,
    paragraphsBySection,
    media,
    mediaById,
    stats,
    loading,
    error,
    saving,
    lastSavedAt,
    undoStack,
    load,
    saveBlocks,
    undo,
    // exposed for later phases (insert/move/delete build on these)
    patchParagraph,
    pushUndo,
    withSaving,
  };
}
