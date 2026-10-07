/*
 * useBookContents — the book's table of contents (OPENBRAIN-104): its
 * chapters grouped into the five subject parts (the chapter ramps), each
 * chapter with its top-level sections. Shared by the home page and
 * /chapters, which show it the way a chapter's opener shows its outline.
 *
 * Chapters come from the catalog (published), plus drafts for creators; the
 * sections from one public REST read. Readers see published chapters only,
 * so a part without one says it is in preparation.
 */
import { computed, ref, watch } from "vue";
import { useAuth } from "@/composables/useAuth";
import { useChapterCatalog } from "@/composables/useChapterCatalog";
import { apiRequest, authedRequest } from "@/services/api/client";
import { RAMPS, RAMP_NAMES, rampForModule } from "@/helper/chapterTheme";

// Sections that are not part of the outline: boxes, and the back matter.
const NOT_IN_OUTLINE = /^(box-|references$|footnotes$|further-reading$)/;

/** A chapter's outline sections, in order, from raw `sections` rows. An
 *  intro titled like the chapter ("The Retina") is not listed twice. */
export function outlineSections(rows, moduleId, moduleTitle = "") {
  const same = (t) =>
    String(t || "")
      .trim()
      .toLowerCase() ===
    String(moduleTitle || "")
      .trim()
      .toLowerCase();
  return (rows || [])
    .filter(
      (s) =>
        s.module_id === moduleId &&
        !s.parent_section_id &&
        !NOT_IN_OUTLINE.test(s.slug || "") &&
        !same(s.title)
    )
    .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
    .map((s) => ({ id: s.id, title: s.title }));
}

/**
 * The five parts, in the book's order, each with its chapters.
 * @returns {Array<{ramp, name, number, chapters: Array<{module, sections}>}>}
 */
export function bookParts(modules, sectionRows) {
  return RAMPS.map((ramp, i) => ({
    ramp,
    name: RAMP_NAMES[ramp],
    number: i + 1,
    chapters: (modules || [])
      .filter((m) => rampForModule(m) === ramp)
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
      .map((module) => ({
        module,
        sections: outlineSections(sectionRows, module.id, module.title),
      })),
  }));
}

export function useBookContents() {
  const { isCreator } = useAuth();
  const {
    modules,
    loading: catalogLoading,
    fetchCatalog,
  } = useChapterCatalog();
  const drafts = ref([]);
  const sectionRows = ref([]);
  const sectionsLoading = ref(false);

  // Creators also see drafts (OPENBRAIN-51); RLS allows only them.
  watch(
    isCreator,
    async (creator) => {
      drafts.value = [];
      if (!creator) return;
      try {
        const rows = await authedRequest(
          "modules?status=eq.draft&select=*&order=order_index.asc"
        );
        drafts.value = (rows || []).map((d) => ({ ...d, isDraft: true }));
      } catch (err) {
        console.warn("[useBookContents] draft fetch failed", err);
      }
    },
    { immediate: true }
  );

  const chapters = computed(() =>
    [...modules.value, ...drafts.value].sort(
      (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)
    )
  );

  async function loadSections(ids) {
    if (!ids.length) return;
    sectionsLoading.value = true;
    try {
      const rows = await (isCreator.value ? authedRequest : apiRequest)(
        `sections?module_id=in.(${ids.join(",")})&select=id,module_id,title,slug,order_index,parent_section_id&order=order_index.asc`
      );
      sectionRows.value = rows || [];
    } catch (err) {
      console.warn("[useBookContents] section fetch failed", err);
    } finally {
      sectionsLoading.value = false;
    }
  }
  watch(
    () => chapters.value.map((c) => c.id).join(","),
    (ids) => ids && loadSections(ids.split(",")),
    { immediate: true }
  );

  const parts = computed(() => bookParts(chapters.value, sectionRows.value));
  const loading = computed(() => catalogLoading.value);

  fetchCatalog();

  return { parts, chapters, loading, sectionsLoading };
}
