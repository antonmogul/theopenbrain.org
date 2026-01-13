<script setup>
import { ref } from "vue";
import { HIGHLIGHT_COLORS } from "@/composables/useHighlights";

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  position: {
    type: Object,
    default: () => ({ x: 0, y: 0 }),
  },
  selection: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(["highlight", "cancel"]);

const isPublic = ref(false);

function onHighlight(color) {
  emit("highlight", {
    color,
    isPublic: isPublic.value,
    withNote: false,
  });
}

function onHighlightWithNote() {
  emit("highlight", {
    color: "yellow",
    isPublic: isPublic.value,
    withNote: true,
  });
}

function togglePublic() {
  isPublic.value = !isPublic.value;
}

function onCancel() {
  emit("cancel");
}
</script>

<template>
  <Teleport to="body">
    <Transition name="toolbar">
      <div
        v-if="visible"
        data-highlight-toolbar
        data-testid="highlight-toolbar"
        class="highlight-toolbar"
        :style="{
          top: position.y + 'px',
          left: position.x + 'px',
        }"
      >
        <!-- Color options -->
        <button
          v-for="color in HIGHLIGHT_COLORS"
          :key="color.value"
          @click="onHighlight(color.value)"
          class="color-btn"
          :class="color.bgClass"
          :title="color.name"
          :data-testid="`highlight-${color.value}`"
        ></button>

        <div class="divider"></div>

        <!-- Add note button -->
        <button
          @click="onHighlightWithNote"
          class="action-btn"
          title="Add note"
          data-testid="highlight-with-note"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path
              d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5"
            ></path>
            <path
              d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
            ></path>
          </svg>
        </button>

        <!-- Share with class toggle -->
        <button
          @click="togglePublic"
          class="action-btn"
          :class="{ active: isPublic }"
          title="Share with class"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
        </button>

        <!-- Cancel button -->
        <button @click="onCancel" class="action-btn cancel" title="Cancel">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.highlight-toolbar {
  position: absolute;
  z-index: 9999;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05);
  padding: 8px 10px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.color-btn {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  cursor: pointer;
  transition: transform 0.15s ease;
}

.color-btn:hover {
  transform: scale(1.15);
}

.color-btn.bg-yellow-300 {
  background-color: #fcd34d;
}
.color-btn.bg-green-300 {
  background-color: #86efac;
}
.color-btn.bg-blue-300 {
  background-color: #93c5fd;
}
.color-btn.bg-pink-300 {
  background-color: #f9a8d4;
}
.color-btn.bg-purple-300 {
  background-color: #c4b5fd;
}

.divider {
  width: 1px;
  height: 24px;
  background: #e5e7eb;
  margin: 0 4px;
}

.action-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  transition: all 0.15s ease;
}

.action-btn:hover {
  background: #f3f4f6;
  color: #374151;
}

.action-btn.active {
  background: #eff6ff;
  color: #3b82f6;
}

.action-btn.cancel {
  color: #9ca3af;
}

.action-btn.cancel:hover {
  background: #fef2f2;
  color: #ef4444;
}

/* Transition animations */
.toolbar-enter-active,
.toolbar-leave-active {
  transition: all 0.15s ease;
}

.toolbar-enter-from,
.toolbar-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
