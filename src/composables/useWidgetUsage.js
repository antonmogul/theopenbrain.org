/*
 * Where each widget is used (OPENBRAIN-71): the dashboard's Widgets section.
 *
 * Three ways a widget reaches a chapter:
 *   - text:  a { type: "widget" } block in a paragraph (CMS-authored);
 *   - panel: an animations row with media_type "widget" set as a
 *            paragraph's figure (OPENBRAIN-70 B5);
 *   - code:  a placement in src/widgets/placements.js, which the reader
 *            skips when the chapter already has a block for that widget.
 */
import { ref } from "vue";
import { authedRequest } from "@/services/api/client";
import { WIDGET_PLACEMENTS } from "@/widgets/placements";

const WIDGET_BLOCK = encodeURIComponent('{"blocks":[{"type":"widget"}]}');

/** Pure: build widgetId → [{ chapter, chapterSlug, section, where }]. */
export function buildWidgetUsage({
  modules = [],
  sections = [],
  blockRows = [],
  widgetMedia = [],
  figureRows = [],
  placements = WIDGET_PLACEMENTS,
}) {
  const moduleById = new Map(modules.map((m) => [m.id, m]));
  const sectionById = new Map(sections.map((s) => [s.id, s]));
  const where = (sectionId) => {
    const s = sectionById.get(sectionId);
    const m = s && moduleById.get(s.module_id);
    return {
      chapter: m?.title || "Unknown chapter",
      chapterSlug: m?.slug || "",
      section: s?.title || "",
    };
  };
  const usage = new Map();
  const add = (id, place) => {
    if (!id) return;
    if (!usage.has(id)) usage.set(id, []);
    usage.get(id).push(place);
  };

  const authored = new Set(); // "chapterSlug:widgetId" with a DB block
  for (const p of blockRows) {
    for (const b of p.content?.blocks || []) {
      if (b?.type !== "widget" || !b.widgetId) continue;
      const w = where(p.section_id);
      authored.add(`${w.chapterSlug}:${b.widgetId}`);
      add(b.widgetId, { ...w, where: "text" });
    }
  }
  const widgetOf = new Map(widgetMedia.map((m) => [m.id, m.config?.widgetId]));
  for (const p of figureRows)
    add(widgetOf.get(p.animation_id), {
      ...where(p.section_id),
      where: "panel",
    });

  const titleBySlug = new Map(modules.map((m) => [m.slug, m.title]));
  for (const pl of placements) {
    if (authored.has(`${pl.chapterSlug}:${pl.widgetId}`)) continue;
    if (!titleBySlug.has(pl.chapterSlug)) continue; // chapter not in the book
    add(pl.widgetId, {
      chapter: titleBySlug.get(pl.chapterSlug),
      chapterSlug: pl.chapterSlug,
      section: "",
      where: "code",
    });
  }
  return usage;
}

export function useWidgetUsage() {
  const usage = ref(new Map());
  const loading = ref(false);
  const error = ref("");

  async function load() {
    loading.value = true;
    error.value = "";
    try {
      const [modules, sections, blockRows, widgetMedia] = await Promise.all([
        authedRequest("modules?select=id,title,slug,order_index"),
        authedRequest("sections?select=id,module_id,title,slug"),
        authedRequest(
          `paragraphs?content=cs.${WIDGET_BLOCK}&select=id,section_id,content`
        ),
        authedRequest("animations?media_type=eq.widget&select=id,config"),
      ]);
      const ids = (widgetMedia || []).map((m) => `"${m.id}"`).join(",");
      const figureRows = ids
        ? await authedRequest(
            `paragraphs?animation_id=in.(${ids})&select=id,section_id,animation_id`
          )
        : [];
      usage.value = buildWidgetUsage({
        modules: modules || [],
        sections: sections || [],
        blockRows: blockRows || [],
        widgetMedia: widgetMedia || [],
        figureRows: figureRows || [],
      });
    } catch (err) {
      console.error("useWidgetUsage:", err);
      error.value = "Couldn't load where widgets are used. Try again.";
    } finally {
      loading.value = false;
    }
  }

  return { usage, loading, error, load };
}
