<script setup>
/*
 * FullBleed — render a block of the prose across the whole reader width at
 * desktop sizes (OPENBRAIN-72). Extracted from WidgetBreakout's inline stage
 * (OPENBRAIN-37) so images, full-screen figures and widgets share it.
 *
 * The prose column clips horizontal overflow (TextComp .ml-text), so nothing
 * inside it can be wider than it. Instead the content is Teleported into
 * TextComp's `#reader-stage-layer` (full content width, positioned with the
 * text) at the vertical position of a slot it leaves behind, and the slot
 * keeps the content's height so the prose flows exactly as if it were in
 * place. The layer sits above the fixed figure pane, so a full-bleed block
 * covers it while it passes.
 *
 * Below the desktop breakpoint, with `enabled` false, or wherever the layer
 * doesn't exist (Storybook, tests), the content stays in flow. The default
 * slot gets `{ floating }` to style the two cases.
 */
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import ScrollTrigger from "gsap/ScrollTrigger";
import { STAGE_DESKTOP_QUERY, STAGE_LAYER_ID } from "@/helper/stageLayer";

const props = defineProps({
  /** Full width at desktop sizes; false keeps the content in the column. */
  enabled: { type: Boolean, default: true },
  /** Extra attributes for the stage element (e.g. data-* for tests). */
  stageAttrs: { type: Object, default: () => ({}) },
});

const layer = ref(null);
const wide = ref(false);
const slotEl = ref(null);
const stageEl = ref(null);
const stageTop = ref(0);
const slotHeight = ref(0);

const floating = computed(() => props.enabled && wide.value && !!layer.value);
const slotStyle = computed(() =>
  floating.value ? { height: `${slotHeight.value}px` } : null
);
const stageStyle = computed(() =>
  floating.value ? { top: `${stageTop.value}px` } : null
);

let mql = null;
let resizeObserver = null;
let syncPending = false;
let unmounted = false;

function sync() {
  if (!floating.value || !slotEl.value || !stageEl.value || !layer.value)
    return;
  const slotRect = slotEl.value.getBoundingClientRect();
  const layerRect = layer.value.getBoundingClientRect();
  stageTop.value = Math.round(slotRect.top - layerRect.top);
  const h = Math.round(stageEl.value.getBoundingClientRect().height);
  if (h !== slotHeight.value) {
    slotHeight.value = h;
    // The prose below moves by the difference: scroll-linked figures and
    // section triggers re-measure, then we measure once more (it converges).
    nextTick(() => {
      if (unmounted) return;
      ScrollTrigger.refresh();
      schedule();
    });
  }
}
/* One measurement per task for bursts of observer + resize events. A
   microtask, not requestAnimationFrame: rAF is paused in background tabs and
   never fires in some embedded browsers. */
function schedule() {
  if (syncPending) return;
  syncPending = true;
  Promise.resolve().then(() => {
    syncPending = false;
    if (!unmounted) sync();
  });
}
function observe() {
  resizeObserver?.disconnect();
  resizeObserver = null;
  if (!floating.value || typeof ResizeObserver !== "function") return;
  resizeObserver = new ResizeObserver(schedule);
  if (stageEl.value) resizeObserver.observe(stageEl.value);
  // #container is as tall as the prose: content changes above the slot
  // change it, and move the slot.
  if (layer.value?.parentElement)
    resizeObserver.observe(layer.value.parentElement);
}
function onMediaChange(e) {
  wide.value = e.matches;
}

onMounted(() => {
  layer.value = document.getElementById(STAGE_LAYER_ID);
  if (typeof window.matchMedia === "function") {
    mql = window.matchMedia(STAGE_DESKTOP_QUERY);
    wide.value = mql.matches;
    // Safari < 14 only has the legacy addListener API.
    if (mql.addEventListener) mql.addEventListener("change", onMediaChange);
    else mql.addListener?.(onMediaChange);
  }
  window.addEventListener("resize", schedule);
});
watch(floating, async () => {
  await nextTick();
  observe();
  schedule();
});
onBeforeUnmount(() => {
  unmounted = true;
  if (mql?.removeEventListener)
    mql.removeEventListener("change", onMediaChange);
  else mql?.removeListener?.(onMediaChange);
  window.removeEventListener("resize", schedule);
  resizeObserver?.disconnect();
  resizeObserver = null;
});

/** Re-measure now (e.g. when content near the viewport just mounted). */
defineExpose({ sync: schedule, floating });
</script>

<template>
  <div
    ref="slotEl"
    class="fb-slot"
    :class="{ 'fb-slot--vacated': floating }"
    :style="slotStyle"
  >
    <Teleport :to="layer" :disabled="!floating">
      <div
        ref="stageEl"
        class="fb-stage"
        :class="{ 'fb-stage--floating': floating }"
        :style="stageStyle"
        v-bind="stageAttrs"
      >
        <slot :floating="floating" />
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.fb-stage--floating {
  position: absolute;
  left: 0;
  width: 100%;
  pointer-events: auto;
  /* Content wider than the window must not grow the document; vertical
     overflow stays visible (clip + visible is a valid pair). */
  overflow-x: clip;
  overflow-y: visible;
}
</style>
