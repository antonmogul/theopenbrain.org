import { ref } from "vue";
import { useAuth } from "./useAuth";

// Supabase REST API config
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY;

export function useTrendingHighlights(options = {}) {
  const { limit = 10 } = options;

  const trending = ref([]);
  const loading = ref(false);
  const error = ref(null);

  const { session } = useAuth();

  // Helper for REST API calls
  async function supabaseRest(endpoint) {
    const accessToken = session.value?.access_token;

    const response = await fetch(`${supabaseUrl}/rest/v1/${endpoint}`, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${accessToken || supabaseKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }

    const text = await response.text();
    if (!text) return [];
    return JSON.parse(text);
  }

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

  // Format relative time
  function formatRelativeTime(dateString) {
    if (!dateString) return "";

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
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
    formatRelativeTime,
    truncateText,
  };
}
