<script setup>
import { ref, watch, computed } from "vue";

const props = defineProps({
  modelValue: {
    type: String,
    default: "",
  },
  language: {
    type: String,
    default: "python",
  },
  readonly: {
    type: Boolean,
    default: false,
  },
  minHeight: {
    type: String,
    default: "300px",
  },
});

const emit = defineEmits(["update:modelValue"]);

const editorRef = ref(null);
const lineNumbers = ref([1]);

// Update line numbers when code changes
watch(
  () => props.modelValue,
  (newValue) => {
    const lines = (newValue || "").split("\n").length;
    lineNumbers.value = Array.from({ length: lines }, (_, i) => i + 1);
  },
  { immediate: true }
);

// Handle input and emit update
function handleInput(event) {
  emit("update:modelValue", event.target.value);
}

// Handle Tab key to insert spaces instead of changing focus
function handleKeydown(event) {
  if (event.key === "Tab") {
    event.preventDefault();
    const textarea = event.target;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const spaces = "    "; // 4 spaces

    // Insert spaces at cursor position
    const newValue =
      props.modelValue.substring(0, start) +
      spaces +
      props.modelValue.substring(end);

    emit("update:modelValue", newValue);

    // Restore cursor position after the inserted spaces
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = start + spaces.length;
    }, 0);
  }
}

// Sync scroll between line numbers and textarea
function handleScroll(event) {
  const lineNumbersEl = event.target.previousElementSibling;
  if (lineNumbersEl) {
    lineNumbersEl.scrollTop = event.target.scrollTop;
  }
}

const languageLabel = computed(() => {
  const labels = {
    python: "Python",
    javascript: "JavaScript",
    typescript: "TypeScript",
  };
  return labels[props.language] || props.language;
});
</script>

<template>
  <div class="code-editor rounded-lg border border-gray-700 overflow-hidden" data-testid="code-editor">
    <!-- Header bar with traffic lights -->
    <div class="editor-header bg-gray-800 px-4 py-2 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <!-- Traffic light dots -->
        <div class="flex gap-1.5">
          <div class="w-3 h-3 rounded-full bg-red-500"></div>
          <div class="w-3 h-3 rounded-full bg-yellow-500"></div>
          <div class="w-3 h-3 rounded-full bg-green-500"></div>
        </div>
      </div>
      <span class="text-xs text-gray-400 font-mono">{{ languageLabel }}</span>
    </div>

    <!-- Editor container -->
    <div class="editor-container flex" :style="{ minHeight }">
      <!-- Line numbers column -->
      <div
        class="line-numbers bg-gray-900 text-gray-500 px-3 py-4 text-right font-mono text-sm select-none overflow-hidden"
      >
        <div v-for="num in lineNumbers" :key="num" class="leading-6">
          {{ num }}
        </div>
      </div>

      <!-- Code textarea -->
      <textarea
        ref="editorRef"
        :value="modelValue"
        :readonly="readonly"
        class="code-input flex-1 bg-gray-900 text-gray-100 p-4 font-mono text-sm resize-none outline-none leading-6"
        :class="{ 'cursor-not-allowed opacity-75': readonly }"
        spellcheck="false"
        autocomplete="off"
        autocorrect="off"
        autocapitalize="off"
        data-testid="code-input"
        @input="handleInput"
        @keydown="handleKeydown"
        @scroll="handleScroll"
      ></textarea>
    </div>
  </div>
</template>

<style scoped>
.code-editor {
  font-family: "IBM Plex Mono", "Fira Code", "Monaco", monospace;
}

.editor-container {
  max-height: 500px;
}

.line-numbers {
  min-width: 3rem;
  border-right: 1px solid #374151;
}

.code-input {
  tab-size: 4;
  white-space: pre;
  overflow-wrap: normal;
  overflow-x: auto;
}

.code-input:focus {
  outline: none;
  box-shadow: inset 0 0 0 2px rgba(139, 92, 246, 0.3);
}
</style>
