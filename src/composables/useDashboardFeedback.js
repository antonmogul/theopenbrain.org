import { computed, ref, watch, getCurrentScope, onScopeDispose } from "vue";
import { readDashboardRows } from "@/composables/dashboardReadRows";

/** Read-only creator inbox. RLS is authoritative; the role guard also avoids
 * presenting a student's own-feedback subset as the creator's full inbox.
 * No author identity is requested, and no feedback is sent to an AI service.
 */
export function useDashboardFeedback(canRead, identity = ref(null)) {
  const feedback = ref([]);
  const feedbackChapters = ref([]);
  const feedbackLoading = ref(false);
  const feedbackError = ref(null);
  const feedbackDenied = ref(false);
  const feedbackChapter = ref("all");
  const feedbackKind = ref("all");
  let requestId = 0;

  const feedbackAccessDenied = computed(
    () => !canRead.value || feedbackDenied.value
  );
  const filteredFeedback = computed(() =>
    feedback.value.filter(
      (item) =>
        (feedbackChapter.value === "all" ||
          (feedbackChapter.value === "unassigned"
            ? !item.module_id
            : item.module_id === feedbackChapter.value)) &&
        (feedbackKind.value === "all" || item.kind === feedbackKind.value)
    )
  );

  function clear() {
    feedback.value = [];
    feedbackChapters.value = [];
    feedbackError.value = null;
  }

  watch(
    [canRead, identity],
    () => {
      requestId++;
      clear();
      feedbackLoading.value = false;
      feedbackDenied.value = false;
    },
    { flush: "sync" }
  );

  if (getCurrentScope()) {
    onScopeDispose(() => {
      requestId++;
      clear();
      feedbackLoading.value = false;
    });
  }

  async function fetchFeedback() {
    const current = ++requestId;
    const isCurrent = () => requestId === current && canRead.value;
    clear();
    feedbackDenied.value = false;
    if (!canRead.value) return;
    feedbackLoading.value = true;
    try {
      const end = new Date().toISOString();
      const [items, chapters] = await Promise.all([
        readDashboardRows(
          `feedback?select=id,kind,message,module_id,section_id,page,created_at,module:modules(id,title),section:sections(id,title)&created_at=lte.${end}&order=created_at.desc,id.desc`,
          isCurrent
        ),
        readDashboardRows("modules?select=id,title&order=id.asc", isCurrent),
      ]);
      if (!isCurrent()) return;
      const byId = new Map(chapters.map((chapter) => [chapter.id, chapter]));
      for (const item of items) {
        if (item.module_id && !byId.has(item.module_id)) {
          byId.set(item.module_id, {
            id: item.module_id,
            title: item.module?.title || "Unavailable chapter",
          });
        }
      }
      feedbackChapters.value = [...byId.values()].sort((a, b) =>
        a.title.localeCompare(b.title)
      );
      feedback.value = items.map((item) => ({
        ...item,
        chapterTitle: item.module_id
          ? byId.get(item.module_id)?.title
          : "No chapter assigned",
        sectionTitle:
          item.section?.title ||
          (item.section_id ? "Unavailable section" : null),
      }));
    } catch (error) {
      if (!isCurrent()) return;
      clear();
      if (error.status === 401 || error.status === 403)
        feedbackDenied.value = true;
      else
        feedbackError.value = "Feedback could not be loaded. Please try again.";
    } finally {
      if (requestId === current) feedbackLoading.value = false;
    }
  }

  return {
    feedback,
    feedbackChapters,
    feedbackLoading,
    feedbackError,
    feedbackAccessDenied,
    feedbackChapter,
    feedbackKind,
    filteredFeedback,
    fetchFeedback,
  };
}
