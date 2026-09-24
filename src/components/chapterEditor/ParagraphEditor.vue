<script setup>
/*
 * ParagraphEditor — edits one paragraph row in place on the chapter block
 * page (OPENBRAIN-60), with the shared lossless schema (src/editor/schema.js).
 * Citations and figure refs are chips; images, widgets and other structured
 * blocks are cards. Emits `save` with the new blocks (docToBlocks) or
 * `cancel`; Cmd/Ctrl+S saves, Esc cancels.
 */
import { onBeforeUnmount, ref } from "vue";
import { useEditor, EditorContent, VueNodeViewRenderer } from "@tiptap/vue-3";
import { chapterExtensions } from "@/editor/schema";
import { blocksToDoc, docToBlocks } from "@/editor/blocks";
import InlineChip from "./nodes/InlineChip.vue";
import BlockCard from "./nodes/BlockCard.vue";

const props = defineProps({
  blocks: { type: Array, default: () => [] },
  saving: { type: Boolean, default: false },
  error: { type: String, default: "" },
  /** Offer "Hover image" (OPENBRAIN-70 D1); the page handles `hover-image`. */
  hoverImages: { type: Boolean, default: false },
});
const emit = defineEmits(["save", "cancel", "hover-image"]);

const VIEWS = {
  citationRef: InlineChip,
  figureRef: InlineChip,
  imageBlock: BlockCard,
  widgetBlock: BlockCard,
  blockAtom: BlockCard,
};

const dirty = ref(false);
const editor = useEditor({
  content: blocksToDoc(props.blocks),
  extensions: chapterExtensions().map((ext) =>
    VIEWS[ext.name]
      ? ext.extend({
          addNodeView() {
            return VueNodeViewRenderer(VIEWS[ext.name]);
          },
        })
      : ext
  ),
  autofocus: "end",
  onUpdate: () => (dirty.value = true),
  editorProps: {
    handleKeyDown: (_view, event) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "s") {
        event.preventDefault();
        save();
        return true;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        emit("cancel");
        return true;
      }
      return false;
    },
  },
});

function save() {
  if (!editor.value) return;
  emit("save", docToBlocks(editor.value.getJSON()));
}

const run = (fn) => () => fn(editor.value?.chain().focus())?.run();
const tools = [
  {
    label: "B",
    title: "Bold (Cmd+B)",
    mark: "bold",
    cmd: run((c) => c.toggleBold()),
  },
  {
    label: "I",
    title: "Italic (Cmd+I)",
    mark: "italic",
    cmd: run((c) => c.toggleItalic()),
  },
  {
    label: "H3",
    title: "Heading",
    node: ["heading", { level: 3 }],
    cmd: run((c) => c.toggleHeading({ level: 3 })),
  },
  {
    label: "• List",
    title: "Bulleted list",
    node: ["bulletList"],
    cmd: run((c) => c.toggleBulletList()),
  },
  {
    label: "“ Quote",
    title: "Quote",
    node: ["blockquote"],
    cmd: run((c) => c.toggleBlockquote()),
  },
];
const isActive = (t) =>
  t.mark ? editor.value?.isActive(t.mark) : editor.value?.isActive(...t.node);

function setLink() {
  const prev = editor.value?.getAttributes("link")?.href || "";
  const href = window.prompt("Link address (leave empty to remove)", prev);
  if (href === null) return;
  const chain = editor.value.chain().focus().extendMarkRange("link");
  (href ? chain.setLink({ href }) : chain.unsetLink()).run();
}

// A picture that appears when the reader hovers the selected words. The page
// picks the image; `apply` and `remove` act on the words selected now.
function hoverImage() {
  const ed = editor.value;
  if (!ed) return;
  const current = ed.getAttributes("span");
  const onHover = current?.class === "hoverImg";
  if (onHover) ed.chain().extendMarkRange("span").run();
  const { from, to } = ed.state.selection;
  if (from === to) {
    window.alert("Select the words that should show a picture on hover.");
    return;
  }
  const range = { from, to };
  emit("hover-image", {
    current: onHover
      ? { src: current.hoverSrc || "", text: current.hoverText || "" }
      : null,
    apply: (src, text) =>
      ed
        .chain()
        .focus()
        .setTextSelection(range)
        .setMark("span", {
          class: "hoverImg",
          id: null,
          hoverSrc: src,
          hoverText: text || null,
        })
        .run(),
    remove: () =>
      ed.chain().focus().setTextSelection(range).unsetMark("span").run(),
  });
}

onBeforeUnmount(() => editor.value?.destroy());
defineExpose({ save });
</script>

<template>
  <div class="pe">
    <div class="pe-toolbar" role="toolbar" aria-label="Formatting">
      <button
        v-for="t in tools"
        :key="t.label"
        type="button"
        :title="t.title"
        :class="{ active: isActive(t) }"
        @mousedown.prevent="t.cmd()"
      >
        {{ t.label }}
      </button>
      <button
        type="button"
        title="Link"
        :class="{ active: editor?.isActive('link') }"
        @mousedown.prevent="setLink"
      >
        Link
      </button>
      <button
        v-if="hoverImages"
        type="button"
        title="Show a picture when readers hover the selected words"
        :class="{ active: editor?.getAttributes('span')?.class === 'hoverImg' }"
        @mousedown.prevent="hoverImage"
      >
        Hover image
      </button>
      <span class="pe-spacer" />
      <span class="pe-hint">Cmd+S to save · Esc to cancel</span>
    </div>

    <EditorContent :editor="editor" class="pe-content" />

    <div class="pe-footer">
      <p v-if="error" class="pe-error" role="alert">{{ error }}</p>
      <span class="pe-spacer" />
      <button type="button" class="pe-btn" @click="emit('cancel')">
        Cancel
      </button>
      <button
        type="button"
        class="pe-btn pe-btn--solid"
        :disabled="saving || !dirty"
        @click="save"
      >
        {{ saving ? "Saving…" : "Save" }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.pe {
  border: 1px solid rgb(var(--color-accent) / 0.45);
  border-radius: 8px;
  background: rgb(var(--color-paper));
  box-shadow: 0 6px 24px rgb(0 0 0 / 0.06);
}
.pe-toolbar,
.pe-footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  padding: 6px 8px;
}
.pe-toolbar {
  border-bottom: 1px solid rgb(var(--color-line));
}
.pe-footer {
  border-top: 1px solid rgb(var(--color-line));
  gap: 8px;
  padding: 8px 10px;
}
.pe-toolbar button {
  padding: 4px 9px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  color: rgb(var(--color-ink));
  font-family: var(--font-ui);
  font-size: 0.8125rem;
  cursor: pointer;
}
.pe-toolbar button:hover {
  background: rgb(var(--color-line) / 0.6);
}
.pe-toolbar button.active {
  border-color: rgb(var(--color-accent) / 0.5);
  background: rgb(var(--color-accent) / 0.1);
  color: rgb(var(--color-accent));
}
.pe-spacer {
  flex: 1;
}
.pe-hint {
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  color: rgb(var(--color-mute));
}
.pe-content :deep(.ProseMirror) {
  min-height: 3.5rem;
  padding: 14px 16px;
  outline: none;
  font-family: var(--font-body);
  font-size: 1.0625rem;
  line-height: 1.65;
  color: rgb(var(--color-ink));
}
.pe-content :deep(.ProseMirror p) {
  margin: 0 0 0.75rem;
}
.pe-content :deep(.ProseMirror h3),
.pe-content :deep(.ProseMirror h4) {
  font-family: var(--font-ui);
  font-weight: 600;
  margin: 0.25rem 0 0.5rem;
}
.pe-content :deep(.ProseMirror blockquote) {
  margin: 0 0 0.75rem;
  padding-left: 1rem;
  border-left: 3px solid rgb(var(--color-line));
  font-style: italic;
}
.pe-content :deep(.hoverImg) {
  border-bottom: 1px dotted rgb(var(--color-mute));
}
.pe-error {
  margin: 0;
  color: rgb(var(--color-accent));
  font-family: var(--font-ui);
  font-size: 0.8125rem;
}
.pe-btn {
  padding: 6px 14px;
  border: 1px solid rgb(var(--color-line));
  border-radius: 999px;
  background: transparent;
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  cursor: pointer;
}
.pe-btn--solid {
  background: rgb(var(--color-ink));
  border-color: rgb(var(--color-ink));
  color: rgb(var(--color-bg));
}
.pe-btn:disabled {
  opacity: 0.45;
  cursor: default;
}
.pe-btn:focus-visible,
.pe-toolbar button:focus-visible {
  outline: 2px solid rgb(var(--color-accent));
  outline-offset: 2px;
}
</style>
