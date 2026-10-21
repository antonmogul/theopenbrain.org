<script setup>
import {
  computed,
  ref,
  watch,
  onBeforeUnmount,
  nextTick,
  useId,
  inject,
  provide,
} from "vue";
import { routerKey } from "vue-router";
import { lockReaderScroll } from "@/helper/readerScrollLock";
import { WIDGET_FIT, WIDGET_SCROLLABLE } from "@/widgets/uploaded/widgetHost";
import CloseIcon from "@/icons/custom/CloseIcon.vue";

const props = defineProps({
  show: { type: Boolean, default: false },
  title: { type: String, default: "" },
  /* Full-viewport panel for content that brings its own page layout, such as
     an embedded widget view (see WidgetBreakout). */
  wide: { type: Boolean, default: false },
  contentOwnsHeading: { type: Boolean, default: false },
});

const emit = defineEmits(["close"]);
const panelRef = ref(null);
const bodyRef = ref(null);
const bodyHeight = ref(0);
provide(WIDGET_FIT, bodyHeight);
provide(
  WIDGET_SCROLLABLE,
  computed(() => props.wide)
);
let bodyObserver = null;
watch(bodyRef, (el) => {
  bodyObserver?.disconnect();
  const measure = () => {
    bodyHeight.value = props.wide ? Math.floor(el?.clientHeight || 0) : 0;
  };
  measure();
  if (el && typeof ResizeObserver === "function") {
    bodyObserver = new ResizeObserver(measure);
    bodyObserver.observe(el);
  }
});
const closeButtonRef = ref(null);
let triggerElement = null;
const titleId = `demo-modal-title-${useId()}`;
const router = inject(routerKey, null);
let releaseScroll = null;
let activation = 0;
let unmounted = false;

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function onBackdropClick(e) {
  if (e.target === e.currentTarget) {
    emit("close");
  }
}

function onKeydown(e) {
  // A widget may consume Escape to close its own detail panel first.
  if (e.defaultPrevented || !props.show) return;
  if (e.key === "Escape") {
    e.preventDefault();
    emit("close");
    return;
  }

  if (e.key !== "Tab" || !panelRef.value) return;
  const focusable = Array.from(
    panelRef.value.querySelectorAll(focusableSelector)
  ).filter((element) => !element.hasAttribute("hidden"));
  if (!focusable.length) {
    e.preventDefault();
    panelRef.value.focus();
    return;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const inside = panelRef.value.contains(document.activeElement);
  if (e.shiftKey && (!inside || document.activeElement === first)) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && (!inside || document.activeElement === last)) {
    e.preventDefault();
    first.focus();
  }
}

function deactivate({ restoreFocus = true } = {}) {
  activation++;
  releaseScroll?.();
  releaseScroll = null;
  window.removeEventListener("keydown", onKeydown);
  window.removeEventListener("popstate", onNavigation);
  const trigger = triggerElement;
  triggerElement = null;
  if (restoreFocus && trigger?.isConnected)
    trigger.focus({ preventScroll: true });
}

function onNavigation() {
  if (!props.show || !releaseScroll) return;
  deactivate({ restoreFocus: false });
  emit("close");
}

watch(
  () => props.show,
  async (open) => {
    if (unmounted) return;
    if (!open) {
      deactivate();
      return;
    }
    triggerElement = document.activeElement;
    releaseScroll ||= lockReaderScroll();
    const currentActivation = ++activation;
    window.addEventListener("keydown", onKeydown);
    window.addEventListener("popstate", onNavigation);
    await nextTick();
    if (!unmounted && props.show && currentActivation === activation)
      closeButtonRef.value?.focus({ preventScroll: true });
  },
  { immediate: true }
);

// Includes programmatic navigation as well as browser Back/Forward.
watch(() => router?.currentRoute.value.fullPath, onNavigation);
onBeforeUnmount(() => {
  unmounted = true;
  bodyObserver?.disconnect();
  deactivate();
});
</script>

<template>
  <Teleport to="body">
    <Transition name="demo-modal">
      <div
        v-if="show"
        class="demo-backdrop"
        :class="{ 'demo-backdrop--wide': wide }"
        @click="onBackdropClick"
      >
        <div
          ref="panelRef"
          class="demo-panel"
          :class="{
            'demo-panel--wide': wide,
            'demo-panel--owned-heading': contentOwnsHeading,
          }"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          tabindex="-1"
        >
          <header class="demo-header">
            <h2
              :id="titleId"
              class="demo-title"
              :class="{ 'sr-only': contentOwnsHeading }"
            >
              {{ title }}
            </h2>
            <button
              ref="closeButtonRef"
              type="button"
              class="demo-close"
              aria-label="Close demo"
              @click="emit('close')"
            >
              <CloseIcon :width="20" :height="20" />
            </button>
          </header>
          <div ref="bodyRef" class="demo-body">
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
  padding: 1.25rem;
}

.demo-panel {
  position: relative;
  background: rgb(var(--color-paper));
  border-radius: 0;
  width: 100%;
  max-width: 1200px;
  margin: auto;
  height: calc(100vh - 2.5rem);
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  font-size: var(--ui-size-16);
}

.demo-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 28px;
  border-bottom: 1px solid rgb(var(--color-line));
  flex-shrink: 0;
}

.demo-title {
  font-family: var(--font-ui);
  font-size: 22px;
  font-weight: 600;
  color: rgb(var(--color-ink));
  margin: 0;
}

.demo-close {
  width: 44px;
  height: 44px;
  border: none;
  background: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgb(var(--color-mute));
  border-radius: 0;
  transition: all 0.15s;
}

.demo-close:hover {
  background: rgb(var(--color-ink) / 0.05);
  color: rgb(var(--color-ink));
}

.demo-close:focus-visible {
  outline: 3px solid rgb(var(--color-accent));
  outline-offset: 2px;
}

.demo-body {
  flex: 1;
  min-height: 0;
  overscroll-behavior: contain;
  overflow-y: auto;
  padding: 32px;
  font-size: var(--ui-size-16);
}

/* Wide: let the slot content own the width; widget views carry their own
   max-width and padding. */
.demo-backdrop--wide {
  padding: 0;
}
.demo-panel--wide {
  max-width: none;
  height: 100vh;
  height: 100dvh;
  margin: 0;
  border-radius: 0;
}
.demo-panel--wide .demo-header {
  padding: 0.5rem 1rem;
}

.demo-panel--wide .demo-body {
  --widget-min-h: 100%;
  padding: 0;
  background: rgb(var(--color-bg));
}

.demo-panel--wide .demo-body :deep(button),
.demo-panel--wide .demo-body :deep([role="button"]) {
  border-radius: 0;
}

/* The authored widget owns its title and full canvas. Keep the dialog name
   available to assistive technology and float only its close control. */
.demo-panel--owned-heading .demo-header {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  z-index: 2;
  padding: 0;
  border: 0;
}
.demo-panel--owned-heading .demo-close {
  background: rgb(var(--color-paper));
  color: rgb(var(--color-ink));
  border: 1px solid rgb(var(--color-line));
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

@media (max-width: 767px) {
  .demo-backdrop {
    padding: 0;
  }

  .demo-panel {
    height: 100dvh;
    max-width: none;
    border-radius: 0;
  }

  .demo-header {
    padding: 0.75rem 1rem;
  }

  .demo-body {
    padding: 1rem;
  }
}
.demo-panel--wide .demo-body {
  padding: 0;
}
</style>
