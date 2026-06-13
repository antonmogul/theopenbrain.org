import { ref, computed } from "vue";
import { useAuth } from "./useAuth";

// Supabase REST API config
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY;

// Available highlight colors. `hex` is the Tailwind -300 border/dot shade —
// the single source for JS color lookups (e.g. NotebookTab border dots).
export const HIGHLIGHT_COLORS = [
  { value: "yellow", name: "Yellow", class: "bg-yellow-200", bgClass: "bg-yellow-300", hex: "#fcd34d" },
  { value: "green", name: "Green", class: "bg-green-200", bgClass: "bg-green-300", hex: "#86efac" },
  { value: "blue", name: "Blue", class: "bg-blue-200", bgClass: "bg-blue-300", hex: "#93c5fd" },
  { value: "pink", name: "Pink", class: "bg-pink-200", bgClass: "bg-pink-300", hex: "#f9a8d4" },
  { value: "purple", name: "Purple", class: "bg-purple-200", bgClass: "bg-purple-300", hex: "#c4b5fd" },
];

// Map of highlight color value -> border/dot hex (the -300 shade).
export const HIGHLIGHT_HEX = Object.fromEntries(
  HIGHLIGHT_COLORS.map((c) => [c.value, c.hex])
);

export function useHighlights(options = {}) {
  const { paragraphId = null } = options;

  const highlights = ref([]);
  const loading = ref(false);
  const error = ref(null);

  const { user, session } = useAuth();

  // Helper for REST API calls
  async function supabaseRest(endpoint, options = {}) {
    const accessToken = session.value?.access_token;
    if (!accessToken && options.method !== "GET") {
      throw new Error("No access token available");
    }

    const { headers: optionHeaders, ...restOptions } = options;

    const response = await fetch(`${supabaseUrl}/rest/v1/${endpoint}`, {
      ...restOptions,
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${accessToken || supabaseKey}`,
        "Content-Type": "application/json",
        ...optionHeaders,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }

    const text = await response.text();
    if (!text) return options.method === "POST" ? [] : { success: true };
    return JSON.parse(text);
  }

  // Fetch highlights for current user
  async function fetchHighlights(filterParagraphId = null) {
    if (!user.value) {
      highlights.value = [];
      return;
    }

    loading.value = true;
    error.value = null;

    try {
      let query = `highlights?user_id=eq.${user.value.id}&select=*&order=created_at.desc`;

      // Filter by paragraph if specified
      const targetParagraphId = filterParagraphId || paragraphId;
      if (targetParagraphId) {
        query += `&paragraph_id=eq.${targetParagraphId}`;
      }

      const data = await supabaseRest(query);
      highlights.value = data || [];
    } catch (e) {
      console.error("useHighlights: Error fetching highlights:", e);
      error.value = e.message;
      highlights.value = [];
    } finally {
      loading.value = false;
    }
  }

  // Fetch highlights for multiple paragraphs (batch)
  async function fetchHighlightsForParagraphs(paragraphIds) {
    if (!user.value || !paragraphIds?.length) {
      highlights.value = [];
      return;
    }

    loading.value = true;
    error.value = null;

    try {
      const idsParam = paragraphIds.map((id) => `"${id}"`).join(",");
      const query = `highlights?user_id=eq.${user.value.id}&paragraph_id=in.(${idsParam})&select=*&order=start_offset.asc`;

      const data = await supabaseRest(query);
      highlights.value = data || [];
    } catch (e) {
      console.error("useHighlights: Error fetching highlights:", e);
      error.value = e.message;
      highlights.value = [];
    } finally {
      loading.value = false;
    }
  }

  // Get highlights grouped by paragraph
  const highlightsByParagraph = computed(() => {
    const grouped = {};
    for (const h of highlights.value) {
      if (!grouped[h.paragraph_id]) {
        grouped[h.paragraph_id] = [];
      }
      grouped[h.paragraph_id].push(h);
    }
    // Sort highlights within each paragraph by start_offset
    for (const pId of Object.keys(grouped)) {
      grouped[pId].sort((a, b) => a.start_offset - b.start_offset);
    }
    return grouped;
  });

  // Create a new highlight
  async function createHighlight({
    paragraphId: pId,
    startOffset,
    endOffset,
    selectedText,
    color = "yellow",
    note = null,
    isPublic = false,
    tags = [],
  }) {
    if (!user.value) {
      throw new Error("User not authenticated");
    }

    try {
      const data = await supabaseRest("highlights", {
        method: "POST",
        headers: {
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          user_id: user.value.id,
          paragraph_id: pId,
          start_offset: startOffset,
          end_offset: endOffset,
          selected_text: selectedText,
          color: color,
          note: note,
          is_public: isPublic,
          tags: tags,
        }),
      });

      const newHighlight = Array.isArray(data) ? data[0] : data;

      // Add to local state
      highlights.value = [...highlights.value, newHighlight];

      return newHighlight;
    } catch (e) {
      console.error("useHighlights: Error creating highlight:", e);
      throw e;
    }
  }

  // Update a highlight
  async function updateHighlight(highlightId, updates) {
    try {
      await supabaseRest(`highlights?id=eq.${highlightId}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      });

      // Update local state
      const index = highlights.value.findIndex((h) => h.id === highlightId);
      if (index !== -1) {
        highlights.value[index] = { ...highlights.value[index], ...updates };
        highlights.value = [...highlights.value]; // Trigger reactivity
      }
    } catch (e) {
      console.error("useHighlights: Error updating highlight:", e);
      throw e;
    }
  }

  // Delete a highlight
  async function deleteHighlight(highlightId) {
    try {
      await supabaseRest(`highlights?id=eq.${highlightId}`, {
        method: "DELETE",
      });

      // Remove from local state
      highlights.value = highlights.value.filter((h) => h.id !== highlightId);
    } catch (e) {
      console.error("useHighlights: Error deleting highlight:", e);
      throw e;
    }
  }

  // Toggle public status
  async function togglePublic(highlightId) {
    const highlight = highlights.value.find((h) => h.id === highlightId);
    if (highlight) {
      await updateHighlight(highlightId, { is_public: !highlight.is_public });
    }
  }

  // Get color class for a highlight
  function getColorClass(color) {
    const colorConfig = HIGHLIGHT_COLORS.find((c) => c.value === color);
    return colorConfig?.class || "bg-yellow-200";
  }

  // Get recent highlights (for dashboard)
  async function fetchRecentHighlights(limit = 5) {
    if (!user.value) return [];

    try {
      const query = `highlights?user_id=eq.${user.value.id}&select=*&order=created_at.desc&limit=${limit}`;
      const data = await supabaseRest(query);
      return data || [];
    } catch (e) {
      console.error("useHighlights: Error fetching recent highlights:", e);
      return [];
    }
  }

  return {
    highlights,
    loading,
    error,
    highlightsByParagraph,
    fetchHighlights,
    fetchHighlightsForParagraphs,
    createHighlight,
    updateHighlight,
    deleteHighlight,
    togglePublic,
    getColorClass,
    fetchRecentHighlights,
  };
}
