<script>
// One count for every BaseModal on the page, so title ids never repeat (even
// across separately mounted apps, which useId() would number alike).
let modalSeq = 0;
</script>

<script setup>
// Teleported scrim dialog. Logic (escape, backdrop, body-scroll-lock, transitions)
// preserved from the original; chrome rebuilt to tokens. v-model:open via modelValue.
import { watch, onMounted, onUnmounted, computed } from "vue";
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  show: { type: Boolean, default: undefined }, // deprecated alias
  title: { type: String, default: "" },
  size: { type: String, default: "md" }, // sm | md | lg | xl | full
  closeOnBackdrop: { type: Boolean, default: true },
  closeOnEscape: { type: Boolean, default: true },
});
const emit = defineEmits(["update:modelValue", "close"]);
// The panel is a modal dialog named by its title, so assistive tech knows
// what opened (OPENBRAIN-129: the deck editor's dialogs are all BaseModals).
const titleId = `modal-title-${++modalSeq}`;
const open = computed(() =>
  props.show !== undefined ? props.show : props.modelValue
);
function close() {
  emit("update:modelValue", false);
  emit("close");
}
function handleBackdropClick() {
  if (props.closeOnBackdrop) close();
}
function handleEscape(e) {
  if (e.key === "Escape" && props.closeOnEscape && open.value) close();
}
watch(open, (v) => {
  document.body.style.overflow = v ? "hidden" : "";
});
// aria-modal says the page behind is inert, so Tab stays in the panel: past
// the last control it wraps to the first, and Shift+Tab the other way. The
// listener is on the panel, so a dialog stacked on another (a confirm over
// the deck's Share dialog) keeps Tab in its own panel only.
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
function onPanelKeydown(e) {
  if (e.key !== "Tab" || e.defaultPrevented) return;
  const panel = e.currentTarget;
  const items = [...panel.querySelectorAll(FOCUSABLE)].filter(
    (el) => !el.closest("[hidden], [inert], [aria-hidden='true']")
  );
  if (!items.length) return;
  const active = document.activeElement;
  if (e.shiftKey && active === items[0]) {
    e.preventDefault();
    items.at(-1).focus();
  } else if (!e.shiftKey && active === items.at(-1)) {
    e.preventDefault();
    items[0].focus();
  }
}
onMounted(() => document.addEventListener("keydown", handleEscape));
onUnmounted(() => {
  document.removeEventListener("keydown", handleEscape);
  document.body.style.overflow = "";
});
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="open" class="modal-root">
        <div class="modal-backdrop" @click="handleBackdropClick" />
        <div class="modal-wrap">
          <div
            class="modal-panel"
            :class="`sz-${size}`"
            role="dialog"
            aria-modal="true"
            :aria-labelledby="title && !$slots.header ? titleId : undefined"
            :aria-label="title && $slots.header ? title : undefined"
            @click.stop
            @keydown="onPanelKeydown"
          >
            <div v-if="title || $slots.header" class="modal-header">
              <slot name="header"
                ><h3 :id="titleId" class="modal-title">{{ title }}</h3></slot
              >
              <button
                type="button"
                class="modal-close"
                aria-label="Close"
                @click="close"
              >
                ✕
              </button>
            </div>
            <div class="modal-body"><slot /></div>
            <div v-if="$slots.footer" class="modal-footer">
              <slot name="footer" />
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-root {
  position: fixed;
  inset: 0;
  z-index: 50;
  overflow-y: auto;
}
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgb(var(--color-ink) / 0.4);
}
.modal-wrap {
  position: relative;
  display: flex;
  min-height: 100%;
  align-items: center;
  justify-content: center;
  padding: 16px;
}
.modal-panel {
  position: relative;
  width: 100%;
  background: rgb(var(--color-paper));
  border: 1px solid rgb(var(--color-line));
  border-radius: var(--radius-control);
  box-shadow: 0 20px 60px rgb(var(--color-ink) / 0.18);
}
.sz-sm {
  max-width: 17.5rem;
}
.sz-md {
  max-width: 22.5rem;
}
.sz-lg {
  max-width: 32.5rem;
}
.sz-xl {
  max-width: 45rem;
}
.sz-full {
  max-width: 60rem;
}
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 22px;
  border-bottom: 1px solid rgb(var(--color-line));
}
.modal-title {
  font-family: var(--font-body);
  font-size: var(--ui-size-20);
  font-weight: 500;
  color: rgb(var(--color-ink));
  margin: 0;
}
.modal-close {
  border: 0;
  background: transparent;
  color: rgb(var(--color-mute));
  font-size: var(--ui-size-16);
  cursor: pointer;
  line-height: 1;
}
.modal-close:hover {
  color: rgb(var(--color-ink));
}
.modal-body {
  padding: 22px;
}
.modal-footer {
  padding: 16px 22px;
  border-top: 1px solid rgb(var(--color-line));
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.18s ease;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>
