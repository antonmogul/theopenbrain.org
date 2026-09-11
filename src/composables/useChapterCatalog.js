import { ref, computed } from "vue";

// TODO: extract shared supabaseRest helper — currently duplicated across
// ~10 composables. See project memory for the cleanup item.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY;

async function rest(endpoint) {
  const res = await fetch(`${supabaseUrl}/rest/v1/${endpoint}`, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const err = new Error(`Supabase REST ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

/*
 * `select=*` on purpose (OPENBRAIN-30): columns added by later migrations
 * (`ramp`, `key_takeaways`, a future `cover_image_url`) arrive automatically
 * once applied, and PostgREST never answers 400 for a column production does
 * not have yet — a named select would have to probe and retry, and the failed
 * probe logs a console error on every chapter load. The table holds a handful
 * of small rows, so the extra fields cost nothing. Consumers must treat every
 * optional field as possibly absent (the reader falls back to a slug map for
 * the ramp).
 */
function fetchModuleRows() {
  return rest("modules?status=eq.published&select=*&order=order_index.asc");
}

// Module-scope state — one fetch per session, shared across consumers.
const modules = ref([]);
const loading = ref(false);
const loaded = ref(false);
let fetchPromise = null;

async function fetchCatalog() {
  if (loaded.value) return modules.value;
  if (fetchPromise) return fetchPromise;
  loading.value = true;
  // cover_image_url does not exist on modules yet — covers are hard-coded
  // per-slug in EyeStart.vue. When the column is added the views pick it up
  // through select=* (they already fall back to the gradient placeholder).
  fetchPromise = fetchModuleRows()
    .then((rows) => {
      modules.value = rows || [];
      loaded.value = true;
      return modules.value;
    })
    .catch((err) => {
      console.warn("useChapterCatalog: fetch failed", err);
      return [];
    })
    .finally(() => {
      loading.value = false;
      fetchPromise = null;
    });
  return fetchPromise;
}

function findByNumber(number) {
  // modules.order_index is 1-based in this DB (confirmed 2026-05-22).
  // The chapter URL number /chapter/:n is also 1-based, so they match directly.
  const n = Number(number);
  return modules.value.find((m) => m.order_index === n) || null;
}

function findById(id) {
  return modules.value.find((m) => m.id === id) || null;
}

function findBySlug(slug) {
  return modules.value.find((m) => m.slug === slug) || null;
}

function nextAfter(id) {
  const idx = modules.value.findIndex((m) => m.id === id);
  if (idx < 0 || idx === modules.value.length - 1) return null;
  return modules.value[idx + 1];
}

export function useChapterCatalog() {
  return {
    modules: computed(() => modules.value),
    loading: computed(() => loading.value),
    loaded: computed(() => loaded.value),
    fetchCatalog,
    findByNumber,
    findById,
    findBySlug,
    nextAfter,
  };
}
