import { computed } from "vue";
import { useAuth } from "./useAuth";
import { authedRequest as supabaseRest } from "@/services/api/client";
import { useCrudResource } from "./useCrudResource";

export function useNotes(options = {}) {
  const { sectionId = null } = options;

  const { user } = useAuth();

  // Shared list/loading/error + fetch/delete scaffold. `notes` aliases the
  // resource's `list` so the public API is unchanged.
  const {
    list: notes,
    loading,
    error,
    runFetch,
    removeById,
  } = useCrudResource({
    request: supabaseRest,
    table: "notes",
    logLabel: "useNotes",
  });

  // Fetch notes for current user with optional filters
  async function fetchNotes(filters = {}) {
    if (!user.value) {
      notes.value = [];
      return;
    }

    // Build query with joined highlight data
    let query = `notes?user_id=eq.${user.value.id}&select=*,highlight:highlights(id,selected_text,color,paragraph_id)&order=created_at.desc`;

    // Apply filters
    const targetSectionId = filters.sectionId || sectionId;
    if (targetSectionId) {
      query += `&section_id=eq.${targetSectionId}`;
    }

    if (filters.highlightId) {
      query += `&highlight_id=eq.${filters.highlightId}`;
    }

    await runFetch(query);
  }

  // Create a new note
  async function createNote({
    content,
    highlightId = null,
    paragraphId = null,
    sectionId: secId = null,
    isPublic = false,
  }) {
    if (!user.value) {
      throw new Error("User not authenticated");
    }

    try {
      const data = await supabaseRest("notes", {
        method: "POST",
        headers: {
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          user_id: user.value.id,
          content,
          highlight_id: highlightId,
          paragraph_id: paragraphId,
          section_id: secId || sectionId,
          is_public: isPublic,
        }),
      });

      const newNote = Array.isArray(data) ? data[0] : data;

      // If there's a linked highlight, fetch it
      if (highlightId) {
        try {
          const highlights = await supabaseRest(
            `highlights?id=eq.${highlightId}&select=id,selected_text,color,paragraph_id`
          );
          if (highlights && highlights.length > 0) {
            newNote.highlight = highlights[0];
          }
        } catch (e) {
          console.warn("useNotes: Could not fetch linked highlight:", e);
        }
      }

      // Add to local state
      notes.value = [newNote, ...notes.value];

      return newNote;
    } catch (e) {
      console.error("useNotes: Error creating note:", e);
      throw e;
    }
  }

  // Update a note
  async function updateNote(noteId, content) {
    try {
      await supabaseRest(`notes?id=eq.${noteId}`, {
        method: "PATCH",
        body: JSON.stringify({
          content,
          updated_at: new Date().toISOString(),
        }),
      });

      // Update local state
      const index = notes.value.findIndex((n) => n.id === noteId);
      if (index !== -1) {
        notes.value[index] = {
          ...notes.value[index],
          content,
          updated_at: new Date().toISOString(),
        };
        notes.value = [...notes.value]; // Trigger reactivity
      }
    } catch (e) {
      console.error("useNotes: Error updating note:", e);
      throw e;
    }
  }

  // Delete a note
  async function deleteNote(noteId) {
    await removeById(noteId);
  }

  // Toggle note public status
  async function togglePublic(noteId) {
    const note = notes.value.find((n) => n.id === noteId);
    if (note) {
      try {
        await supabaseRest(`notes?id=eq.${noteId}`, {
          method: "PATCH",
          body: JSON.stringify({
            is_public: !note.is_public,
            updated_at: new Date().toISOString(),
          }),
        });

        // Update local state
        const index = notes.value.findIndex((n) => n.id === noteId);
        if (index !== -1) {
          notes.value[index] = {
            ...notes.value[index],
            is_public: !note.is_public,
            updated_at: new Date().toISOString(),
          };
          notes.value = [...notes.value];
        }
      } catch (e) {
        console.error("useNotes: Error toggling public status:", e);
        throw e;
      }
    }
  }

  // Get notes count
  const totalNotes = computed(() => notes.value.length);

  // Get notes linked to highlights
  const notesWithHighlights = computed(() =>
    notes.value.filter((n) => n.highlight_id)
  );

  // Get standalone notes (not linked to highlights)
  const standaloneNotes = computed(() =>
    notes.value.filter((n) => !n.highlight_id)
  );

  // Fetch recent notes for dashboard
  async function fetchRecentNotes(limit = 5) {
    if (!user.value) return [];

    try {
      const query = `notes?user_id=eq.${user.value.id}&select=*,highlight:highlights(id,selected_text,color)&order=created_at.desc&limit=${limit}`;
      const data = await supabaseRest(query);
      return data || [];
    } catch (e) {
      console.error("useNotes: Error fetching recent notes:", e);
      return [];
    }
  }

  return {
    notes,
    loading,
    error,
    totalNotes,
    notesWithHighlights,
    standaloneNotes,
    fetchNotes,
    createNote,
    updateNote,
    deleteNote,
    togglePublic,
    fetchRecentNotes,
  };
}
