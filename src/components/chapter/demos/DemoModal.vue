<script setup>
import { watch, onUnmounted } from "vue";
import CloseIcon from "@/icons/custom/CloseIcon.vue";

const props = defineProps({
  show: { type: Boolean, default: false },
  title: { type: String, default: "" },
});

const emit = defineEmits(["close"]);

function onBackdropClick(e) {
  if (e.target === e.currentTarget) {
    emit("close");
  }
}

function onKeydown(e) {
  if (e.key === "Escape") {
    emit("close");
  }
}

watch(
  () => props.show,
  (open) => {
    if (open) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", onKeydown);
    } else {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeydown);
    }
  },
  { immediate: true }
);

onUnmounted(() => {
  document.body.style.overflow = "";
  window.removeEventListener("keydown", onKeydown);
});
</script>

<template>
  <Teleport to="body">
    <Transition name="demo-modal">
      <div
        v-if="show"
        class="demo-backdrop"
        @click="onBackdropClick"
      >
        <div class="demo-panel">
          <header class="demo-header">
            <h2 class="demo-title">{{ title }}</h2>
            <button class="demo-close" @click="emit('close')" title="Close">
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
  padding: 2rem;
}

.demo-panel {
  background: white;
  border-radius: 16px;
  width: 100%;
  max-width: 1200px;
  margin: auto;
  height: calc(100vh - 4rem);
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
  border-bottom: 1px solid #e5e7eb;
  flex-shrink: 0;
}

.demo-title {
  font-family: "IBM Plex Sans", sans-serif;
  font-size: 22px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.demo-close {
  width: 40px;
  height: 40px;
  border: none;
  background: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
  border-radius: 6px;
  transition: all 0.15s;
}

.demo-close:hover {
  background: #f3f4f6;
  color: #374151;
}

.demo-body {
  flex: 1;
  overflow-y: auto;
  padding: 32px;
  font-size: 16px;
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
</style>
