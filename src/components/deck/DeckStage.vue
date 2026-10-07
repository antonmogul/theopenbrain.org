<script setup>
// Presents a list of slides. Each slide is a fixed 1920×1080 canvas, scaled
// to fit the stage and letterboxed. Navigation: ←/→, ↑/↓, PgUp/PgDn, Space,
// Home/End and the number keys; on touch screens a tap on the left or right
// half of the slide. F toggles full screen, N the speaker notes. The browser's
// Print (or the overlay's PDF button) lays every slide out as its own page.
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";

const props = defineProps({
  // [{ id, label, notes?, component, props? }]
  slides: { type: Array, required: true },
  // Zero-based index of the slide on screen (v-model).
  modelValue: { type: Number, default: 0 },
  // Heading for the overlay and the screen-reader description.
  title: { type: String, default: "Slides" },
});
const emit = defineEmits(["update:modelValue"]);

const WIDTH = 1920;
const HEIGHT = 1080;

const root = ref(null);
const canvas = ref(null);
const box = ref({ width: WIDTH, height: HEIGHT });
const showNotes = ref(false);
const overlayVisible = ref(true);

const count = computed(() => props.slides.length);
const index = computed(() =>
  Math.min(Math.max(props.modelValue, 0), Math.max(count.value - 1, 0))
);
const current = computed(() => props.slides[index.value]);

const scale = computed(() =>
  Math.min(box.value.width / WIDTH, box.value.height / HEIGHT)
);
const canvasStyle = computed(() => ({
  width: `${WIDTH}px`,
  height: `${HEIGHT}px`,
  left: `${(box.value.width - WIDTH * scale.value) / 2}px`,
  top: `${(box.value.height - HEIGHT * scale.value) / 2}px`,
  transform: `scale(${scale.value})`,
}));

function go(i) {
  const next = Math.min(Math.max(i, 0), count.value - 1);
  if (next !== index.value) emit("update:modelValue", next);
}
const next = () => go(index.value + 1);
const prev = () => go(index.value - 1);

// A video keeps playing while hidden with v-show, so stop it on the way out.
watch(index, () => {
  canvas.value?.querySelectorAll("video").forEach((v) => v.pause());
});

const INTERACTIVE =
  "a, button, input, select, textarea, video, [contenteditable]";

function onKeydown(e) {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const target = e.target instanceof Element ? e.target : null;
  // Leave typing, and Space/Enter on controls, to the control.
  if (target?.closest("input, select, textarea, [contenteditable]")) return;
  if ((e.key === " " || e.key === "Enter") && target?.closest(INTERACTIVE))
    return;

  const keys = {
    ArrowRight: next,
    ArrowDown: next,
    PageDown: next,
    " ": next,
    ArrowLeft: prev,
    ArrowUp: prev,
    PageUp: prev,
    Home: () => go(0),
    End: () => go(count.value - 1),
    n: () => (showNotes.value = !showNotes.value),
    N: () => (showNotes.value = !showNotes.value),
    f: toggleFullscreen,
    F: toggleFullscreen,
  };
  if (keys[e.key]) {
    e.preventDefault();
    keys[e.key]();
    wake();
  } else if (/^[1-9]$/.test(e.key)) {
    e.preventDefault();
    go(Number(e.key) - 1);
  }
}

// Taps on a touch screen: left half back, right half forward. Links,
// buttons and the video player keep their own taps.
function onPointerUp(e) {
  if (e.pointerType !== "touch") return;
  if (e.target instanceof Element && e.target.closest(INTERACTIVE)) return;
  const rect = root.value.getBoundingClientRect();
  if (e.clientX - rect.left < rect.width / 2) prev();
  else next();
}

function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen?.();
  else root.value?.requestFullscreen?.().catch(() => {});
}

const print = () => window.print();

// The overlay fades after a few seconds without the pointer moving.
let idleTimer;
function wake() {
  overlayVisible.value = true;
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => (overlayVisible.value = false), 2500);
}

let observer;
onMounted(() => {
  observer = new ResizeObserver(([entry]) => {
    const { width, height } = entry.contentRect;
    if (width && height) box.value = { width, height };
  });
  observer.observe(root.value);
  window.addEventListener("keydown", onKeydown);
  wake();
});
onBeforeUnmount(() => {
  observer?.disconnect();
  window.removeEventListener("keydown", onKeydown);
  clearTimeout(idleTimer);
});
</script>

<template>
  <div
    ref="root"
    class="deck-stage"
    role="region"
    aria-roledescription="slide deck"
    :aria-label="title"
    @pointermove="wake"
    @pointerup="onPointerUp"
  >
    <div ref="canvas" class="deck-stage__canvas" :style="canvasStyle">
      <div
        v-for="(slide, i) in slides"
        v-show="i === index"
        :key="slide.id"
        class="deck-stage__slide"
        role="group"
        aria-roledescription="slide"
        :aria-label="`${i + 1} of ${count}: ${slide.label}`"
        :aria-hidden="i === index ? undefined : 'true'"
        :data-slide="slide.id"
      >
        <component :is="slide.component" v-bind="slide.props" />
      </div>
    </div>

    <p class="deck-stage__live" aria-live="polite">
      Slide {{ index + 1 }} of {{ count }}: {{ current?.label }}
    </p>

    <div v-if="showNotes && current" class="deck-stage__notes">
      <span class="deck-stage__notes-label">Notes · {{ current.label }}</span>
      <p>{{ current.notes || "No notes for this slide." }}</p>
    </div>

    <nav
      class="deck-stage__overlay"
      :class="{ 'is-hidden': !overlayVisible }"
      aria-label="Slide controls"
      @pointerenter="wake"
      @focusin="wake"
    >
      <button
        type="button"
        aria-label="Previous slide"
        :disabled="index === 0"
        @click="prev"
      >
        ←
      </button>
      <span class="deck-stage__count">
        {{ String(index + 1).padStart(2, "0") }} /
        {{ String(count).padStart(2, "0") }}
        <span class="deck-stage__label">{{ current?.label }}</span>
      </span>
      <button
        type="button"
        aria-label="Next slide"
        :disabled="index === count - 1"
        @click="next"
      >
        →
      </button>
      <span class="deck-stage__sep" aria-hidden="true" />
      <button
        type="button"
        :aria-pressed="showNotes"
        title="Speaker notes (N)"
        @click="showNotes = !showNotes"
      >
        Notes
      </button>
      <button type="button" title="Full screen (F)" @click="toggleFullscreen">
        Full screen
      </button>
      <button type="button" title="Print or save as PDF" @click="print">
        PDF
      </button>
    </nav>
  </div>
</template>

<style scoped>
.deck-stage {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: rgb(10 10 10);
  touch-action: manipulation;
}
.deck-stage__canvas {
  position: absolute;
  transform-origin: 0 0;
}
.deck-stage__live {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

.deck-stage__overlay {
  position: absolute;
  left: 50%;
  bottom: 20px;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px;
  background: rgb(28 28 28 / 0.92);
  color: rgb(243 239 230);
  font-family: "IBM Plex Mono", ui-monospace, monospace;
  font-size: var(--ui-size-13);
  box-shadow: 0 8px 24px rgb(0 0 0 / 0.3);
  transition: opacity 0.3s ease;
}
.deck-stage__overlay.is-hidden {
  opacity: 0;
}
.deck-stage__overlay button {
  min-width: 36px;
  height: 36px;
  padding: 0 10px;
  border: 0;
  border-radius: var(--radius-control);
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
}
.deck-stage__overlay button:hover:not(:disabled),
.deck-stage__overlay button[aria-pressed="true"] {
  background: rgb(243 239 230 / 0.12);
}
.deck-stage__overlay button:focus-visible {
  outline: 2px solid rgb(var(--color-accent));
  outline-offset: 1px;
}
.deck-stage__overlay button:disabled {
  opacity: 0.35;
  cursor: default;
}
.deck-stage__count {
  padding: 0 8px;
  white-space: nowrap;
}
.deck-stage__label {
  margin-left: 8px;
  color: rgb(154 152 144);
}
.deck-stage__sep {
  width: 1px;
  height: 20px;
  margin: 0 4px;
  background: rgb(243 239 230 / 0.2);
}
@media (max-width: 640px) {
  .deck-stage__label,
  .deck-stage__sep,
  .deck-stage__overlay button[title] {
    display: none;
  }
}

.deck-stage__notes {
  position: absolute;
  left: 50%;
  bottom: 72px;
  transform: translateX(-50%);
  width: min(880px, calc(100% - 32px));
  padding: 16px 20px;
  background: rgb(28 28 28 / 0.95);
  color: rgb(243 239 230);
  font-family: "IBM Plex Sans", system-ui, sans-serif;
  font-size: var(--ui-size-16);
  line-height: 1.5;
}
.deck-stage__notes-label {
  display: block;
  margin-bottom: 6px;
  font-family: "IBM Plex Mono", ui-monospace, monospace;
  font-size: var(--ui-size-12);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgb(var(--color-complete));
}
.deck-stage__notes p {
  margin: 0;
}

/* Print: every slide is one page at the design size, in order, so Print →
   Save as PDF gives a one-slide-per-page PDF. */
@media print {
  .deck-stage {
    position: static;
    height: auto;
    overflow: visible;
    background: none;
  }
  .deck-stage__canvas {
    position: static;
    transform: none !important;
    width: auto !important;
    height: auto !important;
  }
  .deck-stage__slide {
    display: block !important;
  }
  .deck-stage__slide:not(:last-child) {
    break-after: page;
  }
  .deck-stage__overlay,
  .deck-stage__notes,
  .deck-stage__live {
    display: none;
  }
}
</style>
