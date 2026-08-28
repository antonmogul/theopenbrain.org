import { ref } from "vue";

const status = ref("ready");
const error = ref(null);

export function usePyodide() {
  return {
    status,
    error,
    runPython: async () => {
      status.value = "running";
      error.value = null;
      await Promise.resolve();
      status.value = "ready";
      return { mocked: true };
    },
  };
}
