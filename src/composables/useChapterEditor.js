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
        "animations?select=id,title,animation_key,media_type,lottie_file_url,image_file_url,video_file_url,youtube_id&order=title.asc"
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

  // ---- structure: insert / delete / move / figure (OPENBRAIN-61) ----
  // (section_id, order_index) is UNIQUE, so rows that change position are
  // parked on a temporary order first; each phase runs in parallel because
  // its values can't collide with each other or with rows that stay put.
  const PARK = 100000;
  const sectionRows = (sectionId) =>
    (paragraphsBySection.value.get(sectionId) || []).slice();

  async function setOrders(pairs) {
    await Promise.all(
      pairs.map(([id, order_index]) => patchParagraph(id, { order_index }))
    );
  }
  async function reorder(pairs) {
    await setOrders(pairs.map(([id], j) => [id, PARK + j]));
    await setOrders(pairs);
  }

  async function postParagraph(row) {
    const rows = await authedRequest("paragraphs", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(row),
    });
    if (!rows?.length)
      throw new Error("The database didn't allow this change.");
    paragraphs.value = [...paragraphs.value, rows[0]];
    return rows[0];
  }

  async function removeParagraph(id) {
    const rows = await authedRequest(`paragraphs?id=eq.${id}`, {
      method: "DELETE",
      headers: { Prefer: "return=representation" },
    });
    if (!rows?.length)
      throw new Error("The database didn't allow this change.");
    paragraphs.value = paragraphs.value.filter((p) => p.id !== id);
  }

  /**
   * Insert a paragraph at position `index` of a section (0 = first). It takes
   * the subsection level of the row before it, so it lands in the same
   * subsection. Returns the new row.
   */
  async function insertParagraph(sectionId, index, blocks, extra = {}) {
    return withSaving(async () => {
      const rows = sectionRows(sectionId);
      const after = rows.slice(index);
      const prev = rows[index - 1];
      const order_index = after.length
        ? after[0].order_index
        : (rows[rows.length - 1]?.order_index ?? -1) + 1;
      const shifted = after.map((r) => [r.id, r.order_index + 1]);
      if (shifted.length)
        await setOrders(shifted.map(([id], j) => [id, PARK + j]));
      const row = await postParagraph({
        section_id: sectionId,
        order_index,
        content: { blocks },
        content_text: blocksToPlainText(blocks),
        is_subsection_header: false,
        subsection_level: prev?.subsection_level || 0,
        ...extra,
      });
      if (shifted.length) await setOrders(shifted);
      pushUndo("Add block", async () => {
        await removeParagraph(row.id);
        if (after.length)
          await reorder(after.map((r) => [r.id, r.order_index]));
      });
      return row;
    });
  }

  /** Delete a paragraph; Undo puts the row back (not readers' highlights). */
  async function deleteParagraph(id) {
    return withSaving(async () => {
      const row = paragraphs.value.find((p) => p.id === id);
      if (!row) return;
      try {
        await removeParagraph(id);
      } catch (err) {
        if (/409|foreign key|violates/i.test(err.message))
          throw new Error(
            "A reader's saved place points at this paragraph, so it can't be deleted yet."
          );
        throw err;
      }
      pushUndo("Delete block", () =>
        postParagraph({
          id: row.id,
          section_id: row.section_id,
          order_index: row.order_index,
          content: row.content,
          content_text: row.content_text,
          is_subsection_header: row.is_subsection_header,
          subsection_level: row.subsection_level,
          animation_id: row.animation_id,
          animation_trigger: row.animation_trigger,
        })
      );
    });
  }

  /** Swap a paragraph with its neighbour: dir -1 = up, +1 = down. */
  async function moveParagraph(id, dir) {
    return withSaving(async () => {
      const row = paragraphs.value.find((p) => p.id === id);
      if (!row) return;
      const rows = sectionRows(row.section_id);
      const i = rows.findIndex((p) => p.id === id);
      const other = rows[i + dir];
      if (!other) return;
      const swap = [
        [row.id, other.order_index],
        [other.id, row.order_index],
      ];
      await reorder(swap);
      pushUndo(dir < 0 ? "Move up" : "Move down", () =>
        reorder([
          [row.id, row.order_index],
          [other.id, other.order_index],
        ])
      );
    });
  }

  /** Attach, change or remove (animationId null) a paragraph's figure. */
  async function setFigure(id, animationId, trigger = null) {
    return withSaving(async () => {
      const row = paragraphs.value.find((p) => p.id === id);
      if (!row) return;
      const before = {
        animation_id: row.animation_id,
        animation_trigger: row.animation_trigger,
      };
      await patchParagraph(id, {
        animation_id: animationId,
        animation_trigger: animationId ? trigger : null,
      });
      pushUndo(animationId ? "Set figure" : "Remove figure", () =>
        patchParagraph(id, before)
      );
    });
  }

  // ---- sections (OPENBRAIN-62) ----
  // (module_id, order_index) and (module_id, slug) are UNIQUE. Deleting a
  // section cascades to its paragraphs, notes, quizzes and flashcards, so
  // only empty sections can be deleted here.
  const RESERVED_SLUGS = new Set([
    "introduction",
    "further-reading",
    "footnotes",
  ]);

  function slugFor(title) {
    const base =
      String(title || "section")
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60) || "section";
    const taken = new Set(sections.value.map((sec) => sec.slug));
    let slug =
      RESERVED_SLUGS.has(base) || base.startsWith("box-")
        ? `${base}-section`
        : base;
    for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
    return slug;
  }

  async function patchSection(id, body) {
    const rows = await authedRequest(`sections?id=eq.${id}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ ...body, updated_at: new Date().toISOString() }),
    });
    if (!rows?.length)
      throw new Error("The database didn't allow this change.");
    const i = sections.value.findIndex((sec) => sec.id === id);
    if (i >= 0)
      sections.value.splice(i, 1, { ...sections.value[i], ...rows[0] });
    sections.value.sort((x, y) => x.order_index - y.order_index);
    return rows[0];
  }
  async function setSectionOrders(pairs) {
    await Promise.all(
      pairs.map(([id, order_index]) => patchSection(id, { order_index }))
    );
  }

  async function renameSection(id, title) {
    return withSaving(async () => {
      const before = sections.value.find((sec) => sec.id === id)?.title;
      await patchSection(id, { title });
      pushUndo("Rename section", () => patchSection(id, { title: before }));
    });
  }

  /** Add a section at position `index` of the chapter's sections. */
  async function addSection(index, title) {
    return withSaving(async () => {
      const list = sections.value.slice();
      const after = list.slice(index);
      const order_index = after.length
        ? after[0].order_index
        : (list[list.length - 1]?.order_index ?? -1) + 1;
      const shifted = after.map((sec) => [sec.id, sec.order_index + 1]);
      if (shifted.length)
        await setSectionOrders(shifted.map(([id], j) => [id, PARK + j]));
      const rows = await authedRequest("sections", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          module_id: module.value.id,
          title,
          slug: slugFor(title),
          order_index,
        }),
      });
      if (!rows?.length)
        throw new Error("The database didn't allow this change.");
      sections.value = [...sections.value, rows[0]].sort(
        (x, y) => x.order_index - y.order_index
      );
      if (shifted.length) await setSectionOrders(shifted);
      const created = rows[0];
      pushUndo("Add section", async () => {
        await authedRequest(`sections?id=eq.${created.id}`, {
          method: "DELETE",
        });
        sections.value = sections.value.filter((sec) => sec.id !== created.id);
        if (after.length) {
          await setSectionOrders(after.map((sec, j) => [sec.id, PARK + j]));
          await setSectionOrders(after.map((sec) => [sec.id, sec.order_index]));
        }
      });
      return created;
    });
  }

  async function moveSection(id, dir) {
    return withSaving(async () => {
      const list = sections.value.slice();
      const i = list.findIndex((sec) => sec.id === id);
      const other = list[i + dir];
      if (i < 0 || !other) return;
      const a = list[i];
      const swap = async (x, y) => {
        await setSectionOrders([[x.id, PARK]]);
        await setSectionOrders([[y.id, x.order_index]]);
        await setSectionOrders([[x.id, y.order_index]]);
      };
      await swap(a, other);
      pushUndo(dir < 0 ? "Move section up" : "Move section down", () =>
        swap(
          { ...a, order_index: other.order_index },
          { ...other, order_index: a.order_index }
        )
      );
    });
  }

  async function deleteSection(id) {
    return withSaving(async () => {
      if ((paragraphsBySection.value.get(id) || []).length)
        throw new Error("Move or delete this section's blocks first.");
      const sec = sections.value.find((x) => x.id === id);
      const rows = await authedRequest(`sections?id=eq.${id}`, {
        method: "DELETE",
        headers: { Prefer: "return=representation" },
      });
      if (!rows?.length)
        throw new Error("The database didn't allow this change.");
      sections.value = sections.value.filter((x) => x.id !== id);
      pushUndo("Delete section", async () => {
        const back = await authedRequest("sections", {
          method: "POST",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify({
            id: sec.id,
            module_id: sec.module_id,
            title: sec.title,
            slug: sec.slug,
            order_index: sec.order_index,
          }),
        });
        sections.value = [...sections.value, back[0]].sort(
          (x, y) => x.order_index - y.order_index
        );
      });
    });
  }

  /**
   * Insert planned widget blocks (planPlacementConversion). Within a section
   * the lowest positions go last, so earlier inserts don't shift later ones.
   */
  async function convertPlacements(ready) {
    const ordered = ready
      .slice()
      .sort((x, y) =>
        x.sectionId === y.sectionId
          ? y.index - x.index
          : String(x.sectionId).localeCompare(String(y.sectionId))
      );
    for (const item of ordered)
      await insertParagraph(item.sectionId, item.index, [item.block]);
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
    insertParagraph,
    deleteParagraph,
    moveParagraph,
    setFigure,
    renameSection,
    addSection,
    moveSection,
    deleteSection,
    convertPlacements,
    undo,
    // exposed for later phases (insert/move/delete build on these)
    patchParagraph,
    pushUndo,
    withSaving,
  };
}
