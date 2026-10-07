<script setup>
// One slide drawn from its deck entry (OPENBRAIN-129): the editor's live
// preview, the rail's thumbnails and the cards in Dashboard → Decks. The
// layout renders at its design size, 1920×1080, and is scaled to the width
// it is given, like the Deck stories' renderSlide. It mounts the layout
// component from SLIDE_LAYOUTS directly and never DeckStage, which binds its
// keys on window. Everything inside is inert: tabbing never enters a slide.
//
// The preview also checks the slide: a layout that throws shows "Can't
// preview this slide" instead of taking the editor down (error), and text
// that runs past a clipping box is reported (overflow) for W_OVERFLOW.
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onErrorCaptured,
  onMounted,
  ref,
  shallowRef,
  watch,
} from "vue";
import { SLIDE_LAYOUTS } from "./slides/layouts.js";
import { normalizeSlide } from "@/data/decks/validate.js";

const props = defineProps({
  // A deck entry: { id, label, layout, props, hidden?, notes? }.
  entry: { type: Object, required: true },
  // Rail and card thumbnails: no overflow check, no video metadata fetch,
  // and no accessible name of its own (the button around it has one).
  thumb: { type: Boolean, default: false },
  // Milliseconds to wait after the last edit before redrawing (the editor
  // passes 100). Switching to another slide redraws at once.
  debounce: { type: Number, default: 0 },
  // Accessible name, e.g. "Preview of slide 3: Team".
  label: { type: String, default: "" },
});
const emit = defineEmits(["overflow", "error"]);

const WIDTH = 1920;
const HEIGHT = 1080;

const box = ref(null);
const canvas = ref(null);
const scale = ref(0);
// What is on screen: a plain, normalised copy of the entry, so later edits
// reach the slide only when the debounce fires.
const shown = shallowRef(null);
const failure = ref(null);
// Bumped to remount the layout after it threw (patching a broken instance
// in place would only throw again).
const renderKey = ref(0);
// The overflow last reported, so it is emitted only when it changes.
let lastOverflow = null;

const component = computed(() =>
  shown.value ? SLIDE_LAYOUTS[shown.value.layout] : null
);
const hiddenSlide = computed(() => props.entry?.hidden === true);
// The box is role="img", whose contents assistive tech never reads, so a
// failure is said in its name too.
const accessibleLabel = computed(() => {
  const base = props.label || `Preview of ${props.entry?.label || "slide"}`;
  return failure.value
    ? `${base}. Can't preview this slide: ${failure.value}`
    : base;
});
const canvasStyle = computed(() => ({
  width: `${WIDTH}px`,
  height: `${HEIGHT}px`,
  transform: `scale(${scale.value})`,
}));

function setFailure(message) {
  if (failure.value === message) return;
  failure.value = message;
  emit("error", message);
}

function snapshot(entry) {
  const plain = JSON.parse(JSON.stringify(entry ?? {}));
  const normal = normalizeSlide(plain);
  const slideProps = { ...(normal.props || {}) };
  // A thumbnail never loads the video, not even its metadata.
  if (props.thumb && normal.layout === "video") slideProps.src = "";
  return { id: normal.id, layout: normal.layout, props: slideProps };
}

function draw() {
  clearTimeout(timer);
  // Another slide: report its overflow afresh, even if it matches the last.
  if (props.entry?.id !== drawnId) lastOverflow = null;
  drawnId = props.entry?.id;
  try {
    const next = snapshot(props.entry);
    if (!SLIDE_LAYOUTS[next.layout])
      throw new Error(`there is no layout called "${next.layout}".`);
    if (failure.value) renderKey.value += 1;
    shown.value = next;
    setFailure(null);
  } catch (err) {
    shown.value = null;
    setFailure(err?.message || String(err));
  }
}

let timer;
let drawnId;
watch(
  () => props.entry,
  (entry) => {
    const sameSlide = entry?.id && entry.id === shown.value?.id;
    if (!props.debounce || !sameSlide || failure.value) return draw();
    clearTimeout(timer);
    timer = setTimeout(draw, props.debounce);
  },
  { deep: true }
);
draw();

// A layout that throws while rendering: show why, keep the editor running.
onErrorCaptured((err) => {
  shown.value = null;
  setFailure(err?.message || String(err));
  return false;
});

// ── overflow ────────────────────────────────────────────────────────────
// After each draw, the slide root and every box that clips its content
// (overflow hidden or clip) are checked for content larger than the box.
// Two pixels of slack absorb sub-pixel rounding in the layouts.
const clips = (el) => {
  const style = getComputedStyle(el);
  return /hidden|clip/.test(`${style.overflowX} ${style.overflowY}`);
};
const spills = (el) =>
  el.scrollHeight > el.clientHeight + 2 || el.scrollWidth > el.clientWidth + 2;

function measure() {
  if (props.thumb) return;
  const root = canvas.value?.firstElementChild;
  const over =
    !failure.value &&
    !!root &&
    (spills(root) ||
      [...root.querySelectorAll("*")].some((el) => clips(el) && spills(el)));
  if (over === lastOverflow) return;
  lastOverflow = over;
  emit("overflow", over);
}

let frame;
function scheduleMeasure() {
  if (props.thumb) return;
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(measure);
}
watch([shown, failure], () => nextTick(scheduleMeasure), { flush: "post" });

// ── scale ───────────────────────────────────────────────────────────────
let observer;
const fit = (width) => {
  if (width) scale.value = width / WIDTH;
};
onMounted(() => {
  fit(box.value?.clientWidth);
  if (typeof ResizeObserver !== "undefined") {
    observer = new ResizeObserver(([e]) => fit(e.contentRect.width));
    observer.observe(box.value);
  }
  scheduleMeasure();
  // Web fonts change line breaks: measure again once they are in.
  document.fonts?.ready?.then(scheduleMeasure).catch(() => {});
});
onBeforeUnmount(() => {
  observer?.disconnect();
  clearTimeout(timer);
  cancelAnimationFrame(frame);
});
</script>

<template>
  <div
    class="slide-preview"
    :class="{ 'is-thumb': thumb, 'is-hidden': hiddenSlide }"
    :aria-hidden="thumb ? 'true' : undefined"
    :data-layout="entry?.layout"
  >
    <div
      ref="box"
      class="slide-preview__box"
      :role="thumb ? undefined : 'img'"
      :aria-label="thumb ? undefined : accessibleLabel"
    >
      <div
        ref="canvas"
        class="slide-preview__canvas"
        :style="canvasStyle"
        inert
      >
        <component
          :is="component"
          v-if="component && !failure"
          :key="renderKey"
          v-bind="shown.props"
        />
      </div>
      <p v-if="failure" class="slide-preview__error">
        <template v-if="thumb">Can't preview</template>
        <template v-else>Can't preview this slide: {{ failure }}</template>
      </p>
    </div>
    <p v-if="hiddenSlide && !thumb" class="slide-preview__caption">
      Hidden when presenting
    </p>
  </div>
</template>

<style scoped>
.slide-preview {
  position: relative;
  width: 100%;
}
.slide-preview__box {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: rgb(var(--color-line));
  box-shadow: 0 0 0 1px rgb(var(--color-line));
}
.slide-preview__canvas {
  position: absolute;
  top: 0;
  left: 0;
  transform-origin: 0 0;
  pointer-events: none;
}
.is-hidden .slide-preview__box > .slide-preview__canvas {
  opacity: 0.4;
}
.slide-preview__error {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 12px;
  text-align: center;
  background: rgb(var(--color-paper));
  border: 1px dashed rgb(var(--color-accent));
  color: rgb(var(--color-ink));
  font-family: var(--font-ui);
  font-size: var(--ui-size-14);
  line-height: 1.45;
}
.is-thumb .slide-preview__error {
  font-family: var(--font-mono);
  font-size: var(--ui-size-10);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.slide-preview__caption {
  margin: 8px 0 0;
  font-family: var(--font-mono);
  font-size: var(--ui-size-11);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgb(var(--color-mute));
}
</style>
