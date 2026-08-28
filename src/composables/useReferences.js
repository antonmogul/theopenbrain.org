import { ref } from "vue";
import { fetchReferences } from "@/services/api/chapters";

/**
 * Composable to fetch and manage references for the current chapter.
 */
export function useReferences() {
  const references = ref([]);
  const loading = ref(false);
  let fetchGeneration = 0;

  async function fetchRefs(moduleId) {
    const generation = ++fetchGeneration;
    references.value = [];
    if (!moduleId) {
      loading.value = false;
      return;
    }
    loading.value = true;
    try {
      const nextReferences = await fetchReferences(moduleId);
      if (generation === fetchGeneration) references.value = nextReferences;
    } catch (err) {
      if (generation !== fetchGeneration) return;
      console.error("useReferences: Failed to fetch references:", err);
      references.value = [];
    } finally {
      if (generation === fetchGeneration) loading.value = false;
    }
  }

  function getReference(number) {
    return references.value.find((r) => r.number === number) || null;
  }

  return { references, loading, fetchRefs, getReference };
}
