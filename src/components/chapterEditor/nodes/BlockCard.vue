<script setup>
// Node view for imageBlock / widgetBlock / blockAtom in the chapter editor
// (OPENBRAIN-60). While a paragraph is being edited its images and widgets
// show as cards (the live widget runs in the preview, outside edit mode);
// they can be selected, dragged by the handle, or deleted.
import { computed } from "vue";
import { NodeViewWrapper, nodeViewProps } from "@tiptap/vue-3";
import { BLOCK_LABELS } from "@/editor/segments";
import { imageUrl } from "@/editor/media.mjs";

const props = defineProps(nodeViewProps);
const type = computed(() => props.node.type.name);
const block = computed(() => props.node.attrs.block || {});
const kind = computed(() =>
  type.value === "imageBlock"
    ? "Image"
    : type.value === "widgetBlock"
      ? "Widget"
      : BLOCK_LABELS[block.value.type] || block.value.type || "Block"
);
const title = computed(() => {
  const a = props.node.attrs;
  if (type.value === "imageBlock") return a.caption || a.alt || a.src || "";
  if (type.value === "widgetBlock") return a.title || a.widgetId || "";
  const b = block.value;
  if (b.type === "footnote")
    return `${b.number}. ${String(b.content || "").replace(/<[^>]*>/g, "")}`;
  return b.title || "";
});
</script>

<template>
  <NodeViewWrapper
    class="card"
    :class="{ 'is-selected': selected }"
    contenteditable="false"
  >
    <span class="handle" data-drag-handle aria-hidden="true">⋮⋮</span>
    <img
      v-if="type === 'imageBlock' && node.attrs.src"
      :src="imageUrl(node.attrs.src)"
      alt=""
      class="thumb"
    />
    <span class="kind">{{ kind }}</span>
    <span class="title">{{ title }}</span>
  </NodeViewWrapper>
</template>

<style scoped>
.card {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 8px 0;
  padding: 8px 12px;
  border: 1px solid rgb(var(--color-line));
  border-radius: 6px;
  background: rgb(var(--color-bg));
  font-family: var(--font-ui);
  font-size: 0.875rem;
  user-select: none;
}
.card.is-selected {
  outline: 2px solid rgb(var(--color-accent));
}
.handle {
  cursor: grab;
  color: rgb(var(--color-mute));
  letter-spacing: -2px;
}
.thumb {
  width: 48px;
  height: 36px;
  object-fit: cover;
  border-radius: 4px;
}
.kind {
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgb(var(--color-accent));
}
.title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: rgb(var(--color-ink));
}
</style>
