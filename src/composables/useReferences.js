import { ref } from "vue";
import { fetchReferences } from "@/services/api/chapters";

/**
 * Composable to fetch and manage references for the current chapter.
 */
export function useReferences() {
  const references = ref([]);
  const loading = ref(false);

  async function fetchRefs(moduleId) {
    if (!moduleId) return;
    loading.value = true;
    try {
      references.value = await fetchReferences(moduleId);
    } catch (err) {
      console.error("useReferences: Failed to fetch references:", err);
      references.value = [];
    } finally {
      loading.value = false;
    }
  }

  function getReference(number) {
    return references.value.find((r) => r.number === number) || null;
  }

  return { references, loading, fetchRefs, getReference };
}
