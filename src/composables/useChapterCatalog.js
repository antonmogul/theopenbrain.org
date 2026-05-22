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
  if (!res.ok) throw new Error(`Supabase REST ${res.status}`);
  return res.json();
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
  fetchPromise = rest(
    "modules?status=eq.published&select=id,title,slug,order_index,cover_image_url,key_takeaways&order=order_index.asc"
  )
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
  const n = Number(number);
  // order_index is 0-based historically; chapter URL number is 1-based.
  // Match either to handle both legacy and current data.
  return (
    modules.value.find((m) => m.order_index === n - 1) ||
    modules.value.find((m) => m.order_index === n) ||
    null
  );
}

function findById(id) {
  return modules.value.find((m) => m.id === id) || null;
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
    nextAfter,
  };
}
