import { ref } from "vue";
import { relativeShort } from "@/utils/format";
import { apiRequest as supabaseRest } from "@/services/api/client";

export function useTrendingHighlights(options = {}) {
  const { limit = 10 } = options;

  const trending = ref([]);
  const loading = ref(false);
  const error = ref(null);

  // Fetch trending highlights
  async function fetchTrending() {
    loading.value = true;
    error.value = null;

    try {
      const query = `trending_highlights?select=*&order=highlight_count.desc&limit=${limit}`;
      const data = await supabaseRest(query);
      trending.value = data || [];
    } catch (e) {
      console.error("useTrendingHighlights: Error fetching trending:", e);
      error.value = e.message;
      trending.value = [];
    } finally {
      loading.value = false;
    }
  }

  // Fetch trending highlights for a section
  async function fetchTrendingForSection(sectionId) {
    loading.value = true;
    error.value = null;

    try {
      const query = `trending_highlights?section_id=eq.${sectionId}&select=*&order=highlight_count.desc&limit=${limit}`;
      const data = await supabaseRest(query);
      trending.value = data || [];
    } catch (e) {
      console.error("useTrendingHighlights: Error fetching trending:", e);
      error.value = e.message;
      trending.value = [];
    } finally {
      loading.value = false;
    }
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
