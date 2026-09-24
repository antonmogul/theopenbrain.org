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
import { withBlocks } from "@/editor/editability.mjs";
import { blocksToPlainText } from "@/editor/plainText";

export { blocksToPlainText };

const PARAGRAPH_COLUMNS =
  "id,section_id,order_index,content,content_text,is_subsection_header,subsection_level,animation_id,animation_trigger,updated_at";

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
        "animations?select=id,title,animation_key,media_type,lottie_file_url,image_file_url,video_file_url,youtube_id,config&order=title.asc"
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

  // ---- subsections (OPENBRAIN-70) ----
  // A subsection is a header row (is_subsection_header, level 1); the level-1
  // rows after it belong to it, level 2 nests one deeper, and the next level-0
  // row ends it (chapterTransform.reconstructNesting).
  const levelOf = (r) => r.subsection_level || 0;

  async function setLevels(pairs) {
    for (const [id, subsection_level] of pairs)
      await patchParagraph(id, { subsection_level });
  }

  /**
   * Add a subsection heading before position `index`. The blocks below it
   * join it, up to the next subsection heading.
   */
  async function insertSubsection(sectionId, index, blocks) {
    const row = await insertParagraph(sectionId, index, blocks, {
      is_subsection_header: true,
      subsection_level: 1,
    });
    // One Undo for the whole step, not "Add block" plus the regrouping.
    const addUndo = undoStack.value[undoStack.value.length - 1];
    undoStack.value = undoStack.value.slice(0, -1);
    return withSaving(async () => {
      const rows = sectionRows(sectionId);
      const adopted = [];
      for (const r of rows.slice(rows.findIndex((x) => x.id === row.id) + 1)) {
        if (r.is_subsection_header) break;
        if (levelOf(r) === 0) adopted.push(r.id);
      }
      await setLevels(adopted.map((id) => [id, 1]));
      pushUndo("Add subsection", async () => {
        await setLevels(adopted.map((id) => [id, 0]));
        await addUndo.run();
      });
      return { row, adopted: adopted.length };
    });
  }

  /** Can this block move one level deeper (into the subsection above)? */
  function canIndent(id) {
    const row = paragraphs.value.find((p) => p.id === id);
    if (!row || row.is_subsection_header || levelOf(row) >= 2) return false;
    const rows = sectionRows(row.section_id);
    const prev = rows[rows.findIndex((p) => p.id === id) - 1];
    return !!prev && (prev.is_subsection_header || levelOf(prev) >= 1);
  }

  /**
   * Move a block one level in (+1) or out (-1). A subsection is one unbroken
   * run, so taking a block all the way out takes the blocks after it in that
   * subsection out too; returns how many blocks moved.
   */
  async function shiftLevel(id, dir) {
    return withSaving(async () => {
      const row = paragraphs.value.find((p) => p.id === id);
      if (!row) return 0;
      const before = levelOf(row);
      const after = Math.min(2, Math.max(0, before + dir));
      if (after === before) return 0;
      const moved = [[id, before]];
      if (after === 0) {
        const rows = sectionRows(row.section_id);
        for (const r of rows.slice(rows.findIndex((x) => x.id === id) + 1)) {
          if (r.is_subsection_header || levelOf(r) === 0) break;
          moved.push([r.id, levelOf(r)]);
        }
      }
      await setLevels(moved.map(([mid]) => [mid, after]));
      pushUndo(dir > 0 ? "Indent" : "Outdent", () => setLevels(moved));
      return moved.length;
    });
  }

  /** Turn a subsection back into ordinary blocks (the heading stays as text). */
  async function ungroupSubsection(id) {
    return withSaving(async () => {
      const header = paragraphs.value.find((p) => p.id === id);
      if (!header?.is_subsection_header) return;
      const rows = sectionRows(header.section_id);
      const members = [];
      for (const r of rows.slice(rows.findIndex((x) => x.id === id) + 1)) {
        if (r.is_subsection_header || levelOf(r) === 0) break;
        members.push([r.id, levelOf(r)]);
      }
      await patchParagraph(id, {
        is_subsection_header: false,
        subsection_level: 0,
      });
      await setLevels(members.map(([mid]) => [mid, 0]));
      pushUndo("Ungroup subsection", async () => {
        await patchParagraph(id, {
          is_subsection_header: true,
          subsection_level: levelOf(header),
        });
        await setLevels(members);
      });
    });
  }

  /** Attach, change or remove (animationId null) a paragraph's figure. */
  async function setFigure(id, animationId, trigger = null) {
    return withSaving(async () => {
      const row = paragraphs.value.find((p) => p.id === id);
      if (!row) return;
      // ?? null: an absent value must still clear the field on Undo (JSON
      // drops undefined).
      const before = {
        animation_id: row.animation_id ?? null,
        animation_trigger: row.animation_trigger ?? null,
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

  // Breakout boxes are sections slugged box-* (the reader letters them).
  function boxSlugFor(title) {
    const base = `box-${slugFor(title).replace(/-section$/, "")}`;
    const taken = new Set(sections.value.map((sec) => sec.slug));
    let slug = base;
    for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
    return slug;
  }
  const isBox = (sec) => !!sec?.slug?.startsWith("box-");

  /**
   * Place a breakout box (OPENBRAIN-70 A3, A4): under a main section
   * (parentId; null = end of the chapter) and, optionally, right after one
   * of that section's paragraphs.
   */
  async function setBoxPlacement(
    id,
    { parentId = null, anchorParagraphId = null }
  ) {
    return withSaving(async () => {
      const sec = sections.value.find((x) => x.id === id);
      if (!isBox(sec)) throw new Error("Only breakout boxes can be placed.");
      const before = {
        parent_section_id: sec.parent_section_id ?? null,
        anchor_paragraph_id: sec.anchor_paragraph_id ?? null,
      };
      try {
        await patchSection(id, {
          parent_section_id: parentId,
          anchor_paragraph_id: parentId ? anchorParagraphId : null,
        });
      } catch (err) {
        if (/parent_section_id|anchor_paragraph_id|column/i.test(err.message))
          throw new Error(
            "Placing boxes needs the OPENBRAIN-70 database update, which isn't applied yet."
          );
        throw err;
      }
      pushUndo("Box placement", () => patchSection(id, before));
    });
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

  // ---- figures: panel or text (OPENBRAIN-70 B2) ----
  // Fold the last `n` undo entries into one, so a multi-write step undoes as
  // one action.
  function foldUndo(n, label) {
    const steps = undoStack.value.slice(-n);
    undoStack.value = undoStack.value.slice(0, -n);
    pushUndo(label, async () => {
      for (const step of steps.reverse()) await step.run();
    });
  }

  /**
   * A paragraph's left-panel image figure becomes an image card in the text,
   * right after it. A figure with several frames brings its first frame.
   */
  async function figureToText(paragraphId) {
    const p = paragraphs.value.find((x) => x.id === paragraphId);
    const m = p && mediaById.value.get(p.animation_id);
    if (!m || m.media_type !== "image")
      throw new Error("Only image figures can move into the text.");
    const frames = Array.isArray(m.config?.images) ? m.config.images : [];
    const src = frames[0]?.src || m.image_file_url;
    if (!src) throw new Error("This figure has no image yet.");
    const rows = sectionRows(p.section_id);
    const at = rows.findIndex((x) => x.id === paragraphId) + 1;
    await setFigure(paragraphId, null);
    const row = await insertParagraph(p.section_id, at, [
      {
        type: "image",
        src,
        alt: frames[0]?.alt || m.title || "",
        caption: m.config?.caption || frames[0]?.caption || m.title || "",
      },
    ]);
    foldUndo(2, "Figure into text");
    return { row, frames: frames.length };
  }

  /**
   * An image block becomes the left-panel figure of the paragraph before it
   * (or after it, if it opens the section). Reuses the library row for that
   * image, or adds one.
   */
  async function imageToPanel(paragraphId) {
    const p = paragraphs.value.find((x) => x.id === paragraphId);
    const img = p?.content?.blocks?.find((b) => b.type === "image");
    if (!img?.src) throw new Error("This block has no image.");
    const rows = sectionRows(p.section_id);
    const i = rows.findIndex((x) => x.id === paragraphId);
    const host = rows
      .slice(0, i)
      .reverse()
      .concat(rows.slice(i + 1))
      .find(
        (x) =>
          !x.is_subsection_header &&
          !x.content?.blocks?.some((b) => b.type === "image")
      );
    if (!host) throw new Error("There's no paragraph here to show it beside.");
    let m = media.value.find(
      (x) => x.media_type === "image" && x.image_file_url === img.src
    );
    if (!m) {
      const key = `image-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
      const added = await authedRequest("animations", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          animation_key: key,
          title: img.alt || img.caption || "Image",
          media_type: "image",
          image_file_url: img.src,
          config: img.caption ? { caption: img.caption } : {},
        }),
      });
      if (!added?.length)
        throw new Error("The image couldn't be added to the library.");
      m = added[0];
      media.value = [...media.value, m];
    }
    await setFigure(host.id, m.id, host.animation_trigger || "auto");
    await deleteParagraph(paragraphId);
    foldUndo(2, "Image to panel");
    return { host, media: m };
  }

  // ---- YouTube in the media library (OPENBRAIN-70 D2) ----
  /** The library row for a YouTube video, reused if it's already there. */
  async function addYouTubeMedia(youtubeId, title) {
    const found = media.value.find(
      (m) => m.media_type === "youtube" && m.youtube_id === youtubeId
    );
    if (found) return found;
    const rows = await authedRequest("animations", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        animation_key: `youtube-${youtubeId}`,
        title: title || "YouTube video",
        media_type: "youtube",
        youtube_id: youtubeId,
        interaction_type: "youtube_embed",
      }),
    });
    if (!rows?.length)
      throw new Error("The video couldn't be added to the library.");
    media.value = [...media.value, rows[0]];
    return rows[0];
  }

  // ---- widgets as panel figures (OPENBRAIN-70 B5) ----
  /**
   * Make an interactive widget a paragraph's left-panel figure. The library
   * keeps one row per widget (media_type "widget", config.widgetId).
   */
  async function setPanelWidget(paragraphId, { widgetId, title }) {
    let m = media.value.find(
      (x) => x.media_type === "widget" && x.config?.widgetId === widgetId
    );
    if (!m) {
      let rows;
      try {
        rows = await authedRequest("animations", {
          method: "POST",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify({
            animation_key: `widget-${widgetId}`,
            title: title || widgetId,
            media_type: "widget",
            config: { widgetId },
          }),
        });
      } catch (err) {
        if (/media_type|check constraint|23514/i.test(err.message))
          throw new Error(
            "Widgets in the figure panel need the OPENBRAIN-70 database update, which isn't applied yet."
          );
        throw err;
      }
      if (!rows?.length)
        throw new Error("The widget couldn't be added to the library.");
      m = rows[0];
      media.value = [...media.value, m];
    }
    const p = paragraphs.value.find((x) => x.id === paragraphId);
    await setFigure(paragraphId, m.id, p?.animation_trigger || "auto");
    return m;
  }

  // ---- figure frames (OPENBRAIN-70 B3) ----
  async function patchMedia(id, body) {
    const rows = await authedRequest(`animations?id=eq.${id}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ ...body, updated_at: new Date().toISOString() }),
    });
    if (!rows?.length)
      throw new Error("The database didn't allow this change.");
    media.value = media.value.map((m) =>
      m.id === id ? { ...m, ...rows[0] } : m
    );
    return rows[0];
  }

  /**
   * Save an image figure's title, caption and frames ([{ src, alt, caption }]).
   * The first frame is also image_file_url, which older readers show.
   */
  async function setFigureFrames(id, { title, caption, images }) {
    return withSaving(async () => {
      const m = media.value.find((x) => x.id === id);
      if (!m) throw new Error("That figure isn't in the library.");
      if (!images.length) throw new Error("A figure needs at least one image.");
      const before = {
        title: m.title ?? null,
        image_file_url: m.image_file_url ?? null,
        config: m.config ?? {},
      };
      const frames = images.map(({ src, alt, caption: c }) => ({
        src,
        ...(alt ? { alt } : {}),
        ...(c ? { caption: c } : {}),
      }));
      await patchMedia(id, {
        title,
        image_file_url: frames[0].src,
        config: { ...(m.config || {}), caption: caption || "", images: frames },
      });
      pushUndo("Figure settings", () => patchMedia(id, before));
    });
  }

  // ---- figure widgets (OPENBRAIN-80) ----
  // A figure widget's editable content is config.content on its animations
  // row (animation_states is read-only), so no other table changes.

  /** The figure's state labels from animation_states, for the form's defaults. */
  async function loadFigureStates(id) {
    const rows = await authedRequest(
      `animation_states?animation_id=eq.${id}&is_highlight_state=eq.false&select=state_label,state_description&order=order_index`
    );
    return (rows || []).map((r) => r.state_description || r.state_label);
  }

  /** Save a widget figure's title and content (see widgets/figures/content.js). */
  async function setFigureContent(id, { title, content }) {
    return withSaving(async () => {
      const m = media.value.find((x) => x.id === id);
      if (!m) throw new Error("That figure isn't in the library.");
      if (!title?.trim()) throw new Error("A figure needs a title.");
      const before = { title: m.title ?? null, config: m.config ?? null };
      await patchMedia(id, {
        title: title.trim(),
        config: { ...(m.config || {}), content },
      });
      pushUndo("Figure settings", () => patchMedia(id, before));
    });
  }

  // ---- chapter cover (OPENBRAIN-67) ----
  // modules.cover_image_url wins over the code-side default in
  // helper/chapterCover.js; null goes back to that default.
  async function patchModule(body) {
    const rows = await authedRequest(`modules?id=eq.${module.value.id}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(body),
    });
    if (!rows?.length)
      throw new Error("The database didn't allow this change.");
    module.value = { ...module.value, ...rows[0] };
  }

  /**
   * Save chapter details (OPENBRAIN-70 C1, C2): any of title, description
   * (the opener's subtitle) and authors ([{ name, affiliation }]).
   */
  async function setDetails(patch) {
    return withSaving(async () => {
      const before = Object.fromEntries(
        Object.keys(patch).map((k) => [k, module.value[k] ?? null])
      );
      await patchModule(patch);
      pushUndo("Chapter details", () => patchModule(before));
    });
  }

  async function setCover(url) {
    return withSaving(async () => {
      const before = module.value.cover_image_url ?? null;
      await patchModule({ cover_image_url: url || null });
      pushUndo(url ? "Change cover" : "Reset cover", () =>
        patchModule({ cover_image_url: before })
      );
    });
  }

  async function renameSection(id, title) {
    return withSaving(async () => {
      const before = sections.value.find((sec) => sec.id === id)?.title;
      await patchSection(id, { title });
      pushUndo("Rename section", () => patchSection(id, { title: before }));
    });
  }

  /** Add a section at position `index` of the chapter's sections. */
  async function addSection(index, title, { box = false } = {}) {
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
          slug: box ? boxSlugFor(title) : slugFor(title),
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
    insertSubsection,
    canIndent,
    shiftLevel,
    ungroupSubsection,
    setCover,
    setDetails,
    figureToText,
    setFigureFrames,
    loadFigureStates,
    setFigureContent,
    addYouTubeMedia,
    setPanelWidget,
    imageToPanel,
    renameSection,
    setBoxPlacement,
    isBox,
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
