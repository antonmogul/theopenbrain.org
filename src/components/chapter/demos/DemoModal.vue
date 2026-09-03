<script setup>
import { ref, watch, onBeforeUnmount, nextTick } from "vue";
import CloseIcon from "@/icons/custom/CloseIcon.vue";

const props = defineProps({
  show: { type: Boolean, default: false },
  title: { type: String, default: "" },
  /* Full-viewport panel for content that brings its own page layout, such as
     an embedded widget view (see WidgetBreakout). */
  wide: { type: Boolean, default: false },
});

const emit = defineEmits(["close"]);
const panelRef = ref(null);
const closeButtonRef = ref(null);
let triggerElement = null;
let previousBodyOverflow = "";

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function onBackdropClick(e) {
  if (e.target === e.currentTarget) {
    emit("close");
  }
}

function onKeydown(e) {
  if (e.key === "Escape") {
    emit("close");
    return;
  }

  if (e.key !== "Tab" || !panelRef.value) return;
  const focusable = Array.from(
    panelRef.value.querySelectorAll(focusableSelector)
  ).filter((element) => !element.hasAttribute("hidden"));
  if (!focusable.length) {
    e.preventDefault();
    panelRef.value.focus();
    return;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

watch(
  () => props.show,
  async (open) => {
    if (open) {
      triggerElement = document.activeElement;
      previousBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", onKeydown);
      await nextTick();
      closeButtonRef.value?.focus();
    } else {
      document.body.style.overflow = previousBodyOverflow;
      window.removeEventListener("keydown", onKeydown);
      await nextTick();
      if (triggerElement?.isConnected) triggerElement.focus();
      triggerElement = null;
    }
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  document.body.style.overflow = previousBodyOverflow;
  window.removeEventListener("keydown", onKeydown);
  if (triggerElement?.isConnected) triggerElement.focus();
  triggerElement = null;
});
</script>

<template>
  <Teleport to="body">
    <Transition name="demo-modal">
      <div v-if="show" class="demo-backdrop" @click="onBackdropClick">
        <div
          ref="panelRef"
          class="demo-panel"
          :class="{ 'demo-panel--wide': wide }"
          role="dialog"
          aria-modal="true"
          aria-labelledby="demo-modal-title"
          tabindex="-1"
        >
          <header class="demo-header">
            <h2 id="demo-modal-title" class="demo-title">{{ title }}</h2>
            <button
              ref="closeButtonRef"
              type="button"
              class="demo-close"
              aria-label="Close demo"
              @click="emit('close')"
            >
              <CloseIcon :width="20" :height="20" />
            </button>
          </header>
          <div class="demo-body">
            <slot />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.demo-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1100;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: stretch;
  justify-content: center;
  padding: 1.25rem;
}

.demo-panel {
  background: rgb(var(--color-paper));
  border-radius: 16px;
  width: 100%;
  max-width: 1200px;
  margin: auto;
  height: calc(100vh - 2.5rem);
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  font-size: 16px;
}

.demo-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 28px;
  border-bottom: 1px solid rgb(var(--color-line));
  flex-shrink: 0;
}

.demo-title {
  font-family: var(--font-ui);
  font-size: 22px;
  font-weight: 600;
  color: rgb(var(--color-ink));
  margin: 0;
}

.demo-close {
  width: 44px;
  height: 44px;
  border: none;
  background: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgb(var(--color-mute));
  border-radius: 6px;
  transition: all 0.15s;
}

.demo-close:hover {
  background: rgb(var(--color-ink) / 0.05);
  color: rgb(var(--color-ink));
}

.demo-close:focus-visible {
  outline: 3px solid rgb(var(--color-accent));
  outline-offset: 2px;
}

.demo-body {
  flex: 1;
  overflow-y: auto;
  padding: 32px;
  font-size: 16px;
}

/* Wide: let the slot content own the width; widget views carry their own
   max-width and padding. */
.demo-panel--wide {
  max-width: none;
}

.demo-panel--wide .demo-body {
  padding: 0;
  background: rgb(var(--color-bg));
}

/* Transition */
.demo-modal-enter-active,
.demo-modal-leave-active {
  transition: opacity 0.2s ease;
}

.demo-modal-enter-active .demo-panel,
.demo-modal-leave-active .demo-panel {
  transition: transform 0.2s ease;
}

.demo-modal-enter-from,
.demo-modal-leave-to {
  opacity: 0;
}

.demo-modal-enter-from .demo-panel {
  transform: scale(0.95) translateY(10px);
}

.demo-modal-leave-to .demo-panel {
  transform: scale(0.95) translateY(10px);
}

@media (max-width: 767px) {
  .demo-backdrop {
    padding: 0;
  }

  .demo-panel {
    height: 100dvh;
    max-width: none;
    border-radius: 0;
  }

  .demo-header {
    padding: 0.75rem 1rem;
  }

  .demo-body {
    padding: 1rem;
  }
}
</style>
