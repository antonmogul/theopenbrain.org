import { ref } from "vue";

// Module-scoped refs — shared singleton state across all consumers
const isOpen = ref(false);
const activeTab = ref("notebook"); // "info" | "notebook" | "chat"

export function useReaderSidebar() {
  function open(tab) {
    if (tab) activeTab.value = tab;
    isOpen.value = true;
  }

  function close() {
    isOpen.value = false;
  }

  function toggle(tab) {
    if (isOpen.value && (!tab || tab === activeTab.value)) {
      isOpen.value = false;
    } else {
      if (tab) activeTab.value = tab;
      isOpen.value = true;
    }
  }

  function setTab(tab) {
    activeTab.value = tab;
  }

  return {
    isOpen,
    activeTab,
    open,
    close,
    toggle,
    setTab,
  };
}
