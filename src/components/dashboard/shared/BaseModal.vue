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
const open = computed(() => (props.show !== undefined ? props.show : props.modelValue));
function close() { emit("update:modelValue", false); emit("close"); }
function handleBackdropClick() { if (props.closeOnBackdrop) close(); }
function handleEscape(e) { if (e.key === "Escape" && props.closeOnEscape && open.value) close(); }
watch(open, (v) => { document.body.style.overflow = v ? "hidden" : ""; });
onMounted(() => document.addEventListener("keydown", handleEscape));
onUnmounted(() => { document.removeEventListener("keydown", handleEscape); document.body.style.overflow = ""; });
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="open" class="modal-root">
        <div class="modal-backdrop" @click="handleBackdropClick" />
        <div class="modal-wrap">
          <div class="modal-panel" :class="`sz-${size}`" @click.stop>
            <div v-if="title || $slots.header" class="modal-header">
              <slot name="header"><h3 class="modal-title">{{ title }}</h3></slot>
              <button type="button" class="modal-close" aria-label="Close" @click="close">✕</button>
            </div>
            <div class="modal-body"><slot /></div>
            <div v-if="$slots.footer" class="modal-footer"><slot name="footer" /></div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-root { position: fixed; inset: 0; z-index: 50; overflow-y: auto; }
.modal-backdrop { position: fixed; inset: 0; background: rgb(var(--color-ink) / 0.4); }
.modal-wrap { position: relative; display: flex; min-height: 100%; align-items: center; justify-content: center; padding: 16px; }
.modal-panel {
  position: relative; width: 100%; background: rgb(var(--color-paper));
  border: 1px solid rgb(var(--color-line)); border-radius: 6px;
  box-shadow: 0 20px 60px rgb(var(--color-ink) / 0.18);
}
.sz-sm { max-width: 28rem; } .sz-md { max-width: 36rem; } .sz-lg { max-width: 52rem; }
.sz-xl { max-width: 72rem; } .sz-full { max-width: 96rem; }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 22px; border-bottom: 1px solid rgb(var(--color-line)); }
.modal-title { font-family: var(--font-body); font-size: 2rem; font-weight: 500; color: rgb(var(--color-ink)); margin: 0; }
.modal-close { border: 0; background: transparent; color: rgb(var(--color-mute)); font-size: 1.6rem; cursor: pointer; line-height: 1; }
.modal-close:hover { color: rgb(var(--color-ink)); }
.modal-body { padding: 22px; }
.modal-footer { padding: 16px 22px; border-top: 1px solid rgb(var(--color-line)); display: flex; justify-content: flex-end; gap: 8px; }
.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.18s ease; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
</style>
