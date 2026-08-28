import { ref, onMounted, onUnmounted } from "vue";
import { useAuth } from "./useAuth";
import { authedRequest as supabaseRest } from "@/services/api/client";
import { readingPercentForScroll } from "@/helper/readingProgress";

export function useReadingProgress(initialModuleId = null, courseId = null) {
  let moduleId = initialModuleId;

  const progress = ref(null);
  const scrollPercent = ref(0);
  const timeSpent = ref(0);
  const loading = ref(false);
  const error = ref(null);
  const saveError = ref(null);

  const { user } = useAuth();

  let saveInterval = null;
  let startTime = null;
  let isTracking = false;
  let scrollFrame = null;
  let lastSaveArgs = null;

  // Allow setting moduleId after initialization (for lazy-loaded chapters)
  async function initForModule(newModuleId) {
    if (isTracking) await stopTracking();
    moduleId = newModuleId;
    if (moduleId) {
      await loadProgress();
      startTracking();
    }
  }

  // Load existing progress
  async function loadProgress() {
    if (!moduleId) return;
    if (!user.value) {
      progress.value = null;
      scrollPercent.value = 0;
      timeSpent.value = 0;
      return;
    }

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
        scrollPercent.value = data[0].scroll_position || 0;
        timeSpent.value = data[0].time_spent_seconds || 0;
      } else {
        progress.value = null;
        scrollPercent.value = 0;
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
  async function saveProgress(
    scrollPosition,
    sectionId = null,
    forceComplete = false
  ) {
    if (!user.value || !moduleId) return false;

    lastSaveArgs = { scrollPosition, sectionId, forceComplete };

    const elapsed = startTime
      ? Math.max(0, Math.floor((Date.now() - startTime) / 1000))
      : 0;
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
      startTime = isTracking ? Date.now() : null;
      saveError.value = null;

      // Update progress ref
      progress.value = {
        ...progress.value,
        scroll_position: scrollPosition,
        last_section_id: sectionId,
        time_spent_seconds: totalTimeSpent,
        is_completed: isCompleted,
        last_accessed_at: new Date().toISOString(),
      };
      return true;
    } catch (e) {
      console.error("useReadingProgress: Error saving progress:", e);
      saveError.value =
        "Your reading position could not be saved. Check your connection and try again.";
      return false;
    }
  }

  function retrySave() {
    if (!lastSaveArgs) return Promise.resolve(false);
    return saveProgress(
      lastSaveArgs.scrollPosition,
      lastSaveArgs.sectionId,
      lastSaveArgs.forceComplete
    );
  }

  // Get current scroll percentage
  function getScrollPercent() {
    return readingPercentForScroll(
      window.scrollY,
      document.documentElement.scrollHeight,
      window.innerHeight
    );
  }

  function updateScrollPercent() {
    scrollFrame = null;
    scrollPercent.value = getScrollPercent();
  }

  function onScroll() {
    if (scrollFrame !== null) return;
    scrollFrame = requestAnimationFrame(updateScrollPercent);
  }

  // Start tracking reading progress
  function startTracking() {
    if (isTracking || !moduleId) return;

    isTracking = true;
    startTime = Date.now();
    updateScrollPercent();
    window.addEventListener("scroll", onScroll, { passive: true });

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

    window.removeEventListener("scroll", onScroll);
    if (scrollFrame !== null) {
      cancelAnimationFrame(scrollFrame);
      scrollFrame = null;
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
    scrollPercent,
    timeSpent,
    loading,
    error,
    saveError,
    initForModule,
    loadProgress,
    saveProgress,
    retrySave,
    startTracking,
    stopTracking,
    markComplete,
  };
}
