import { ref, onMounted, onBeforeUnmount, watch } from "vue";
import { useAuth } from "./useAuth";
import { authedRequest as supabaseRest } from "@/services/api/client";
import { readingPercentForScroll } from "@/helper/readingProgress";

const SAVE_ERROR_MESSAGE =
  "Your reading position could not be saved. Check your connection and try again.";

export function useReadingProgress(
  initialModuleId = null,
  initialCourseId = null
) {
  let moduleId = initialModuleId;
  let courseId = initialCourseId;

  const progress = ref(null);
  const scrollPercent = ref(0);
  const timeSpent = ref(0);
  const loading = ref(false);
  const error = ref(null);
  const saveError = ref(null);
  const identityVersion = ref(0);
  const readyIdentityVersion = ref(null);

  const { user } = useAuth();

  let saveInterval = null;
  let startTime = null;
  let isTracking = false;
  let scrollFrame = null;
  let lastFailedSave = null;
  let identityGeneration = 0;
  let mounted = false;
  let saveInFlight = null;
  let pendingSave = null;

  function advanceIdentity() {
    identityGeneration += 1;
    identityVersion.value = identityGeneration;
    readyIdentityVersion.value = null;
  }

  function currentIdentity() {
    const userId = user.value?.id;
    if (!userId || !moduleId) return null;

    return {
      generation: identityGeneration,
      userId,
      moduleId,
      courseId: courseId ?? null,
    };
  }

  function isCurrentIdentity(identity) {
    const current = currentIdentity();
    return (
      current &&
      identity &&
      current.generation === identity.generation &&
      current.userId === identity.userId &&
      current.moduleId === identity.moduleId &&
      current.courseId === identity.courseId
    );
  }

  function sameIdentity(left, right) {
    return (
      left?.generation === right?.generation &&
      left?.userId === right?.userId &&
      left?.moduleId === right?.moduleId &&
      left?.courseId === right?.courseId
    );
  }

  function resetProgressState() {
    progress.value = null;
    scrollPercent.value = 0;
    timeSpent.value = 0;
    loading.value = false;
    error.value = null;
    saveError.value = null;
    lastFailedSave = null;
    startTime = null;
  }

  function discardPendingSave() {
    if (!pendingSave) return;
    pendingSave.resolvers.forEach((resolve) => resolve(false));
    pendingSave = null;
  }

  function stopTrackingWithoutSave({ preserveStartTime = false } = {}) {
    isTracking = false;
    if (!preserveStartTime) startTime = null;

    if (saveInterval) {
      clearInterval(saveInterval);
      saveInterval = null;
    }

    window.removeEventListener("scroll", onScroll);
    if (scrollFrame !== null) {
      cancelAnimationFrame(scrollFrame);
      scrollFrame = null;
    }
  }

  // Allow setting both identities after a lazy-loaded chapter resolves.
  // Omitting newCourseId retains the current course; passing null explicitly
  // selects the standalone (no-course) progress row.
  async function initForModule(newModuleId, newCourseId = courseId) {
    if (isTracking) await stopTracking();

    advanceIdentity();
    const version = identityGeneration;
    discardPendingSave();
    moduleId = newModuleId;
    courseId = newCourseId ?? null;
    resetProgressState();

    if (moduleId) {
      await loadProgress();
      if (mounted && identityGeneration === version) startTracking();
    } else {
      readyIdentityVersion.value = identityGeneration;
    }
  }

  // Load existing progress for one immutable user/module/course generation.
  async function loadProgress() {
    const identity = currentIdentity();
    if (!identity) {
      resetProgressState();
      readyIdentityVersion.value = identityGeneration;
      return;
    }

    loading.value = true;
    error.value = null;

    try {
      const courseFilter = identity.courseId
        ? `course_id=eq.${identity.courseId}`
        : "course_id=is.null";
      const query =
        `reading_progress?user_id=eq.${identity.userId}` +
        `&module_id=eq.${identity.moduleId}&${courseFilter}`;
      const data = await supabaseRest(`${query}&select=*&limit=1`);

      if (!isCurrentIdentity(identity)) return;

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
      if (!isCurrentIdentity(identity)) return;
      console.error("useReadingProgress: Error loading progress:", e);
      error.value = e.message;
    } finally {
      if (isCurrentIdentity(identity)) {
        loading.value = false;
        readyIdentityVersion.value = identity.generation;
      }
    }
  }

  async function persistSave(request) {
    const {
      identity,
      scrollPosition,
      sectionId,
      forceComplete,
      totalTimeSpent,
      requestedAt,
    } = request;
    if (!isCurrentIdentity(identity)) return false;

    const wasCompleted = progress.value?.is_completed === true;
    const isCompleted = wasCompleted || forceComplete || scrollPosition >= 95;
    const now = new Date().toISOString();

    try {
      await supabaseRest(
        "reading_progress?on_conflict=user_id,module_id,course_id",
        {
          method: "POST",
          headers: {
            Prefer: "resolution=merge-duplicates",
          },
          body: JSON.stringify({
            user_id: identity.userId,
            module_id: identity.moduleId,
            course_id: identity.courseId,
            scroll_position: Math.round(scrollPosition * 100) / 100,
            last_section_id: sectionId,
            time_spent_seconds: totalTimeSpent,
            is_completed: isCompleted,
            completed_at: isCompleted
              ? progress.value?.completed_at || now
              : null,
            last_accessed_at: now,
          }),
        }
      );

      if (!isCurrentIdentity(identity)) return true;

      timeSpent.value = totalTimeSpent;
      // The payload accounts for reading through requestedAt. Anchoring the
      // next interval there avoids dropping time spent while this request was
      // in flight (especially when a final save was queued behind it).
      startTime = isTracking ? requestedAt : null;
      saveError.value = null;
      lastFailedSave = null;
      progress.value = {
        ...progress.value,
        user_id: identity.userId,
        module_id: identity.moduleId,
        course_id: identity.courseId,
        scroll_position: scrollPosition,
        last_section_id: sectionId,
        time_spent_seconds: totalTimeSpent,
        is_completed: isCompleted,
        completed_at: isCompleted ? progress.value?.completed_at || now : null,
        last_accessed_at: now,
      };
      return true;
    } catch (e) {
      if (!isCurrentIdentity(identity)) return false;
      console.error("useReadingProgress: Error saving progress:", e);
      saveError.value = SAVE_ERROR_MESSAGE;
      lastFailedSave = {
        identity,
        scrollPosition,
        sectionId,
        forceComplete,
      };
      return false;
    }
  }

  async function runSave(request) {
    saveInFlight = request;
    const result = await persistSave(request);
    request.resolvers.forEach((resolve) => resolve(result));
    saveInFlight = null;

    const next = pendingSave;
    pendingSave = null;
    if (next) void runSave(next);
  }

  function enqueueSave(request) {
    return new Promise((resolve) => {
      request.resolvers = [resolve];

      if (!saveInFlight) {
        void runSave(request);
        return;
      }

      // Only the newest reading position needs to follow the in-flight save.
      // Completion remains sticky if any coalesced request marked it complete.
      if (pendingSave && sameIdentity(pendingSave.identity, request.identity)) {
        pendingSave.scrollPosition = request.scrollPosition;
        pendingSave.sectionId = request.sectionId;
        pendingSave.forceComplete =
          pendingSave.forceComplete || request.forceComplete;
        pendingSave.requestedAt = request.requestedAt;
        pendingSave.totalTimeSpent = request.totalTimeSpent;
        pendingSave.resolvers.push(resolve);
        return;
      }

      discardPendingSave();
      pendingSave = request;
    });
  }

  // Saves are serialized and interval bursts are coalesced to one latest write.
  function requestForSave(identity, scrollPosition, sectionId, forceComplete) {
    const requestedAt = Date.now();
    const elapsed = startTime
      ? Math.max(0, Math.floor((requestedAt - startTime) / 1000))
      : 0;

    return {
      identity,
      scrollPosition,
      sectionId,
      forceComplete,
      requestedAt,
      totalTimeSpent: timeSpent.value + elapsed,
    };
  }

  function saveProgress(
    scrollPosition,
    sectionId = null,
    forceComplete = false
  ) {
    const identity = currentIdentity();
    if (!identity) return Promise.resolve(false);

    return enqueueSave(
      requestForSave(identity, scrollPosition, sectionId, forceComplete)
    );
  }

  function retrySave() {
    if (!lastFailedSave || !isCurrentIdentity(lastFailedSave.identity)) {
      return Promise.resolve(false);
    }
    return enqueueSave(
      requestForSave(
        lastFailedSave.identity,
        lastFailedSave.scrollPosition,
        lastFailedSave.sectionId,
        lastFailedSave.forceComplete
      )
    );
  }

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

  function startTracking() {
    if (isTracking || !moduleId) return;

    isTracking = true;
    startTime = Date.now();
    updateScrollPercent();
    window.addEventListener("scroll", onScroll, { passive: true });

    saveInterval = setInterval(() => {
      void saveProgress(getScrollPercent());
    }, 30000);
  }

  async function stopTracking() {
    if (!isTracking) return;

    const finalScrollPercent = getScrollPercent();
    stopTrackingWithoutSave({ preserveStartTime: true });
    await saveProgress(finalScrollPercent);
  }

  async function markComplete() {
    await saveProgress(100, null, true);
  }

  watch(
    () => user.value?.id ?? null,
    async (newUserId, oldUserId) => {
      if (newUserId === oldUserId) return;

      // The auth ref has already changed, so never attempt a final save here:
      // that could write the previous reader's position under the new account.
      stopTrackingWithoutSave();
      advanceIdentity();
      const version = identityGeneration;
      discardPendingSave();
      resetProgressState();

      if (mounted && moduleId && newUserId) {
        await loadProgress();
        if (identityGeneration === version) startTracking();
      } else {
        readyIdentityVersion.value = identityGeneration;
      }
    }
  );

  onMounted(async () => {
    mounted = true;
    if (moduleId) {
      const version = identityGeneration;
      await loadProgress();
      if (identityGeneration === version) startTracking();
    }
  });

  // Capture the final geometry before Vue removes the chapter DOM. A route
  // leave guard awaits this save when ChapterView owns the navigation, while
  // this hook remains the fallback for direct component teardown.
  onBeforeUnmount(() => {
    mounted = false;
    void stopTracking();
  });

  return {
    progress,
    scrollPercent,
    timeSpent,
    loading,
    error,
    saveError,
    identityVersion,
    readyIdentityVersion,
    initForModule,
    loadProgress,
    saveProgress,
    retrySave,
    startTracking,
    stopTracking,
    markComplete,
  };
}
