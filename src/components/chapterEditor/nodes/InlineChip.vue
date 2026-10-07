<script setup>
// Node view for citationRef / figureRef atoms in the chapter editor
// (OPENBRAIN-60): a small non-editable chip the author can select, move with
// the text, or delete.
import { computed } from "vue";
import { NodeViewWrapper, nodeViewProps } from "@tiptap/vue-3";

const props = defineProps(nodeViewProps);
const isCitation = computed(() => props.node.type.name === "citationRef");
const label = computed(() =>
  isCitation.value
    ? String(props.node.attrs.number ?? "?")
    : `Figure ${props.node.attrs.number ?? ""}`.trim()
);
const title = computed(() =>
  isCitation.value
    ? `Citation ${props.node.attrs.number}`
    : props.node.attrs.caption || label.value
);
</script>

<template>
  <NodeViewWrapper
    as="span"
    class="chip"
    :class="[
      isCitation ? 'chip--cite' : 'chip--fig',
      { 'is-selected': selected },
    ]"
    :title="title"
    contenteditable="false"
    >{{ label }}</NodeViewWrapper
  >
</template>

<style scoped>
.chip {
  display: inline-block;
  margin: 0 1px;
  padding: 0 5px;
  border-radius: 999px;
  font-family: var(--font-mono);
  font-size: 0.7em;
  line-height: 1.6;
  vertical-align: 0.35em;
  background: rgb(var(--color-accent) / 0.12);
  color: rgb(var(--color-accent));
  cursor: default;
  user-select: none;
}
.chip--fig {
  vertical-align: baseline;
  font-size: 0.78em;
}
.chip.is-selected {
  outline: 2px solid rgb(var(--color-accent));
}
</style>
