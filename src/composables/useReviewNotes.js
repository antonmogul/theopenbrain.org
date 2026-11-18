import { computed, getCurrentScope, onScopeDispose, ref, watch } from "vue";
import { authedRequest } from "@/services/api/client";
import { readDashboardRows } from "@/composables/dashboardReadRows";
import {
  groupReviewNotes,
  matchesReviewFilters,
} from "@/helper/reviewNotes.mjs";

/** The columns the dashboard reads (ip_hash is not granted to anyone). */
export const REVIEW_NOTE_COLUMNS =
  "id,created_at,updated_at,chapter_slug,section_slug,paragraph_id,type,note,quote,suggested_text,anchor,reviewer_name,reviewer_role,user_id,url,viewport,user_agent,status,reply,replied_at,parent_id";

const isMissingTable = (err) =>
  err?.status === 404 || /PGRST20[25]/.test(String(err?.response || ""));

/**
 * Reviewer notes for the creator dashboard (OPENBRAIN-203): every
 * `review_feedback` row, filtered by chapter, type and status, grouped
 * chapter → section, with one PATCH per save of a note's status and reply.
 * RLS is authoritative (creators only); `canRead` keeps a non-creator from
 * seeing an empty list as if it were the inbox.
 */
export function useReviewNotes(canRead, identity = ref(null)) {
  const notes = ref([]);
  const modules = ref([]);
  const sections = ref([]);
  const loading = ref(false);
  const loaded = ref(false);
  const error = ref(null);
  const denied = ref(false);
  const missingTable = ref(false);
  const filters = ref({ chapter: "all", type: "all", status: "open" });
  const savingIds = ref([]);
  const saveErrors = ref({});
  let requestId = 0;

  const accessDenied = computed(() => !canRead.value || denied.value);
  // Filters pick notes; a reply (parent_id) follows its note.
  const topLevel = computed(() => notes.value.filter((n) => !n.parent_id));
  const filtered = computed(() =>
    topLevel.value.filter((note) => matchesReviewFilters(note, filters.value))
  );
  const shown = computed(() => {
    const ids = new Set(filtered.value.map((n) => n.id));
    return [
      ...filtered.value,
      ...notes.value.filter((n) => n.parent_id && ids.has(n.parent_id)),
    ];
  });
  const groups = computed(() =>
    groupReviewNotes(shown.value, modules.value, sections.value)
  );
  const chapters = computed(() => {
    const seen = new Map();
    for (const note of notes.value) {
      if (seen.has(note.chapter_slug)) continue;
      const module = modules.value.find((m) => m.slug === note.chapter_slug);
      seen.set(note.chapter_slug, {
        slug: note.chapter_slug,
        title: module?.title || note.chapter_slug,
        order: module?.order_index ?? Infinity,
      });
    }
    return [...seen.values()].sort((a, b) => a.order - b.order);
  });
  const openCount = computed(
    () =>
      topLevel.value.filter((note) =>
        matchesReviewFilters(note, { status: "open" })
      ).length
  );

  function clear() {
    notes.value = [];
    modules.value = [];
    sections.value = [];
    error.value = null;
    missingTable.value = false;
    loaded.value = false;
    saveErrors.value = {};
  }

  watch(
    [canRead, identity],
    () => {
      requestId++;
      clear();
      loading.value = false;
      denied.value = false;
    },
    { flush: "sync" }
  );
  if (getCurrentScope()) {
    onScopeDispose(() => {
      requestId++;
      clear();
    });
  }

  async function fetchReviewNotes() {
    const current = ++requestId;
    const isCurrent = () => requestId === current && canRead.value;
    clear();
    denied.value = false;
    if (!canRead.value) return;
    loading.value = true;
    try {
      const end = new Date().toISOString();
      const [rows, moduleRows, sectionRows] = await Promise.all([
        readDashboardRows(
          `review_feedback?select=${REVIEW_NOTE_COLUMNS}&created_at=lte.${end}&order=created_at.desc,id.desc`,
          isCurrent
        ),
        readDashboardRows(
          "modules?select=id,slug,title,order_index&order=id.asc",
          isCurrent
        ),
        readDashboardRows(
          "sections?select=id,module_id,slug,title,order_index&order=id.asc",
          isCurrent
        ),
      ]);
      if (!isCurrent()) return;
      notes.value = rows;
      modules.value = moduleRows;
      sections.value = sectionRows;
      loaded.value = true;
    } catch (err) {
      if (!isCurrent()) return;
      clear();
      if (err.status === 401 || err.status === 403) denied.value = true;
      else if (isMissingTable(err)) {
        missingTable.value = true;
        error.value =
          "Review notes need a database update: run `supabase db push` for 20261118130000_review_feedback.sql.";
      } else
        error.value = "Review notes could not be loaded. Please try again.";
    } finally {
      if (requestId === current) loading.value = false;
    }
  }

  /** Save a note's status and reply: one PATCH, the row comes back. */
  async function saveReviewNote({ id, status, reply }) {
    if (!canRead.value || savingIds.value.includes(id)) return false;
    const current = requestId;
    savingIds.value = [...savingIds.value, id];
    const others = { ...saveErrors.value };
    delete others[id];
    saveErrors.value = others;
    try {
      const body = { status, reply: reply?.trim() ? reply.trim() : null };
      const rows = await authedRequest(
        `review_feedback?id=eq.${encodeURIComponent(id)}&select=${REVIEW_NOTE_COLUMNS}`,
        {
          method: "PATCH",
          body: JSON.stringify(body),
          headers: { Prefer: "return=representation" },
        }
      );
      if (current !== requestId) return false;
      if (!Array.isArray(rows) || rows.length === 0)
        throw new Error("The note wasn't saved: no access, or it was deleted.");
      notes.value = notes.value.map((note) =>
        note.id === id ? { ...note, ...rows[0] } : note
      );
      return true;
    } catch (err) {
      if (current !== requestId) return false;
      saveErrors.value = {
        ...saveErrors.value,
        [id]:
          err.status === 401 || err.status === 403
            ? "You don't have permission to change this note."
            : err.message?.startsWith("The note")
              ? err.message
              : "The note couldn't be saved. Please try again.",
      };
      return false;
    } finally {
      savingIds.value = savingIds.value.filter((value) => value !== id);
    }
  }

  return {
    reviewNotes: notes,
    reviewModules: modules,
    reviewLoading: loading,
    reviewLoaded: loaded,
    reviewError: error,
    reviewMissingTable: missingTable,
    reviewAccessDenied: accessDenied,
    reviewFilters: filters,
    reviewChapters: chapters,
    reviewGroups: groups,
    reviewFilteredCount: computed(() => filtered.value.length),
    reviewOpenCount: openCount,
    reviewSavingIds: savingIds,
    reviewSaveErrors: saveErrors,
    fetchReviewNotes,
    saveReviewNote,
  };
}
