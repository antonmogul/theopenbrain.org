<script setup>
/*
 * InsertMenu — the "+" between blocks on the chapter block page
 * (OPENBRAIN-61). Opens a small menu of block types and emits `choose` with
 * one of: text, heading, quote, list, image, widget.
 */
import { nextTick, onBeforeUnmount, ref } from "vue";

defineProps({ label: { type: String, default: "Add a block here" } });
const emit = defineEmits(["choose"]);

const open = ref(false);
const root = ref(null);

const OPTIONS = [
  { type: "text", label: "Text", hint: "A paragraph" },
  { type: "heading", label: "Heading", hint: "A subheading" },
  { type: "image", label: "Image", hint: "From the media library" },
  { type: "widget", label: "Widget", hint: "An interactive" },
  { type: "quote", label: "Quote", hint: "A quotation" },
  { type: "list", label: "List", hint: "Bulleted points" },
];

function onDocClick(e) {
  if (root.value && !root.value.contains(e.target)) close();
}
async function toggle() {
  open.value = !open.value;
  if (open.value) {
    document.addEventListener("mousedown", onDocClick);
    await nextTick();
    root.value?.querySelector(".im-item")?.focus();
  } else close();
}
function close() {
  open.value = false;
  document.removeEventListener("mousedown", onDocClick);
}
function choose(type) {
  close();
  emit("choose", type);
}
onBeforeUnmount(close);
</script>

<template>
  <div ref="root" class="im" :class="{ 'is-open': open }" @keydown.esc="close">
    <button
      type="button"
      class="im-plus"
      :aria-expanded="open"
      :aria-label="label"
      @click="toggle"
    >
      <span aria-hidden="true">+</span>
    </button>
    <div v-if="open" class="im-menu" role="menu">
      <button
        v-for="o in OPTIONS"
        :key="o.type"
        type="button"
        role="menuitem"
        class="im-item"
        @click="choose(o.type)"
      >
        <span class="im-label">{{ o.label }}</span>
        <span class="im-hint">{{ o.hint }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.im {
  position: relative;
  display: flex;
  align-items: center;
  height: 18px;
  margin: 2px 0;
}
.im::before {
  content: "";
  position: absolute;
  inset: 50% 0 auto 28px;
  height: 1px;
  background: rgb(var(--color-accent) / 0.35);
  opacity: 0;
  transition: opacity 0.12s ease;
}
.im:hover::before,
.im.is-open::before,
.im:focus-within::before {
  opacity: 1;
}
.im-plus {
  position: relative;
  z-index: 1;
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  margin-left: -4px;
  border: 1px solid rgb(var(--color-line));
  border-radius: 50%;
  background: rgb(var(--color-paper));
  color: rgb(var(--color-mute));
  font-size: 15px;
  line-height: 1;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.12s ease;
}
.im:hover .im-plus,
.im.is-open .im-plus,
.im-plus:focus-visible {
  opacity: 1;
  border-color: rgb(var(--color-accent));
  color: rgb(var(--color-accent));
}
.im-plus:focus-visible {
  outline: 2px solid rgb(var(--color-accent));
  outline-offset: 2px;
}
.im-menu {
  position: absolute;
  top: 24px;
  left: 0;
  z-index: 30;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 2px;
  width: min(360px, calc(100vw - 48px));
  padding: 6px;
  border: 1px solid rgb(var(--color-line));
  border-radius: 10px;
  background: rgb(var(--color-paper));
  box-shadow: 0 12px 32px rgb(0 0 0 / 0.12);
}
.im-item {
  display: grid;
  gap: 1px;
  padding: 8px 10px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  text-align: left;
  cursor: pointer;
  font-family: var(--font-ui);
}
.im-item:hover,
.im-item:focus-visible {
  background: rgb(var(--color-accent) / 0.08);
  outline: none;
}
.im-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: rgb(var(--color-ink));
}
.im-hint {
  font-size: 0.75rem;
  color: rgb(var(--color-mute));
}
</style>
