<script setup>
/*
 * TimelineScrubber — the chapter timeline on a phone (OPENBRAIN-137), after
 * SoundCloud's waveform scrubber. On a narrow screen the whole chapter
 * squeezed into one screen width is too fine to aim at, and the full map is
 * too much, so a tap on the dock opens this sheet instead:
 *
 *   - the waveform is several screens wide (SCRUB_PX_PER_ITEM per item) and
 *     slides under a fixed playhead in the middle; the read colour fills up
 *     to the playhead;
 *   - drag to move through the chapter; the header says where the playhead
 *     is (section, and how far through the chapter);
 *   - hold the finger still (SCRUB_HOLD_MS) and the preview card for that
 *     spot appears; let go and the book jumps there;
 *   - a tap without a drag does nothing; the scrim, Close or Escape close it.
 *
 * Keyboard: the strip is a slider (arrows by item, PageUp/PageDown by
 * section, Home/End, Enter jumps), with the preview shown for where it is.
 * Reduced motion: the track jumps rather than glides between key presses.
 *
 * Emits `jump` (item index, { pointer }) and `close`; ChapterTimeline does
 * the jump itself, as for every other way into the chapter.
 */
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import { sectionIndexOf } from "@/helper/chapterTimeline";
import { lockReaderScroll } from "@/helper/readerScrollLock";
import { reducedMotionPreferred } from "@/helper/readerJump";
import {
  SCRUB_HOLD_MS,
  SCRUB_PX_PER_ITEM,
  SCRUB_SLOP,
  fractionalIndex,
  nearestIndex,
  scrubX,
  trackOffset,
} from "@/helper/timelineScrub";
import TimelineBars from "./TimelineBars.vue";
import TimelinePreview, { sectionName } from "./TimelinePreview.vue";

const props = defineProps({
  model: { type: Object, required: true },
  /** The reading line as a fractional item index. */
  position: { type: Number, default: 0 },
  layers: { type: Object, default: null },
  chapterTitle: { type: String, default: "" },
});
const emit = defineEmits(["jump", "close"]);

const BAR_H = 64;

const items = computed(() => props.model?.items || []);
const sections = computed(() => props.model?.sections || []);
const subsections = computed(() => props.model?.subsections || []);
const total = computed(() => items.value.length);
const trackWidth = computed(() => Math.max(1, total.value * SCRUB_PX_PER_ITEM));

const viewport = ref(null);
const barsRef = ref(null);
const closeBtn = ref(null);
const sheet = ref(null);
const viewW = ref(360);
const centers = ref([]);
const x = ref(0);
const dragging = ref(false);
const holding = ref(false);
const keyed = ref(false);
const glide = ref(false);

const currentIndex = computed(() =>
  total.value
    ? Math.min(total.value - 1, Math.max(0, Math.floor(props.position || 0)))
    : -1
);
const target = computed(() => nearestIndex(centers.value, x.value));
const played = computed(() => fractionalIndex(centers.value, x.value));
const offset = computed(() => trackOffset(x.value, viewW.value / 2));
const hereX = computed(() => centers.value[currentIndex.value] ?? null);

const sectionOf = (index) =>
  sections.value[sectionIndexOf(sections.value, index)] || null;
const subsectionOf = (index) => {
  const key = items.value[index]?.sectionKey;
  let found = null;
  for (const sub of subsections.value)
    if (sub.sectionKey === key && sub.start <= index) found = sub;
  return found;
};
const layer = (name, index) => props.layers?.[name]?.get(index) || [];

const targetSection = computed(() => sectionOf(target.value));
const targetPercent = computed(() =>
  total.value
    ? Math.round((100 * Math.min(played.value, total.value)) / total.value)
    : 0
);
const herePercent = computed(() =>
  total.value
    ? Math.round(
        (100 * Math.min(props.position || 0, total.value)) / total.value
      )
    : 0
);
const valueText = computed(() => {
  const s = targetSection.value;
  const where = s ? [sectionName(s), s.title].filter(Boolean).join(" ") : "";
  return `${targetPercent.value}%${where ? ` · ${where}` : ""}`;
});
const showPreview = computed(
  () => (holding.value || keyed.value) && target.value >= 0
);

/* ---- Measuring -------------------------------------------------------- */

// The playhead starts where the reader is, once the bars have a width to
// measure against. Until the reader touches the strip it follows the reading
// position (which can settle after the sheet opens: locking the page's
// scroll briefly reads as the top); after that a resize keeps it on the
// same item.
let placed = false;
let touched = false;

function measure() {
  viewW.value = viewport.value?.clientWidth || viewW.value;
  const bars = barsRef.value;
  if (!bars || !total.value) return;
  const keep = touched ? target.value : currentIndex.value;
  const next = items.value.map((_, i) => bars.centerOf(i));
  // Not laid out yet: TimelineBars hasn't measured its width.
  if (!(next[next.length - 1] > next[0])) return;
  centers.value = next;
  x.value = next[Math.max(0, keep)] ?? 0;
  placed = true;
}

let observer = null;
// TimelineBars measures its own width (a ResizeObserver) before centerOf is
// right: measure after it has had a tick, and again on resize.
async function measureSoon(tries = 20) {
  await nextTick();
  // TimelineBars sets its width from its own ResizeObserver, which may run
  // after ours: try again for a moment until the bars can be measured.
  const attempt = (left) => {
    measure();
    if (!placed && left > 0) setTimeout(() => attempt(left - 1), 50);
  };
  setTimeout(() => attempt(tries), 0);
}

/* ---- Pointer: drag, hold, release ------------------------------------ */

let startClientX = 0;
let startX = 0;
let lastMoveX = 0;
let moved = false;
let holdTimer = null;

function armHold() {
  clearTimeout(holdTimer);
  holdTimer = setTimeout(() => {
    if (dragging.value) holding.value = true;
  }, SCRUB_HOLD_MS);
}

function onPointerDown(e) {
  if (e.button > 0 || !centers.value.length) return;
  touched = true;
  viewport.value?.setPointerCapture?.(e.pointerId);
  dragging.value = true;
  holding.value = false;
  keyed.value = false;
  glide.value = false;
  moved = false;
  startClientX = lastMoveX = e.clientX;
  startX = x.value;
  armHold();
}

function onPointerMove(e) {
  if (!dragging.value) return;
  const dx = e.clientX - startClientX;
  if (Math.abs(dx) > SCRUB_SLOP) moved = true;
  x.value = scrubX(startX, dx, centers.value);
  // A finger that moves again puts the preview away until it rests.
  if (Math.abs(e.clientX - lastMoveX) > 2) {
    lastMoveX = e.clientX;
    holding.value = false;
    armHold();
  }
}

function endDrag() {
  clearTimeout(holdTimer);
  dragging.value = false;
}

function onPointerUp() {
  if (!dragging.value) return;
  const land = moved || holding.value;
  endDrag();
  holding.value = false;
  if (land) go({ pointer: true });
}

function onPointerCancel() {
  endDrag();
  holding.value = false;
}

/* ---- Keyboard --------------------------------------------------------- */

function moveTo(index) {
  const i = Math.min(total.value - 1, Math.max(0, index));
  glide.value = !reducedMotionPreferred();
  keyed.value = true;
  x.value = centers.value[i] ?? x.value;
}

function onKeydown(e) {
  touched = true;
  const n = total.value;
  if (!n || !centers.value.length) return;
  const from = target.value;
  const si = sectionIndexOf(sections.value, from);
  switch (e.key) {
    case "ArrowRight":
    case "ArrowUp":
      moveTo(from + 1);
      break;
    case "ArrowLeft":
    case "ArrowDown":
      moveTo(from - 1);
      break;
    case "PageDown":
      moveTo(sections.value[si + 1]?.start ?? n - 1);
      break;
    case "PageUp": {
      const start = sections.value[si]?.start ?? 0;
      moveTo(from > start ? start : (sections.value[si - 1]?.start ?? 0));
      break;
    }
    case "Home":
      moveTo(0);
      break;
    case "End":
      moveTo(n - 1);
      break;
    case "Enter":
      go();
      break;
    default:
      return;
  }
  e.preventDefault();
}

/* ---- Landing / closing ------------------------------------------------ */

function go({ pointer = false } = {}) {
  if (target.value < 0) return;
  emit("jump", target.value, { pointer });
}

function onEscape(e) {
  e.preventDefault();
  emit("close", { pointer: false });
}

let releaseScroll = null;
function onResize() {
  measure();
}

onMounted(() => {
  releaseScroll = lockReaderScroll();
  measureSoon();
  if (typeof ResizeObserver === "function") {
    observer = new ResizeObserver(onResize);
    if (viewport.value) observer.observe(viewport.value);
    const track = barsRef.value?.$el;
    if (track) observer.observe(track);
  }
  sheet.value?.focus({ preventScroll: true });
});

watch(total, () => measureSoon());
watch(currentIndex, (i) => {
  if (!touched && centers.value.length) x.value = centers.value[i] ?? x.value;
});

onBeforeUnmount(() => {
  clearTimeout(holdTimer);
  observer?.disconnect();
  releaseScroll?.();
});
</script>

<template>
  <div
    class="tls"
    role="dialog"
    aria-modal="true"
    aria-label="Move through the chapter"
    data-testid="timeline-scrubber"
    @keydown.esc="onEscape"
  >
    <div
      class="tls-scrim"
      aria-hidden="true"
      @click="emit('close', { pointer: true })"
    />

    <div ref="sheet" class="tls-sheet" tabindex="-1">
      <header class="tls-head">
        <div class="tls-where">
          <p class="tls-eyebrow">
            <template v-if="targetSection">{{
              sectionName(targetSection)
            }}</template>
            <template v-else>{{ chapterTitle }}</template>
          </p>
          <p class="tls-title">{{ targetSection?.title || chapterTitle }}</p>
        </div>
        <p class="tls-readout" aria-hidden="true">
          <span class="tls-to">{{ targetPercent }}%</span>
          <span class="tls-sep" />
          <span class="tls-from">you're at {{ herePercent }}%</span>
        </p>
        <button
          ref="closeBtn"
          type="button"
          class="tls-close"
          aria-label="Close"
          @click="emit('close', { pointer: true })"
        >
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
            <path d="M3 3l10 10M13 3L3 13" />
          </svg>
        </button>
      </header>

      <div class="tls-preview-slot">
        <TimelinePreview
          v-if="showPreview"
          :item="items[target]"
          :section="sectionOf(target)"
          :subsection="subsectionOf(target)"
          :highlights="layer('highlights', target)"
          :notes="layer('notes', target)"
          :trending="layer('trending', target)"
          :touch="true"
          @go="go({ pointer: true })"
        />
      </div>

      <div
        ref="viewport"
        class="tls-strip"
        :class="{ 'is-dragging': dragging }"
        role="slider"
        tabindex="0"
        aria-label="Chapter position"
        aria-orientation="horizontal"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-valuenow="targetPercent"
        :aria-valuetext="valueText"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerCancel"
        @lostpointercapture="onPointerCancel"
        @keydown="onKeydown"
      >
        <div
          class="tls-track"
          :class="{ 'is-gliding': glide }"
          :style="{
            width: `${trackWidth}px`,
            transform: `translate3d(${offset}px, 0, 0)`,
          }"
        >
          <TimelineBars
            ref="barsRef"
            class="tls-bars"
            :model="model"
            :position="played"
            :bar-height="BAR_H"
            :expanded="true"
            :cursor="target"
            :layers="layers"
            :interactive="false"
            aria-hidden="true"
          />
          <span
            v-if="hereX != null"
            class="tls-here"
            :style="{ left: `${hereX}px` }"
            aria-hidden="true"
          />
        </div>
        <span class="tls-playhead" aria-hidden="true" />
      </div>

      <p class="tls-hint">
        Drag to move through the chapter. Hold to preview, let go to jump.
      </p>
    </div>
  </div>
</template>

<style scoped>
.tls {
  position: fixed;
  inset: 0;
  /* Above the reader chrome: top bar 45, the timeline dock 95 (the map,
     which phones don't get, is 191). */
  z-index: 200;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}
.tls-scrim {
  position: absolute;
  inset: 0;
  background: rgb(var(--color-ink) / 0.32);
}
.tls-sheet {
  position: relative;
  outline: none;
  background: rgb(var(--color-paper));
  border-top: 1px solid rgb(var(--color-line));
  padding: 16px 0 calc(16px + env(safe-area-inset-bottom, 0px));
  display: grid;
  gap: 12px;
  color: rgb(var(--color-ink));
}
.tls-head {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto 44px;
  align-items: center;
  gap: 12px;
  padding: 0 12px 0 16px;
}
.tls-eyebrow {
  margin: 0 0 2px;
  font-family: var(--font-mono);
  font-size: var(--ui-size-10);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgb(var(--color-mute));
}
.tls-title {
  margin: 0;
  font-family: var(--font-ui);
  font-size: var(--ui-size-15);
  font-weight: 500;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tls-readout {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.tls-to {
  font-size: var(--ui-size-18);
  font-weight: 500;
}
.tls-sep {
  width: 1px;
  height: 16px;
  background: rgb(var(--color-line));
}
.tls-from {
  font-size: var(--ui-size-11);
  color: rgb(var(--color-mute));
}
.tls-close {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border: 1px solid rgb(var(--color-line));
  background: transparent;
  color: rgb(var(--color-ink));
  cursor: pointer;
}
.tls-close svg {
  stroke: currentColor;
  stroke-width: 1.4;
  fill: none;
}

/* The preview sits above the playhead while a finger rests. */
.tls-preview-slot {
  min-height: 0;
  display: flex;
  justify-content: center;
  padding: 0 16px;
}
.tls-preview-slot :deep(.tl-preview) {
  position: static;
  transform: none;
}

.tls-strip {
  position: relative;
  height: 128px;
  overflow: hidden;
  touch-action: none;
  cursor: grab;
  user-select: none;
}
.tls-strip.is-dragging {
  cursor: grabbing;
}
.tls-strip:focus-visible {
  outline: 2px solid rgb(var(--color-accent));
  outline-offset: -2px;
}
.tls-track {
  position: absolute;
  top: 8px;
  bottom: 8px;
  left: 0;
  will-change: transform;
}
.tls-track.is-gliding {
  transition: transform 180ms ease-out;
}
.tls-bars {
  position: absolute;
  inset: 0;
}
/* Where the reader is now: a short tick under the bars. */
.tls-here {
  position: absolute;
  bottom: -6px;
  width: 2px;
  height: 8px;
  margin-left: -1px;
  background: rgb(var(--color-ink));
}
/* The playhead: fixed in the middle; the chapter moves under it. */
.tls-playhead {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 2px;
  margin-left: -1px;
  background: rgb(var(--color-ink));
  pointer-events: none;
}
.tls-playhead::before {
  content: "";
  position: absolute;
  top: 0;
  left: -5px;
  border: 6px solid transparent;
  border-top-color: rgb(var(--color-ink));
}
.tls-hint {
  margin: 0;
  padding: 0 16px;
  font-family: var(--font-ui);
  font-size: var(--ui-size-12);
  color: rgb(var(--color-mute));
  text-align: center;
}
</style>
