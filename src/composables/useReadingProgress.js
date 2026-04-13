import { ref, onMounted, onUnmounted } from "vue";
import { useAuth } from "./useAuth";

// Supabase REST API config
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY;

export function useReadingProgress(initialModuleId = null, courseId = null) {
  let moduleId = initialModuleId;

  const progress = ref(null);
  const timeSpent = ref(0);
  const loading = ref(false);
  const error = ref(null);

  const { user, session } = useAuth();

  let saveInterval = null;
  let startTime = Date.now();
  let isTracking = false;

  // Allow setting moduleId after initialization (for lazy-loaded chapters)
  async function initForModule(newModuleId) {
    if (isTracking) stopTracking();
    moduleId = newModuleId;
    if (moduleId) {
      await loadProgress();
      startTracking();
    }
  }

  // Helper for REST API calls
  async function supabaseRest(endpoint, options = {}) {
    const accessToken = session.value?.access_token;
    if (!accessToken) {
      throw new Error("No access token available");
    }

    const { headers: optionHeaders, ...restOptions } = options;

    const response = await fetch(`${supabaseUrl}/rest/v1/${endpoint}`, {
      ...restOptions,
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        ...optionHeaders,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }

    // Handle empty responses for PATCH/DELETE
    const text = await response.text();
    if (!text) return { success: true };
    return JSON.parse(text);
  }

  // Load existing progress
  async function loadProgress() {
    if (!user.value || !moduleId) return;

    loading.value = true;
    error.value = null;

    try {
      let query = `reading_progress?user_id=eq.${user.value.id}&module_id=eq.${moduleId}`;
      if (courseId) {
        query += `&course_id=eq.${courseId}`;
      }

      const data = await supabaseRest(`${query}&select=*&limit=1`);

      if (data && data.length > 0) {
        progress.value = data[0];
        timeSpent.value = data[0].time_spent_seconds || 0;
      } else {
        progress.value = null;
        timeSpent.value = 0;
      }
    } catch (e) {
      console.error("useReadingProgress: Error loading progress:", e);
      error.value = e.message;
    } finally {
      loading.value = false;
    }
  }

  // Save progress to database
  async function saveProgress(scrollPosition, sectionId = null, forceComplete = false) {
    if (!user.value || !moduleId) return;

    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const totalTimeSpent = timeSpent.value + elapsed;

    // Determine if module is completed (scrolled to 95%+)
    const isCompleted = forceComplete || scrollPosition >= 95;

    try {
      // Use upsert with the Prefer header
      await supabaseRest("reading_progress", {
        method: "POST",
        headers: {
          Prefer: "resolution=merge-duplicates",
        },
        body: JSON.stringify({
          user_id: user.value.id,
          module_id: moduleId,
          course_id: courseId,
          scroll_position: Math.round(scrollPosition * 100) / 100,
          last_section_id: sectionId,
          time_spent_seconds: totalTimeSpent,
          is_completed: isCompleted,
          last_accessed_at: new Date().toISOString(),
        }),
      });

      // Update local state
      timeSpent.value = totalTimeSpent;
      startTime = Date.now(); // Reset timer after save

      // Update progress ref
      progress.value = {
        ...progress.value,
        scroll_position: scrollPosition,
        last_section_id: sectionId,
        time_spent_seconds: totalTimeSpent,
        is_completed: isCompleted,
        last_accessed_at: new Date().toISOString(),
      };
    } catch (e) {
      console.error("useReadingProgress: Error saving progress:", e);
      // Don't throw - we don't want to interrupt reading experience
    }
  }

  // Get current scroll percentage
  function getScrollPercent() {
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (scrollHeight <= 0) return 100;
    return (window.scrollY / scrollHeight) * 100;
  }

  // Start tracking reading progress
  function startTracking() {
    if (isTracking || !moduleId) return;

    isTracking = true;
    startTime = Date.now();

    // Save every 30 seconds while reading
    saveInterval = setInterval(() => {
      const scrollPercent = getScrollPercent();
      saveProgress(scrollPercent);
    }, 30000);
  }

  // Stop tracking and do final save
  async function stopTracking() {
    if (!isTracking) return;

    isTracking = false;

    if (saveInterval) {
      clearInterval(saveInterval);
      saveInterval = null;
    }

    // Final save
    const scrollPercent = getScrollPercent();
    await saveProgress(scrollPercent);
  }

  // Mark module as complete
  async function markComplete() {
    await saveProgress(100, null, true);
  }

  // Initialize on mount
  onMounted(async () => {
    if (moduleId) {
      await loadProgress();
      startTracking();
    }
  });

  // Cleanup on unmount
  onUnmounted(() => {
    stopTracking();
  });

  return {
    progress,
    timeSpent,
    loading,
    error,
    initForModule,
    loadProgress,
    saveProgress,
    startTracking,
    stopTracking,
    markComplete,
  };
}
