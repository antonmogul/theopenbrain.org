/*
 * useUploadedWidgets — the authors' uploaded widgets (OPENBRAIN-105), in
 * the `widget_uploads` table. Creators list, save, publish and delete them
 * (Widgets → Upload in the creator dashboard); the reader loads one by slug
 * for a widget block whose widgetId is "upload:<slug>".
 */
import { ref } from "vue";
import { apiRequest, authedRequest } from "@/services/api/client";

export const UPLOAD_PREFIX = "upload:";

/** "upload:on-centre-field" → "on-centre-field", else null. */
export function uploadSlug(widgetId) {
  return typeof widgetId === "string" && widgetId.startsWith(UPLOAD_PREFIX)
    ? widgetId.slice(UPLOAD_PREFIX.length) || null
    : null;
}

const LIST_FIELDS =
  "id,slug,title,description,author,ramp,status,checks,created_at,updated_at";

// One cache per page: the reader may show a widget more than once.
const bySlug = new Map();

/** One widget, with its HTML, by slug (published, or any for creators). */
export async function fetchUploadedWidget(slug) {
  if (!slug) return null;
  if (bySlug.has(slug)) return bySlug.get(slug);
  const p = apiRequest(
    `widget_uploads?slug=eq.${encodeURIComponent(slug)}&select=${LIST_FIELDS},html&limit=1`
  )
    .then((rows) => rows?.[0] || null)
    .catch((err) => {
      bySlug.delete(slug);
      throw err;
    });
  bySlug.set(slug, p);
  return p;
}

export function useUploadedWidgets() {
  const widgets = ref([]);
  const loading = ref(false);
  const error = ref("");

  async function fetchWidgets() {
    loading.value = true;
    error.value = "";
    try {
      widgets.value =
        (await authedRequest(
          `widget_uploads?select=${LIST_FIELDS}&order=updated_at.desc`
        )) || [];
    } catch (err) {
      console.error("[useUploadedWidgets] list failed", err);
      error.value = "Uploaded widgets didn't load. Try again.";
    } finally {
      loading.value = false;
    }
  }

  /** Save a widget: a new slug inserts; an existing one is replaced. */
  async function saveWidget(row) {
    const body = {
      slug: row.slug,
      title: row.title,
      description: row.description || null,
      author: row.author || null,
      ramp: row.ramp || null,
      html: row.html,
      checks: row.checks || [],
      status: row.status || "draft",
      updated_at: new Date().toISOString(),
    };
    const saved = await authedRequest("widget_uploads?on_conflict=slug", {
      method: "POST",
      body: JSON.stringify(body),
      headers: {
        Prefer: "resolution=merge-duplicates,return=representation",
      },
    });
    bySlug.delete(row.slug);
    await fetchWidgets();
    return Array.isArray(saved) ? saved[0] : saved;
  }

  async function setStatus(slug, status) {
    await authedRequest(`widget_uploads?slug=eq.${encodeURIComponent(slug)}`, {
      method: "PATCH",
      body: JSON.stringify({ status, updated_at: new Date().toISOString() }),
      headers: { Prefer: "return=minimal" },
    });
    bySlug.delete(slug);
    await fetchWidgets();
  }

  async function deleteWidget(slug) {
    await authedRequest(`widget_uploads?slug=eq.${encodeURIComponent(slug)}`, {
      method: "DELETE",
    });
    bySlug.delete(slug);
    await fetchWidgets();
  }

  return {
    widgets,
    loading,
    error,
    fetchWidgets,
    saveWidget,
    setStatus,
    deleteWidget,
  };
}
