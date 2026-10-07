/*
 * useMyChapters — the chapters a reader has opened (OPENBRAIN-101).
 *
 * Stuart, 24 Sep: "In Dashboard, instead of 'my courses', it should be 'my
 * chapters', and get populated from any chapter they've interacted with."
 * Opening a chapter writes a reading_progress row (useReadingProgress), so
 * those rows, joined to the catalog, are the reader's chapters, most recent
 * first. Course enrolment is not needed.
 */
import { computed, ref } from "vue";
import { useAuth } from "@/composables/useAuth";
import { useChapterCatalog } from "@/composables/useChapterCatalog";
import { authedRequest } from "@/services/api/client";

/**
 * The reader's chapters from catalog modules and reading_progress rows.
 * A chapter read in two courses has two rows; the most recent one counts.
 * @returns {Array<{module, percent, status, lastAccessedAt, timeSpentSeconds, route}>}
 *   status: "done" | "reading" | "opened"
 */
export function myChaptersFrom(modules, rows) {
  const byModule = new Map();
  for (const row of rows || []) {
    const prev = byModule.get(row.module_id);
    if (!prev || (row.last_accessed_at || "") > (prev.last_accessed_at || ""))
      byModule.set(row.module_id, row);
  }
  const out = [];
  for (const mod of modules || []) {
    const row = byModule.get(mod.id);
    if (!row) continue;
    const percent = row.is_completed
      ? 100
      : Math.max(0, Math.min(100, Math.round(row.scroll_position || 0)));
    out.push({
      module: mod,
      percent,
      status: row.is_completed ? "done" : percent > 0 ? "reading" : "opened",
      lastAccessedAt: row.last_accessed_at || null,
      timeSpentSeconds: row.time_spent_seconds || 0,
      route: `/chapter/${mod.order_index}/${mod.slug}`,
    });
  }
  return out.sort((a, b) =>
    (b.lastAccessedAt || "").localeCompare(a.lastAccessedAt || "")
  );
}

export function useMyChapters() {
  const { user } = useAuth();
  const { modules, fetchCatalog } = useChapterCatalog();
  const rows = ref([]);
  const loading = ref(false);
  const error = ref(null);

  async function fetchMyChapters() {
    if (!user.value) {
      rows.value = [];
      return;
    }
    loading.value = true;
    error.value = null;
    try {
      const [, progress] = await Promise.all([
        fetchCatalog(),
        authedRequest(
          `reading_progress?user_id=eq.${user.value.id}&select=module_id,scroll_position,is_completed,last_accessed_at,time_spent_seconds`
        ),
      ]);
      rows.value = Array.isArray(progress) ? progress : [];
    } catch (e) {
      console.warn("[useMyChapters] could not load reading progress", e);
      error.value = e;
    } finally {
      loading.value = false;
    }
  }

  const chapters = computed(() => myChaptersFrom(modules.value, rows.value));
  /** ProgressCard's shape: the most recent chapter not finished yet. */
  const continueReading = computed(() => {
    const next = chapters.value.find((c) => c.status !== "done");
    return next
      ? {
          module: next.module,
          lastAccessedAt: next.lastAccessedAt,
          scrollPosition: next.percent,
        }
      : null;
  });

  return { chapters, continueReading, loading, error, fetchMyChapters };
}
