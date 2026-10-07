<script setup>
/*
 * ChapterTimeline — the dock at the bottom of a chapter (OPENBRAIN-128). The
 * chapter as bars, SoundCloud-waveform style (TimelineBars): one per
 * paragraph, widget or break, as tall as the paragraph is long, the part
 * already read in the chapter colour. It replaces the 2px progress line that
 * ran along the top bar.
 *
 * Three states:
 *   rest  a 20px strip (REST_H, published as --reader-timeline-h so the
 *         figure pane stops above it; the sidebar keeps clear of PEEK_H)
 *         with the % read;
 *   peek  pointer over it, keyboard focus in it, or a tap on touch: PEEK_H
 *         tall, with section labels, the content and "you" lanes, a preview
 *         card for the bar under the pointer and the map button;
 *   map   TimelineMap, full screen (loaded on first open).
 *
 * The bar area is the slider: the arrow keys move a cursor bar (its preview
 * shows and a polite live region reads it), PageUp/PageDown go by section,
 * Home/End to the ends, Enter jumps. On touch (no hover) a tap selects a bar
 * and a second tap, or "Go here", jumps; a tap elsewhere or a scroll of more
 * than 48px folds it away. A pointer never focuses the slider: only the
 * keyboard does, so a click doesn't leave it holding the page's scroll keys.
 *
 * A jump moves focus to where it lands (useChapterTimeline.jumpTo), so the
 * dock folds behind it. Closing the map from the keyboard puts focus back on
 * the map button, in the peek; closing it with a click or tap folds the dock
 * and puts focus on the slider, without peeking. If the map's code fails to
 * load, the button lets go and the next click tries again.
 *
 * Presentational: useChapterTimeline measures the page, tracks the reading
 * position and gathers the layers; ChapterView passes them in and scrolls
 * when this emits `jump` with an item index, or `{ index, anchorId }` for a
 * section or subsection from the map (its heading), and `{ pointer }`: a
 * click or tap made the jump, so the focus it moves shows no ring.
 */
import {
  computed,
  defineAsyncComponent,
  nextTick,
  onBeforeUnmount,
  onErrorCaptured,
  onMounted,
  ref,
  watch,
} from "vue";
import { useMediaQuery } from "@/composables/useMediaQuery";
import { PEEK_H, REST_H, sectionIndexOf } from "@/helper/chapterTimeline";
import TimelineBars from "./TimelineBars.vue";
import TimelinePreview, {
  displayTitle,
  readers,
  sectionName,
} from "./TimelinePreview.vue";

// Most readers never open the map: its code and styles load on first open.
const TimelineMap = defineAsyncComponent(() => import("./TimelineMap.vue"));

const props = defineProps({
  /** buildTimeline() result. */
  model: { type: Object, required: true },
  /** The reading line as a fractional item index. */
  position: { type: Number, default: 0 },
  /** 0..100: aria-valuenow and the % label. */
  readPercent: { type: Number, default: 0 },
  /** useChapterTimeline layers: Maps of item index → entries. */
  layers: {
    type: Object,
    default: () => ({
      highlights: new Map(),
      notes: new Map(),
      trending: new Map(),
    }),
  },
  chapterTitle: { type: String, default: "" },
  /** Out of the way (the footnote sheet is open). */
  hidden: { type: Boolean, default: false },
});

const emit = defineEmits(["jump"]);

// Bar heights in each state (px); the dock's own heights are REST_H/PEEK_H.
const REST_BAR = 12;
const PEEK_BAR = 52;
// The bars' gutters: the % label and the map button live in the right one,
// so the bars don't move between states.
const BARS_LEFT = 16;
const BARS_RIGHT = 64;
// Touch: a page scroll this long folds the peek away.
const SCROLL_FOLD = 48;
// A focus this soon after a pointer press came from the pointer.
const POINTER_FOCUS_MS = 600;
// A jump's smooth scroll is over by now if no scrollend has said so.
const JUMP_SETTLE_MS = 1500;

const rootEl = ref(null);
const barsRef = ref(null);
const mapButton = ref(null);

const finePointer = useMediaQuery("(hover: hover) and (pointer: fine)");
const lastPointer = ref(""); // "mouse" | "touch", from the last press
// Touch behaviour: no hover to peek with, or the reader just used a finger.
const touchUI = computed(
  () =>
    lastPointer.value === "touch" ||
    (!finePointer.value && lastPointer.value !== "mouse")
);

const open = ref(false);
const hovered = ref(false);
const keyboardInside = ref(false);
const cursor = ref(-1);
const cursorBy = ref(""); // "pointer" | "key"
const mapOpen = ref(false);
const announcement = ref("");
let pointerDownAt = -Infinity;
let openedAtY = 0;
let quietFocus = false;
let openAtPress = false;

const items = computed(() => props.model?.items || []);
const sections = computed(() => props.model?.sections || []);
const subsections = computed(() => props.model?.subsections || []);
const total = computed(() => items.value.length);

const currentIndex = computed(() =>
  total.value
    ? Math.min(total.value - 1, Math.max(0, Math.floor(props.position || 0)))
    : -1
);
const sectionOf = (index) =>
  sections.value[sectionIndexOf(sections.value, index)] || null;
const subsectionOf = (index) => {
  const key = items.value[index]?.sectionKey;
  let found = null;
  for (const sub of subsections.value)
    if (sub.sectionKey === key && sub.start <= index) found = sub;
  return found;
};

const percent = computed(() =>
  Math.round(Math.min(100, Math.max(0, props.readPercent || 0)))
);
const valueText = computed(() => {
  const s = sectionOf(currentIndex.value);
  const where = s ? [s.label, s.title].filter(Boolean).join(" ") : "";
  return where ? `${percent.value}% read · ${where}` : `${percent.value}% read`;
});

// While a jump scrolls, the slider's value holds still: the percent and the
// section would otherwise step through every place the scroll passes, and a
// screen reader speaks each change. It moves once, when the scroll settles.
const heldValue = ref(null);
let settleTimer = null;

function releaseValue() {
  clearTimeout(settleTimer);
  settleTimer = null;
  window.removeEventListener("scrollend", onScrollEnd);
  heldValue.value = null;
}

// The reading position catches up in the frame after the last scroll.
function onScrollEnd() {
  requestAnimationFrame(releaseValue);
}

function holdValue() {
  heldValue.value ??= { now: percent.value, text: valueText.value };
  window.removeEventListener("scrollend", onScrollEnd);
  window.addEventListener("scrollend", onScrollEnd, { once: true });
  clearTimeout(settleTimer);
  settleTimer = setTimeout(releaseValue, JUMP_SETTLE_MS);
}

const ariaNow = computed(() => heldValue.value?.now ?? percent.value);
const ariaText = computed(() => heldValue.value?.text ?? valueText.value);

const layer = (name, index) => props.layers?.[name]?.get(index) || [];

/* ---- Preview -------------------------------------------------------- */

const previewItem = computed(() =>
  open.value && cursor.value >= 0 ? items.value[cursor.value] : null
);
const previewX = computed(() =>
  previewItem.value && barsRef.value
    ? BARS_LEFT + barsRef.value.centerOf(cursor.value)
    : null
);

/** What the live region reads for an item. */
function summary(index) {
  const item = items.value[index];
  if (!item) return "";
  const s = sectionOf(index);
  const where = s ? [sectionName(s), s.title].filter(Boolean).join(", ") : "";
  const parts = [
    `${where ? `${where}: ` : ""}paragraph ${index + 1} of ${total.value}.`,
  ];
  if (item.kind === "widget") parts.push(`Widget: ${item.title}.`);
  else if (item.kind === "break") {
    const video = item.marks.some((m) => m.type === "video");
    parts.push(`${video ? "Video" : "Break"}: ${item.title}.`);
  } else {
    const figure = item.marks.find((m) => m.type === "figure");
    if (figure) parts.push(`Figure: ${displayTitle(figure.title)}.`);
    else if (item.marks.some((m) => m.type === "image")) parts.push("Image.");
  }
  const highlights = layer("highlights", index).length;
  const notes = layer("notes", index).length;
  if (highlights)
    parts.push(
      `${highlights === 1 ? "1 highlight" : `${highlights} highlights`} of yours.`
    );
  if (notes) parts.push(notes === 1 ? "1 note." : `${notes} notes.`);
  const trend = layer("trending", index)[0];
  if (trend) parts.push(`${readers(trend.count)} highlighted this.`);
  return parts.join(" ");
}

/* ---- Open / close --------------------------------------------------- */

function collapse() {
  open.value = false;
  cursor.value = -1;
  cursorBy.value = "";
}

// A focus or jump this soon after a press came from the pointer.
const pressedJustNow = () =>
  performance.now() - pointerDownAt < POINTER_FOCUS_MS;

function onPointerDown(e) {
  pointerDownAt = performance.now();
  openAtPress = open.value;
  lastPointer.value = e.pointerType === "touch" ? "touch" : "mouse";
}

function onPointerEnter(e) {
  if (e.pointerType === "touch") return;
  hovered.value = true;
  open.value = true;
}

function onPointerLeave(e) {
  if (e.pointerType === "touch") return;
  hovered.value = false;
  if (!keyboardInside.value) collapse();
  else if (cursorBy.value === "pointer") cursor.value = -1;
}

// Touch at rest: the whole strip is one target that opens the peek. (A
// tap in the peek is the bars' to handle, even one that just closed it.)
function onClick() {
  if (openAtPress || open.value || !touchUI.value) return;
  open.value = true;
}

function onFocusIn() {
  // Focus we moved after a collapse (Escape on the map button).
  if (quietFocus) {
    quietFocus = false;
    keyboardInside.value = true;
    return;
  }
  // A click on the map button focuses it too; hover already has that.
  if (pressedJustNow()) return;
  keyboardInside.value = true;
  open.value = true;
  if (cursor.value < 0 && total.value) {
    cursor.value = currentIndex.value;
    cursorBy.value = "key";
  }
}

function onFocusOut(e) {
  if (rootEl.value?.contains(e.relatedTarget)) return;
  keyboardInside.value = false;
  if (!hovered.value) collapse();
}

function onEscape(e) {
  if (!open.value) return;
  e.preventDefault();
  const slider = barsRef.value?.$el;
  const active = document.activeElement;
  collapse();
  // The map button hides with the peek: keep focus on something visible.
  if (active !== slider && rootEl.value?.contains(active)) {
    quietFocus = true;
    slider?.focus();
  }
}

/* ---- Bars ------------------------------------------------------------ */

function onHover(hit) {
  if (hit) {
    cursor.value = hit.index;
    cursorBy.value = "pointer";
    if (!open.value) open.value = true;
  } else if (cursorBy.value === "pointer") {
    cursor.value = -1;
  }
}

function jump(index, { pointer = false } = {}) {
  if (index < 0 || index >= total.value) return;
  holdValue();
  // The host moves focus to the item, so a keyboard jump folds the dock
  // (focusout); a mouse still over it keeps it open.
  emit("jump", index, { pointer });
  // On touch the dock is in the way of the page it just moved.
  if (touchUI.value && !keyboardInside.value) collapse();
}

function onSliderKeydown(e) {
  const n = total.value;
  if (!n) return;
  const from = cursor.value >= 0 ? cursor.value : currentIndex.value;
  const si = sectionIndexOf(sections.value, from);
  let next = null;
  switch (e.key) {
    case "ArrowRight":
    case "ArrowUp":
      next = cursor.value < 0 ? from : from + 1;
      break;
    case "ArrowLeft":
    case "ArrowDown":
      next = cursor.value < 0 ? from : from - 1;
      break;
    case "PageDown":
      next = sections.value[si + 1]?.start ?? n - 1;
      break;
    case "PageUp": {
      const start = sections.value[si]?.start ?? 0;
      next = from > start ? start : (sections.value[si - 1]?.start ?? 0);
      break;
    }
    case "Home":
      next = 0;
      break;
    case "End":
      next = n - 1;
      break;
    case "Enter":
      e.preventDefault();
      jump(from);
      return;
    default:
      return;
  }
  e.preventDefault();
  open.value = true;
  cursor.value = Math.min(n - 1, Math.max(0, next));
  cursorBy.value = "key";
  announcement.value = summary(cursor.value);
}

/* ---- Map ------------------------------------------------------------- */

function openMap() {
  mapOpen.value = true;
}

// Fold the dock all the way: no peek, no cursor, nothing held open.
function fold() {
  hovered.value = false;
  keyboardInside.value = false;
  collapse();
}

// From the keyboard, focus goes back to the map button, which only shows in
// the peek. A click or tap folds the dock instead: the button hides with the
// peek, and a peek nobody asked for would sit over the page (with a preview
// of the bar being read) until the next click. Focus goes to the dock itself
// (tabindex -1), so it isn't left on <body>: not to the slider, which would
// take the page's scroll keys and, after a keyboard-opened map, paint its
// ring. A focus this close to a press doesn't peek.
async function closeMap({ pointer = false } = {}) {
  mapOpen.value = false;
  if (pointer) {
    fold();
    pointerDownAt = performance.now();
    rootEl.value?.focus({ preventScroll: true });
    return;
  }
  open.value = true;
  keyboardInside.value = true;
  await nextTick();
  mapButton.value?.focus();
}

// The host moves focus to where the jump lands, so nothing comes back here:
// the dock folds rather than preview the place the reader just left.
function onMapJump(target, how) {
  mapOpen.value = false;
  fold();
  holdValue();
  emit("jump", target, how);
}

// The map's code didn't load (a tab left open across a deploy, or offline):
// let go of the button rather than leave it pressed with nothing open, and
// the tap-outside fold off. Vue forgets a failed load, so the next click
// tries again.
onErrorCaptured((err, instance) => {
  if (instance?.$?.type !== TimelineMap) return;
  mapOpen.value = false;
  console.warn("[chapter timeline] the chapter map didn't load", err);
  return false;
});

/* ---- Touch: fold away on a tap outside or a scroll ------------------- */

function onDocumentPointerDown(e) {
  if (mapOpen.value || rootEl.value?.contains(e.target)) return;
  collapse();
}

watch(
  () => open.value && touchUI.value,
  (listen) => {
    if (listen) {
      openedAtY = window.scrollY;
      document.addEventListener("pointerdown", onDocumentPointerDown, true);
    } else
      document.removeEventListener("pointerdown", onDocumentPointerDown, true);
  }
);

// The host's position moves with every scroll; no listener of our own.
watch(
  () => props.position,
  () => {
    if (!open.value || !touchUI.value || keyboardInside.value) return;
    if (Math.abs(window.scrollY - openedAtY) > SCROLL_FOLD) collapse();
  }
);

watch(
  () => props.hidden,
  (hidden) => {
    if (!hidden) return;
    collapse();
    mapOpen.value = false;
  }
);

// A chapter switch can leave the cursor past the end.
watch(total, (n) => {
  if (cursor.value >= n) collapse();
});

/* ---- Layout contract ------------------------------------------------ */

onMounted(() => {
  document.documentElement.style.setProperty(
    "--reader-timeline-h",
    `${REST_H}px`
  );
});

onBeforeUnmount(() => {
  document.documentElement.style.removeProperty("--reader-timeline-h");
  document.removeEventListener("pointerdown", onDocumentPointerDown, true);
  releaseValue();
});
</script>

<template>
  <div
    v-show="!hidden"
    ref="rootEl"
    class="ctl"
    tabindex="-1"
    :class="{ 'is-open': open, 'is-touch': touchUI }"
    :style="{
      height: `${open ? PEEK_H : REST_H}px`,
      '--tl-peek-h': `${PEEK_H}px`,
    }"
    data-testid="chapter-timeline"
    @pointerdown.capture="onPointerDown"
    @pointerenter="onPointerEnter"
    @pointerleave="onPointerLeave"
    @click="onClick"
    @focusin="onFocusIn"
    @focusout="onFocusOut"
    @keydown.esc="onEscape"
  >
    <TimelineBars
      ref="barsRef"
      class="ctl-bars"
      :style="{ left: `${BARS_LEFT}px`, right: `${BARS_RIGHT}px` }"
      :model="model"
      :position="position"
      :bar-height="open ? PEEK_BAR : REST_BAR"
      :expanded="open"
      :cursor="open ? cursor : -1"
      :layers="layers"
      :interactive="open || !touchUI"
      role="slider"
      tabindex="0"
      aria-label="Chapter timeline"
      aria-orientation="horizontal"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-valuenow="ariaNow"
      :aria-valuetext="ariaText"
      @mousedown.prevent
      @keydown="onSliderKeydown"
      @hover="onHover"
      @pick="jump($event.index, { pointer: true })"
    />

    <span class="ctl-percent" aria-hidden="true">{{ percent }}%</span>

    <button
      ref="mapButton"
      type="button"
      class="ctl-map-button"
      :tabindex="open ? 0 : -1"
      aria-label="Open chapter map"
      aria-haspopup="dialog"
      :aria-expanded="mapOpen ? 'true' : 'false'"
      title="Chapter map"
      @click="openMap"
    >
      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
        <path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4" />
      </svg>
    </button>

    <TimelinePreview
      v-if="previewItem"
      :item="previewItem"
      :section="sectionOf(cursor)"
      :subsection="subsectionOf(cursor)"
      :highlights="layer('highlights', cursor)"
      :notes="layer('notes', cursor)"
      :trending="layer('trending', cursor)"
      :x="previewX"
      :touch="touchUI"
      @go="jump(cursor, { pointer: pressedJustNow() })"
    />

    <p class="sr-only" aria-live="polite">{{ announcement }}</p>

    <Teleport to="body">
      <TimelineMap
        v-if="mapOpen"
        :model="model"
        :position="position"
        :read-percent="readPercent"
        :layers="layers"
        :chapter-title="chapterTitle"
        :touch="touchUI"
        @close="closeMap"
        @jump="onMapJump"
      />
    </Teleport>
  </div>
</template>

<style scoped>
/* The played part is the chapter colour; the global accent (magenta) only
   where no chapter ramp is set (helper/chapterTheme sets data-chapter when
   it knows the module's subject). */
/* Focusable only from script (tabindex -1, after a pointer closes the map). */
.ctl:focus {
  outline: none;
}

.ctl {
  --tl-accent: var(--color-accent);
  --tl-accent-deep: var(--color-accent);

  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  /* At rest: over the reader's text and stage layers (≤ 70), under a
     full-screen inline figure (100), the reader sidebar (190) and the nav
     drawer (300). */
  z-index: 95;
  background: rgb(var(--color-paper));
  border-top: 1px solid rgb(var(--color-line));
  color: rgb(var(--color-ink));
  font-family: var(--font-ui);
  transition:
    height 180ms cubic-bezier(0.2, 0.7, 0.3, 1),
    box-shadow 180ms ease;
}

[data-chapter] .ctl {
  --tl-accent: var(--color-chapter);
  --tl-accent-deep: var(--color-chapter-deep);
}

/* Open, its preview card reaches up over the reader sidebar's panel (190),
   which would otherwise hide the card for bars under it. Still under the
   creator's edit bar (200), the map (250), the nav drawer (300) and the
   lightboxes and toolbars above them. */
.ctl.is-open {
  z-index: 191;
  box-shadow: 0 -12px 32px -18px rgb(var(--color-ink) / 0.35);
}

.ctl-bars {
  position: absolute;
  bottom: 4px;
}

.ctl-bars:focus {
  outline: none;
}

.ctl-bars:focus-visible {
  outline: 3px solid rgb(var(--color-accent));
  outline-offset: 2px;
}

/* At rest the % sits level with the bars; in the peek it moves up over
   the map button. */
.ctl-percent {
  position: absolute;
  right: 16px;
  bottom: 4px;
  font-family: var(--font-mono);
  font-size: var(--ui-size-10);
  line-height: 12px;
  letter-spacing: 0.04em;
  font-variant-numeric: tabular-nums;
  color: rgb(var(--color-mute));
  pointer-events: none;
}

.ctl.is-open .ctl-percent {
  bottom: auto;
  top: 6px;
  color: rgb(var(--color-ink));
}

.ctl-map-button {
  position: absolute;
  right: 10px;
  bottom: 34px;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  padding: 0;
  border: 1px solid rgb(var(--color-line));
  border-radius: var(--radius-control);
  background: rgb(var(--color-paper));
  color: rgb(var(--color-ink));
  cursor: pointer;
  visibility: hidden;
  opacity: 0;
  transition:
    opacity 140ms ease,
    border-color 120ms ease,
    visibility 0s linear 140ms;
}

.ctl.is-open .ctl-map-button {
  visibility: visible;
  opacity: 1;
  transition:
    opacity 140ms ease 60ms,
    border-color 120ms ease;
}

.ctl-map-button:hover {
  border-color: rgb(var(--color-ink));
}

.ctl-map-button:focus-visible {
  outline: 3px solid rgb(var(--color-accent));
  outline-offset: 2px;
}

.ctl-map-button svg {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.4;
  stroke-linecap: square;
}
</style>
