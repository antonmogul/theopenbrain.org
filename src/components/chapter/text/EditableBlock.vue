<script setup>
import { ref, watch, computed, onBeforeUnmount, nextTick, inject } from "vue";
import { useEditor, EditorContent } from "@tiptap/vue-3";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import CloseIcon from "@/icons/custom/CloseIcon.vue";
import ParagraphEditor from "@/components/chapterEditor/ParagraphEditor.vue";

const props = defineProps({
  content: {
    type: String,
    default: "",
  },
  paragraphId: {
    type: String,
    required: true,
  },
  isCreator: {
    type: Boolean,
    default: false,
  },
  tag: {
    type: String,
    default: "p", // p, h1, h2, h3, span
  },
  className: {
    type: String,
    default: "",
  },
  // Bound by `@save`: declared as a prop so the block can await the parent's
  // save and keep the editor open with the error if it fails (OPENBRAIN-58).
  onSave: {
    type: Function,
    default: null,
  },
  // Body paragraphs drive the figure pane, so they offer "Figure…"
  // (OPENBRAIN-65). Intro paragraphs and titles don't.
  canFigure: {
    type: Boolean,
    default: false,
  },
});

defineEmits(["cancel"]);

const isEditing = ref(false);
const isSaving = ref(false);
const hasChanges = ref(false);
const originalContent = ref(props.content);
const saveError = ref("");

// Paragraph rows carry their stored blocks (TextComp's map). With blocks,
// Edit mode opens the chapter editor's lossless ParagraphEditor, so
// citations, figure refs, images and widgets survive a save (OPENBRAIN-64).
// Section titles have no blocks and keep the simple inline editor below.
const blocksFor = inject("blocksFor", () => null);
const storedBlocks = computed(() => blocksFor(props.paragraphId));
const blocksMode = computed(() => Array.isArray(storedBlocks.value));
const changeFigure = inject("changeFigure", null);
const showFigureButton = computed(
  () => props.canFigure && blocksMode.value && !!changeFigure
);

async function saveBlocks(blocks) {
  isSaving.value = true;
  saveError.value = "";
  try {
    await props.onSave?.({ paragraphId: props.paragraphId, blocks });
    isEditing.value = false;
  } catch (error) {
    console.error("Failed to save:", error);
    saveError.value = error?.message || "Couldn't save. Try again.";
  } finally {
    isSaving.value = false;
  }
}

// Create editor instance
const editor = useEditor({
  content: props.content,
  editable: false,
  extensions: [
    StarterKit.configure({
      heading: {
        levels: [1, 2, 3],
      },
    }),
    Link.configure({
      openOnClick: false,
      HTMLAttributes: {
        class: "text-violet-600 underline",
      },
    }),
    Placeholder.configure({
      placeholder: "Start writing...",
    }),
  ],
  onUpdate: ({ editor }) => {
    hasChanges.value = editor.getHTML() !== originalContent.value;
  },
});

// Watch for external content changes
watch(
  () => props.content,
  (newValue) => {
    originalContent.value = newValue;
    if (editor.value && !isEditing.value) {
      editor.value.commands.setContent(newValue, false);
    }
  }
);

// Enter edit mode
const startEditing = () => {
  if (!props.isCreator || isEditing.value) return;
  saveError.value = "";
  if (blocksMode.value) {
    isEditing.value = true;
    return;
  }

  isEditing.value = true;
  originalContent.value = props.content;

  nextTick(() => {
    if (editor.value) {
      editor.value.setEditable(true);
      editor.value.commands.focus("end");
    }
  });
};

// Save changes
const saveChanges = async () => {
  if (!editor.value || !hasChanges.value) {
    cancelEditing();
    return;
  }

  isSaving.value = true;
  saveError.value = "";
  const newContent = editor.value.getHTML();

  try {
    await props.onSave?.({
      paragraphId: props.paragraphId,
      content: newContent,
    });

    originalContent.value = newContent;
    hasChanges.value = false;
    isEditing.value = false;
    editor.value.setEditable(false);
  } catch (error) {
    // Keep the editor open with the text intact so nothing typed is lost.
    console.error("Failed to save:", error);
    saveError.value = error?.message || "Couldn't save. Try again.";
  } finally {
    isSaving.value = false;
  }
};

// Cancel editing
const cancelEditing = () => {
  if (editor.value) {
    editor.value.commands.setContent(originalContent.value, false);
    editor.value.setEditable(false);
  }
  isEditing.value = false;
  hasChanges.value = false;
};

// Clicking away never saves (it used to auto-save to the live chapter):
// with no changes the editor just closes; with changes it stays open until
// Save (✓ / Cmd+S) or Cancel (Esc).
const handleBlur = (event) => {
  if (event.relatedTarget?.closest(".editable-toolbar")) return;
  setTimeout(() => {
    if (isEditing.value && !hasChanges.value && !isSaving.value) {
      cancelEditing();
    }
  }, 150);
};

// Handle keyboard shortcuts
const handleKeydown = (event) => {
  if (!isEditing.value) return;

  // Cmd/Ctrl + S to save
  if ((event.metaKey || event.ctrlKey) && event.key === "s") {
    event.preventDefault();
    saveChanges();
  }

  // Escape to cancel
  if (event.key === "Escape") {
    event.preventDefault();
    cancelEditing();
  }
};

// Toolbar actions
const toggleBold = () => editor.value?.chain().focus().toggleBold().run();
const toggleItalic = () => editor.value?.chain().focus().toggleItalic().run();
const toggleLink = () => {
  const url = window.prompt("Enter URL:");
  if (url) {
    editor.value
      ?.chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url })
      .run();
  }
};
const unsetLink = () => editor.value?.chain().focus().unsetLink().run();

const isActive = (type) => editor.value?.isActive(type) ?? false;

onBeforeUnmount(() => {
  if (editor.value) {
    editor.value.destroy();
  }
});
</script>

<template>
  <div
    class="editable-block-wrapper"
    :class="{
      'is-editing': isEditing,
      'is-creator': isCreator,
      'is-saving': isSaving,
    }"
  >
    <!-- Edit indicator for creators (shown on hover) -->
    <div
      v-if="isCreator && !isEditing"
      class="edit-indicator"
      @click="startEditing"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path
          d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
        ></path>
        <path
          d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
        ></path>
      </svg>
    </div>

    <button
      v-if="isCreator && !isEditing && showFigureButton"
      type="button"
      class="figure-indicator"
      title="Change this paragraph's figure"
      aria-label="Change figure"
      @click.stop="changeFigure(paragraphId)"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        aria-hidden="true"
      >
        <rect x="3" y="3" width="18" height="18" rx="2"></rect>
        <circle cx="8.5" cy="8.5" r="1.5"></circle>
        <polyline points="21 15 16 10 5 21"></polyline>
      </svg>
    </button>

    <!-- Paragraph rows: the chapter editor's lossless editor, in place -->
    <div v-if="isEditing && blocksMode" class="blocks-editor">
      <ParagraphEditor
        :blocks="storedBlocks"
        :saving="isSaving"
        :error="saveError"
        @save="saveBlocks"
        @cancel="isEditing = false"
      />
    </div>

    <!-- Inline toolbar (titles, which have no blocks) -->
    <div v-if="isEditing && !blocksMode" class="editable-toolbar">
      <button
        @mousedown.prevent="toggleBold"
        :class="{ active: isActive('bold') }"
        title="Bold (Ctrl+B)"
      >
        <strong>B</strong>
      </button>
      <button
        @mousedown.prevent="toggleItalic"
        :class="{ active: isActive('italic') }"
        title="Italic (Ctrl+I)"
      >
        <em>I</em>
      </button>
      <button
        @mousedown.prevent="toggleLink"
        :class="{ active: isActive('link') }"
        title="Link (Ctrl+K)"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path
            d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"
          ></path>
          <path
            d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
          ></path>
        </svg>
      </button>
      <span class="toolbar-divider"></span>
      <button
        @mousedown.prevent="saveChanges"
        class="save-btn"
        :disabled="!hasChanges"
        title="Save (Ctrl+S)"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </button>
      <button
        @mousedown.prevent="cancelEditing"
        class="cancel-btn"
        title="Cancel (Esc)"
      >
        <CloseIcon :width="14" :height="14" />
      </button>
    </div>

    <!-- Editor content -->
    <component
      :is="isEditing ? 'div' : tag"
      v-if="!(isEditing && blocksMode)"
      :id="paragraphId"
      :class="[
        className,
        {
          'editable-content': true,
          editing: isEditing,
          P: tag === 'p' && !isEditing,
        },
      ]"
      @click="startEditing"
      @keydown="handleKeydown"
    >
      <EditorContent
        v-if="isEditing"
        :editor="editor"
        class="inline-editor"
        @blur="handleBlur"
      />
      <span v-else v-html="content"></span>
    </component>

    <!-- Saving indicator -->
    <div v-if="isSaving" class="saving-indicator">Saving...</div>
    <p v-if="saveError && !blocksMode" class="edit-note is-error" role="alert">
      {{ saveError }}
    </p>
    <p
      v-if="hasChanges && isEditing && !saveError && !blocksMode"
      class="edit-note"
    >
      Unsaved changes. Press ✓ or Cmd+S to save, or Esc to cancel.
    </p>
  </div>
</template>

<style scoped>
.editable-block-wrapper {
  position: relative;
}
.blocks-editor {
  position: relative;
  z-index: 60;
  margin: 0.5rem -0.75rem;
  pointer-events: auto;
}
.edit-note {
  margin: 6px 0 0;
  padding: 6px 10px;
  border-radius: var(--radius-control);
  background: rgb(var(--color-warn) / 0.14);
  color: rgb(var(--color-ink));
  font-family: var(--font-ui);
  font-size: 0.8125rem;
  line-height: 1.4;
  pointer-events: auto;
}
.edit-note.is-error {
  background: rgb(var(--color-accent) / 0.12);
}
.edit-note-close {
  margin-left: 8px;
  padding: 0 6px;
  border: 1px solid rgb(var(--color-line));
  border-radius: var(--radius-control);
  background: transparent;
  font: inherit;
  cursor: pointer;
}

/* Creator hover state */
.editable-block-wrapper.is-creator:not(.is-editing) {
  cursor: text;
}

.editable-block-wrapper.is-creator:not(.is-editing):hover {
  background-color: rgba(151, 71, 255, 0.05);
  border-radius: var(--radius-control);
  margin-left: -8px;
  margin-right: -8px;
  padding-left: 8px;
  padding-right: 8px;
}

.editable-block-wrapper.is-creator:not(.is-editing):hover .edit-indicator,
.editable-block-wrapper.is-creator:not(.is-editing):hover .figure-indicator,
.figure-indicator:focus-visible {
  opacity: 1;
}

/* Change figure, under the pencil (OPENBRAIN-65) */
.figure-indicator {
  position: absolute;
  top: 28px;
  right: -30px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 1px solid rgb(151, 71, 255);
  border-radius: var(--radius-control);
  background: white;
  color: rgb(151, 71, 255);
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s ease;
  z-index: 10;
}
.figure-indicator:hover {
  background: rgb(151, 71, 255);
  color: white;
}

/* Edit indicator */
.edit-indicator {
  position: absolute;
  top: 0;
  right: -30px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgb(151, 71, 255);
  border-radius: var(--radius-control);
  color: white;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s ease;
  z-index: 10;
}

.edit-indicator:hover {
  background: rgb(130, 50, 230);
}

/* Editing state */
.editable-block-wrapper.is-editing {
  position: relative;
  z-index: 100;
}

.editable-content.editing {
  background: white;
  border: 2px solid rgb(151, 71, 255);
  border-radius: var(--radius-control);
  padding: 12px 16px;
  margin: -12px -16px;
  box-shadow: 0 4px 20px rgba(151, 71, 255, 0.2);
}

/* Inline editor styles */
.inline-editor {
  outline: none;
}

.inline-editor :deep(.ProseMirror) {
  outline: none;
  min-height: 1.5em;
}

.inline-editor :deep(.ProseMirror p) {
  margin: 0;
}

.inline-editor :deep(.ProseMirror p.is-editor-empty:first-child::before) {
  content: attr(data-placeholder);
  color: #999;
  pointer-events: none;
  float: left;
  height: 0;
}

/* Inline toolbar */
.editable-toolbar {
  position: absolute;
  top: -40px;
  left: 0;
  display: flex;
  gap: 4px;
  padding: 6px 8px;
  background: #1a1a1a;
  border-radius: var(--radius-control);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 110;
}

.editable-toolbar button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: transparent;
  border: none;
  border-radius: var(--radius-control);
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.1s ease;
}

.editable-toolbar button:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.editable-toolbar button.active {
  background: rgba(151, 71, 255, 0.3);
  color: rgb(151, 71, 255);
}

.editable-toolbar button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.editable-toolbar .save-btn:not(:disabled):hover {
  background: rgba(34, 197, 94, 0.2);
  color: rgb(34, 197, 94);
}

.editable-toolbar .cancel-btn:hover {
  background: rgba(239, 68, 68, 0.2);
  color: rgb(239, 68, 68);
}

.toolbar-divider {
  width: 1px;
  background: rgba(255, 255, 255, 0.2);
  margin: 0 4px;
}

/* Saving indicator */
.saving-indicator {
  position: absolute;
  top: -40px;
  right: 0;
  padding: 6px 12px;
  background: rgb(151, 71, 255);
  color: white;
  font-size: 12px;
  border-radius: var(--radius-control);
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}
</style>
