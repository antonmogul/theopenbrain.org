import { relativeShort } from "@/utils/format";
import { apiRequest as supabaseRest } from "@/services/api/client";
import { jumpToId } from "@/helper/readerJump";
import { useCrudResource } from "./useCrudResource";

export function useTrendingHighlights(options = {}) {
  const { limit = 10 } = options;

  // Shared list/loading/error + fetch scaffold. `trending` aliases the
  // resource's `list`. This resource is read-only (no create/update/delete),
  // so only runFetch is used.
  const {
    list: trending,
    loading,
    error,
    runFetch,
  } = useCrudResource({
    request: supabaseRest,
    logLabel: "useTrendingHighlights",
  });

  // Fetch trending highlights
  async function fetchTrending() {
    await runFetch(
      `trending_highlights?select=*&order=highlight_count.desc&limit=${limit}`
    );
  }

  // Fetch trending highlights for a section. trending_highlights has no
  // section_id, so filter through its paragraph (inner embed) — the old
  // `section_id=eq.` filter was a 400 (OPENBRAIN-56).
  async function fetchTrendingForSection(sectionId) {
    await runFetch(
      `trending_highlights?select=*,paragraph:paragraphs!inner(section_id)&paragraph.section_id=eq.${sectionId}&order=highlight_count.desc&limit=${limit}`
    );
  }

  // Fetch a whole chapter's trending passages for the reader's timeline
  // (OPENBRAIN-128): through the paragraph's section to its module, at most
  // 200 rows. `sections!section_id` names the relationship: since
  // sections.anchor_paragraph_id (20260924030000) there are two between
  // paragraphs and sections, and a bare `sections` embed is PostgREST's
  // PGRST201 (HTTP 300, "more than one relationship"). Not runFetch: that
  // logs a failure with console.error, and the timeline asks for this on
  // every chapter, signed in or not, where the CI smoke fails on console
  // errors. A failure here is a quiet empty list.
  let moduleFetchVersion = 0;
  async function fetchTrendingForModule(moduleId) {
    const version = ++moduleFetchVersion;
    if (!moduleId) {
      trending.value = [];
      loading.value = false;
      return;
    }
    loading.value = true;
    error.value = null;
    try {
      const data = await supabaseRest(
        "trending_highlights?select=paragraph_id,selected_text,highlight_count," +
          "paragraph:paragraphs!inner(section:sections!section_id!inner(module_id))" +
          `&paragraph.section.module_id=eq.${encodeURIComponent(moduleId)}` +
          "&order=highlight_count.desc&limit=200"
      );
      if (version === moduleFetchVersion) trending.value = data || [];
    } catch (e) {
      if (version === moduleFetchVersion) {
        console.warn("useTrendingHighlights: trending unavailable:", e);
        error.value = e?.message || String(e);
        trending.value = [];
      }
    } finally {
      // A superseded request must not end the newer one's loading.
      if (version === moduleFetchVersion) loading.value = false;
    }
  }

  // Scroll a trending passage's paragraph to the middle of the screen and
  // flash it (readerJump: reduced motion, the reader's .ob-flash).
  function scrollToHighlight(item) {
    if (!item?.paragraph_id) return;
    jumpToId(item.paragraph_id, { align: "center", flash: true });
  }

  // Truncate text with ellipsis
  function truncateText(text, maxLength = 100) {
    if (!text || text.length <= maxLength) return text;
    return text.slice(0, maxLength) + "...";
  }

  return {
    trending,
    loading,
    error,
    fetchTrending,
    fetchTrendingForSection,
    fetchTrendingForModule,
    scrollToHighlight,
    formatRelativeTime: relativeShort,
    truncateText,
  };
}
