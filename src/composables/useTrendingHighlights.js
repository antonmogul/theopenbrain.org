import { relativeShort } from "@/utils/format";
import { apiRequest as supabaseRest } from "@/services/api/client";
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

  // Fetch trending highlights for a section
  async function fetchTrendingForSection(sectionId) {
    await runFetch(
      `trending_highlights?section_id=eq.${sectionId}&select=*&order=highlight_count.desc&limit=${limit}`
    );
  }

  // Scroll to a highlight in the page
  function scrollToHighlight(item) {
    if (!item?.paragraph_id) return;

    const paragraph = document.querySelector(
      `[data-paragraph-id="${item.paragraph_id}"]`
    );

    if (paragraph) {
      // Scroll to paragraph
      paragraph.scrollIntoView({ behavior: "smooth", block: "center" });

      // Add temporary highlight effect
      paragraph.classList.add("ring-2", "ring-yellow-400", "bg-yellow-50");

      setTimeout(() => {
        paragraph.classList.remove("ring-2", "ring-yellow-400", "bg-yellow-50");
      }, 2000);
    }
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
    scrollToHighlight,
    formatRelativeTime: relativeShort,
    truncateText,
  };
}
