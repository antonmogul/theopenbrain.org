<script setup>
/*
 * The artwork inside the figure shell (OPENBRAIN-41, gallery OPENBRAIN-97).
 *
 * One image renders on its own, as large as the shell allows. A set renders
 * as a gallery: every image at once as a grid of thumbnails, and selecting
 * one opens a full-viewport viewer (dark stage, the image as large as fits,
 * its caption, a counter, prev/next, a filmstrip). The viewer is Teleported
 * to <body> so the pinned pane's overflow and z-index layers cannot clip it.
 *
 * The grid has two sizing modes:
 *  - `fit` (the pinned desktop pane, the shell's own fullscreen overlay): the
 *    container has a fixed height, so the column count is the one that makes
 *    the thumbnails largest while all of them fit; below a readable size it
 *    falls back to a scrolling grid.
 *  - flow (inline in the text column below 1024px): the grid takes the height
 *    it needs; the column count only depends on the width.
 * Both balance the rows, so four images read 2 x 2 or 4 x 1, never 3 + 1.
 */
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  useId,
  watch,
} from "vue";
import { stepIndex } from "@/helper/figureCycle";

const props = defineProps({
  /* Normalised by figureImages(): [{ src, caption, alt }]. */
  images: { type: Array, required: true },
  /* Figure-level caption, shown when an image has none of its own. */
  caption: { type: String, default: "" },
  /* "FIG 06" and the figure title, for accessible names. */
  label: { type: String, default: "" },
  title: { type: String, default: "" },
  /* Fullscreen overlay: roomier caption and thumbnails. */
  large: { type: Boolean, default: false },
  /* The container has a fixed height: size the gallery grid to fit it. */
  fit: { type: Boolean, default: true },
});

/* A caption this short sits under its thumbnail; longer ones are for the
   viewer only (Figure 6's legends run to 900 characters). */
const SHORT_CAPTION = 48;
const GAP_PX = 12;
/* Thumbnail label row (number + short caption) plus its gap, in px. */
const LABEL_PX = 22;

const isSet = computed(() => props.images.length > 1);
const first = computed(() => props.images[0] || {});
const figureName = computed(
  () => [props.label, props.title].filter(Boolean).join(": ") || "Figure"
);

function captionFor(img) {
  return img?.caption || props.caption;
}
/* The viewer (and the single image) describe the artwork itself. */
function altFor(img) {
  return img?.alt || captionFor(img) || figureName.value;
}
/* A thumbnail's alt stays short: long legends belong to the viewer. */
function thumbAlt(img, i) {
  const n = `image ${i + 1} of ${props.images.length}`;
  return img?.alt ? `${img.alt} (${n})` : `${figureName.value}, ${n}`;
}
function shortCaption(img) {
  const text = img?.caption || "";
  return text && text.length <= SHORT_CAPTION ? text : "";
}
const pad = (i) => String(i + 1).padStart(2, "0");

/* ── Gallery grid sizing ─────────────────────────────────────────────── */
const root = ref(null);
const scroller = ref(null);
const foot = ref(null);
const box = ref({ w: 0, h: 0 });
let resizeObserver = null;

const minCell = computed(() => (props.large ? 132 : 96));
/* Inline, a big set (Figure 6's ten plates) goes three across on a phone
   rather than running five rows deep. */
const flowCell = computed(() =>
  props.large ? 200 : props.images.length > 6 ? 96 : 128
);

/* Fewest rows for a column cap, then as few columns as those rows need. */
function balanced(n, maxCols) {
  const cols = Math.max(1, Math.min(n, maxCols));
  const rows = Math.ceil(n / cols);
  return Math.ceil(n / rows);
}

const layout = computed(() => {
  const n = props.images.length;
  const { w, h } = box.value;
  if (!isSet.value || !w) return null;
  const maxByWidth = Math.floor((w + GAP_PX) / (minCell.value + GAP_PX));
  if (props.fit && h) {
    const options = [];
    for (let cols = 1; cols <= n; cols++) {
      const rows = Math.ceil(n / cols);
      // Skip lopsided grids: if these rows fit in fewer columns, 4 images
      // on 3 columns would read 3 + 1.
      if (Math.ceil(n / rows) !== cols) continue;
      const byW = (w - (cols - 1) * GAP_PX) / cols;
      const byH = (h - (rows - 1) * GAP_PX) / rows - LABEL_PX;
      options.push({ cols, cell: Math.floor(Math.min(byW, byH)) });
    }
    // The largest thumbnails win; when another layout is nearly as large,
    // take the one with more columns, so a wide box is not left half empty.
    const top = Math.max(...options.map((o) => o.cell));
    const best = options.filter((o) => o.cell >= top * 0.92).pop();
    if (best && best.cell >= minCell.value) return best;
    // Too many to fit at a readable size: a scrolling grid of minimum cells.
    const cols = balanced(n, maxByWidth);
    return { cols, cell: null };
  }
  const cols = balanced(
    n,
    Math.floor((w + GAP_PX) / (flowCell.value + GAP_PX))
  );
  return { cols, cell: null };
});

const gridStyle = computed(() => {
  const l = layout.value;
  if (!l) return undefined;
  return l.cell
    ? { gridTemplateColumns: `repeat(${l.cols}, ${l.cell}px)` }
    : { gridTemplateColumns: `repeat(${l.cols}, minmax(0, 1fr))` };
});

/* The height the grid may use is what the (fixed-height) root leaves after
   the caption, not the scroller's own height: the scroller shrinks to the
   grid so the caption sits right under it, and measuring it would feed the
   grid's size back into itself. */
function measure() {
  const el = scroller.value;
  if (!el) return;
  let h = 0;
  if (props.fit && root.value) {
    const gap = parseFloat(getComputedStyle(root.value).rowGap) || 0;
    h = root.value.clientHeight - (foot.value?.offsetHeight || 0) - gap;
  }
  box.value = { w: el.clientWidth, h: Math.max(0, h) };
}

/* ── Viewer ─────────────────────────────────────────────────────────── */
const uid = useId();
const titleId = `figview-title-${uid}`;
const viewerOpen = ref(false);
const index = ref(0);
const dialog = ref(null);
const closeBtn = ref(null);
const strip = ref(null);
const thumbs = ref([]);
let opener = null;
let lockedStyles = null;

const current = computed(() => props.images[index.value] || first.value);
const currentCaption = computed(() => captionFor(current.value));

function lockScroll() {
  if (lockedStyles || typeof document === "undefined") return;
  const html = document.documentElement;
  lockedStyles = [html.style.overflow, document.body.style.overflow];
  html.style.overflow = "hidden";
  document.body.style.overflow = "hidden";
}
function unlockScroll() {
  if (!lockedStyles) return;
  document.documentElement.style.overflow = lockedStyles[0];
  document.body.style.overflow = lockedStyles[1];
  lockedStyles = null;
}

function open(i) {
  index.value = i;
  opener = thumbs.value[i] || null;
  viewerOpen.value = true;
  lockScroll();
  document.addEventListener("keydown", onViewerKeydown, true);
  nextTick(() => {
    closeBtn.value?.focus();
    revealStripThumb();
  });
}
function close({ restoreFocus = true } = {}) {
  if (!viewerOpen.value) return;
  viewerOpen.value = false;
  unlockScroll();
  document.removeEventListener("keydown", onViewerKeydown, true);
  if (restoreFocus) opener?.focus?.();
  opener = null;
}
function go(direction) {
  index.value = stepIndex(index.value, props.images.length, direction);
}
function show(i) {
  index.value = i;
}

function focusables() {
  if (!dialog.value) return [];
  return [...dialog.value.querySelectorAll("button:not([disabled])")];
}
/* Capture phase on document, so the viewer owns these keys wherever focus
   is, and the shell's own Esc-to-exit-fullscreen does not also fire. */
function onViewerKeydown(e) {
  if (e.key === "Escape") {
    e.preventDefault();
    e.stopPropagation();
    close();
  } else if (e.key === "ArrowRight") {
    e.preventDefault();
    e.stopPropagation();
    go(1);
  } else if (e.key === "ArrowLeft") {
    e.preventDefault();
    e.stopPropagation();
    go(-1);
  } else if (e.key === "Tab") {
    const items = focusables();
    if (!items.length) return;
    const firstEl = items[0];
    const lastEl = items[items.length - 1];
    const active = document.activeElement;
    const inside = dialog.value?.contains(active);
    if (e.shiftKey && (!inside || active === firstEl)) {
      e.preventDefault();
      lastEl.focus();
    } else if (!e.shiftKey && (!inside || active === lastEl)) {
      e.preventDefault();
      firstEl.focus();
    }
  }
}

/* Swipe left/right on the stage (touch or pen; a mouse drag is not a swipe). */
let swipe = null;
function onPointerDown(e) {
  if (e.pointerType === "mouse") return;
  swipe = { x: e.clientX, y: e.clientY };
}
function onPointerUp(e) {
  if (!swipe) return;
  const dx = e.clientX - swipe.x;
  const dy = e.clientY - swipe.y;
  swipe = null;
  if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.5) {
    go(dx < 0 ? 1 : -1);
  }
}
function onPointerCancel() {
  swipe = null;
}

function revealStripThumb() {
  const el = strip.value?.children?.[index.value];
  el?.scrollIntoView?.({ block: "nearest", inline: "center" });
}

/* Warm the neighbours so stepping never lands on a blank frame. */
function preloadNeighbours() {
  if (!viewerOpen.value || typeof Image === "undefined") return;
  for (const d of [1, -1]) {
    const img = props.images[stepIndex(index.value, props.images.length, d)];
    if (img?.src) new Image().src = img.src;
  }
}

watch(index, () => {
  preloadNeighbours();
  nextTick(revealStripThumb);
});
/* A different figure reusing this instance starts closed, from the top. */
watch(
  () => props.images,
  () => {
    close({ restoreFocus: false });
    index.value = 0;
    nextTick(measure);
  }
);
watch(
  () => props.fit,
  () => nextTick(measure)
);

onMounted(() => {
  measure();
  if (typeof ResizeObserver !== "undefined" && scroller.value) {
    resizeObserver = new ResizeObserver(measure);
    for (const el of [root.value, scroller.value, foot.value])
      if (el) resizeObserver.observe(el);
  }
});
onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  close({ restoreFocus: false });
});
</script>

<template>
  <!-- One image: as large as the shell allows, with its caption. -->
  <div v-if="!isSet" class="figimg" :class="{ 'figimg--large': large }">
    <div class="figimg-stage">
      <img
        :key="first.src"
        class="figimg-img"
        :src="first.src"
        :alt="altFor(first)"
        decoding="async"
        draggable="false"
      />
    </div>
    <p v-if="captionFor(first)" class="figimg-caption">
      {{ captionFor(first) }}
    </p>
  </div>

  <!-- A set: the gallery grid, and the viewer it opens. -->
  <div
    v-else
    ref="root"
    class="figimg figimg--gallery"
    :class="{ 'figimg--large': large, 'figimg--fit': fit }"
    role="group"
    :aria-label="figureName"
  >
    <div ref="scroller" class="figimg-scroller">
      <ul
        class="figimg-grid"
        :class="{ 'is-sized': layout && layout.cell }"
        :style="gridStyle"
      >
        <li v-for="(img, i) in images" :key="img.src + i">
          <button
            :ref="(el) => (thumbs[i] = el)"
            type="button"
            class="figimg-thumb"
            aria-haspopup="dialog"
            @click="open(i)"
          >
            <span class="figimg-mat">
              <img
                class="figimg-thumb-img"
                :src="img.src"
                :alt="thumbAlt(img, i)"
                decoding="async"
                draggable="false"
              />
            </span>
            <span class="figimg-thumb-label" aria-hidden="true">
              <span class="figimg-thumb-num">{{ pad(i) }}</span>
              <span v-if="shortCaption(img)" class="figimg-thumb-cap">
                {{ shortCaption(img) }}
              </span>
            </span>
          </button>
        </li>
      </ul>
    </div>

    <div ref="foot" class="figimg-foot">
      <p class="figimg-hint">
        {{ images.length }} images <span aria-hidden="true">·</span> select one
        to enlarge
      </p>
      <p v-if="caption" class="figimg-caption">{{ caption }}</p>
    </div>

    <Teleport to="body">
      <transition name="figview">
        <div
          v-if="viewerOpen"
          ref="dialog"
          class="figview"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="titleId"
        >
          <header class="figview-bar">
            <p :id="titleId" class="figview-title">
              <span v-if="label" class="figview-label">{{ label }}</span>
              <span class="figview-name">{{ title || "Figure" }}</span>
            </p>
            <span class="figview-count" aria-live="polite" aria-atomic="true">
              {{ index + 1 }} / {{ images.length }}
            </span>
            <button
              ref="closeBtn"
              type="button"
              class="figview-btn figview-close"
              aria-label="Close viewer"
              title="Close (Esc)"
              @click="close()"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                aria-hidden="true"
              >
                <path d="M3 3l10 10M13 3L3 13" />
              </svg>
            </button>
          </header>

          <div
            class="figview-stage"
            @pointerdown="onPointerDown"
            @pointerup="onPointerUp"
            @pointercancel="onPointerCancel"
            @click.self="close()"
          >
            <transition name="figview-fade" mode="out-in">
              <img
                :key="current.src + index"
                class="figview-img"
                :src="current.src"
                :alt="altFor(current)"
                decoding="async"
                draggable="false"
              />
            </transition>
            <button
              type="button"
              class="figview-btn figview-nav figview-nav--prev"
              aria-label="Previous image"
              @click="go(-1)"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M11 3L5 9l6 6" />
              </svg>
            </button>
            <button
              type="button"
              class="figview-btn figview-nav figview-nav--next"
              aria-label="Next image"
              @click="go(1)"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M7 3l6 6-6 6" />
              </svg>
            </button>
          </div>

          <p v-if="currentCaption" class="figview-caption">
            {{ currentCaption }}
          </p>

          <div ref="strip" class="figview-strip">
            <button
              v-for="(img, i) in images"
              :key="img.src + i"
              type="button"
              class="figview-strip-thumb"
              :class="{ 'is-current': i === index }"
              :aria-current="i === index ? 'true' : undefined"
              :aria-label="`Show image ${i + 1} of ${images.length}`"
              @click="show(i)"
            >
              <img :src="img.src" alt="" decoding="async" draggable="false" />
            </button>
          </div>
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<style scoped>
.figimg {
  width: 100%;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* ── Single image ──────────────────────────────────────────────────────
   The image takes whatever height the caption leaves. It fills the stage
   absolutely so it can never size the layout (a 1500px-tall plate used to
   stretch the whole shell wherever an ancestor's height was not definite),
   and scale-down means large plates fit while small woodcuts stay at their
   natural size instead of being blown up. The floor keeps the stage from
   collapsing in a container with no fixed height. */
.figimg-stage {
  position: relative;
  flex: 1;
  min-height: 16rem;
}
.figimg-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: scale-down;
  user-select: none;
}
.figimg-caption {
  flex: none;
  margin: 0 auto;
  max-width: 62ch;
  font-family: var(--font-body);
  font-size: 0.8125rem;
  line-height: 1.45;
  color: rgb(var(--color-mute));
  text-align: left;
}
.figimg--large .figimg-caption {
  font-size: 0.9375rem;
  max-width: 78ch;
}

/* ── Gallery ─────────────────────────────────────────────────────────── */
.figimg--gallery {
  gap: 1rem;
}
/* Fixed-height container: grid and caption sit together, centred in the
   height; the grid is sized to what the caption leaves and scrolls only if
   the set cannot fit at a readable size. */
.figimg--fit {
  justify-content: center;
}
.figimg--fit .figimg-scroller {
  flex: 0 1 auto;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
}
.figimg-grid {
  list-style: none;
  margin: 0;
  padding: 0;
  width: 100%;
  display: grid;
  gap: 12px;
  /* Until the grid has been measured (and in tests). */
  grid-template-columns: repeat(auto-fill, minmax(8rem, 1fr));
}
.figimg-grid.is-sized {
  justify-content: start;
}
.figimg-grid > li {
  min-width: 0;
}
.figimg-thumb {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
  padding: 0;
  border: 0;
  background: none;
  text-align: left;
  cursor: zoom-in;
  color: inherit;
  font: inherit;
}
.figimg-mat {
  position: relative;
  display: block;
  width: 100%;
  aspect-ratio: 1;
  padding: 10px;
  background: rgb(var(--color-bg));
  border: 1px solid rgb(var(--color-line));
  border-radius: var(--radius-control);
  overflow: hidden;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}
/* Contain, not cover: these are engravings and manuscript pages, and a crop
   would cut off the lettering and the plate's edges. The warm mat reads as
   the page they sit on. */
.figimg-thumb-img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  user-select: none;
  transition: transform 0.25s ease;
}
.figimg-thumb:hover .figimg-mat {
  border-color: rgb(var(--color-chapter, var(--color-accent)) / 0.7);
  box-shadow: 0 1px 0 rgb(var(--color-ink) / 0.04);
}
.figimg-thumb:hover .figimg-thumb-img {
  transform: scale(1.03);
}
.figimg-thumb:focus-visible {
  outline: none;
}
.figimg-thumb:focus-visible .figimg-mat {
  border-color: rgb(var(--color-chapter, var(--color-accent)));
  box-shadow: 0 0 0 2px rgb(var(--color-chapter, var(--color-accent)) / 0.35);
}
.figimg-thumb-label {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  min-width: 0;
  height: 16px;
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  line-height: 16px;
  color: rgb(var(--color-mute));
}
.figimg-thumb-num {
  flex: none;
  letter-spacing: 0.08em;
  font-variant-numeric: tabular-nums;
}
.figimg-thumb:hover .figimg-thumb-num,
.figimg-thumb:focus-visible .figimg-thumb-num {
  color: rgb(var(--color-chapter-deep, var(--color-accent)));
}
.figimg-thumb-cap {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: var(--font-body);
  font-size: 0.75rem;
  color: rgb(var(--color-ink) / 0.8);
}
.figimg-foot {
  flex: none;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.figimg-hint {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgb(var(--color-mute));
}
.figimg--gallery .figimg-caption {
  margin: 0;
}

/* ── Viewer ────────────────────────────────────────────────────────────
   Always dark, whatever the reader theme: a lightbox is a darkroom. The
   surface is the chapter opener's; text on it is white at set strengths. */
.figview {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  /* minmax(0, 1fr): the bar's nowrap title must not widen the column past
     the viewport. */
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: auto minmax(0, 1fr) auto auto;
  background: rgb(var(--color-dark-surface));
  color: rgb(255 255 255 / 0.92);
  font-family: var(--font-mono);
  overscroll-behavior: contain;
}
.figview-bar {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem 0.75rem 1.25rem;
  border-bottom: 1px solid rgb(255 255 255 / 0.1);
}
.figview-title {
  flex: 1;
  min-width: 0;
  margin: 0;
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
  font-size: 0.71875rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.figview-label {
  flex: none;
  color: rgb(var(--color-chapter-soft, var(--color-accent)));
  letter-spacing: 0.12em;
}
.figview-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.figview-count {
  flex: none;
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  font-variant-numeric: tabular-nums;
  color: rgb(255 255 255 / 0.65);
}
.figview-btn {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  flex: none;
  padding: 0;
  border: 1px solid rgb(255 255 255 / 0.18);
  border-radius: 999px;
  background: rgb(var(--color-dark-surface) / 0.6);
  color: rgb(255 255 255 / 0.92);
  cursor: pointer;
  transition:
    background 0.15s ease,
    border-color 0.15s ease;
}
.figview-btn:hover {
  background: rgb(255 255 255 / 0.12);
  border-color: rgb(255 255 255 / 0.4);
}
.figview-btn:focus-visible,
.figview-strip-thumb:focus-visible {
  outline: 2px solid rgb(var(--color-chapter-soft, var(--color-accent)));
  outline-offset: 2px;
}
.figview-close {
  width: 40px;
  height: 40px;
}

.figview-stage {
  position: relative;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem 5rem;
  touch-action: pan-y pinch-zoom;
}
.figview-img {
  display: block;
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
  user-select: none;
  box-shadow: 0 12px 40px rgb(0 0 0 / 0.45);
}
.figview-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 48px;
  height: 48px;
}
.figview-nav--prev {
  left: 1rem;
}
.figview-nav--next {
  right: 1rem;
}

.figview-caption {
  margin: 0 auto;
  width: 100%;
  max-width: 72ch;
  max-height: 22vh;
  overflow-y: auto;
  padding: 0 1.25rem 0.75rem;
  font-family: var(--font-body);
  font-size: 0.875rem;
  line-height: 1.5;
  color: rgb(255 255 255 / 0.78);
}

.figview-strip {
  display: flex;
  justify-content: safe center;
  gap: 8px;
  padding: 0.75rem 1rem calc(0.75rem + env(safe-area-inset-bottom, 0px));
  overflow-x: auto;
  border-top: 1px solid rgb(255 255 255 / 0.1);
  scrollbar-width: thin;
}
.figview-strip-thumb {
  flex: none;
  width: 64px;
  height: 64px;
  padding: 4px;
  border: 1px solid rgb(255 255 255 / 0.14);
  border-radius: var(--radius-control);
  background: rgb(255 255 255 / 0.04);
  cursor: pointer;
  opacity: 0.55;
  transition:
    opacity 0.15s ease,
    border-color 0.15s ease;
}
.figview-strip-thumb img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.figview-strip-thumb:hover {
  opacity: 0.85;
}
.figview-strip-thumb.is-current {
  opacity: 1;
  border-color: rgb(var(--color-chapter, var(--color-accent)));
  box-shadow: 0 0 0 1px rgb(var(--color-chapter, var(--color-accent)));
}

@media (max-width: 767px) {
  .figview-bar {
    padding: 0.5rem 0.5rem 0.5rem 1rem;
    gap: 0.75rem;
  }
  /* Prev/next drop below the image, where thumbs reach them, instead of
     covering its edges on a narrow screen. */
  .figview-stage {
    padding: 0.75rem 0.75rem 4.25rem;
  }
  .figview-nav {
    top: auto;
    bottom: 0.75rem;
    transform: none;
    width: 44px;
    height: 44px;
  }
  .figview-nav--prev {
    left: 0.75rem;
  }
  .figview-nav--next {
    right: 0.75rem;
  }
  .figview-caption {
    font-size: 0.8125rem;
    max-height: 18vh;
  }
  .figview-strip-thumb {
    width: 52px;
    height: 52px;
  }
}

/* Transitions: short fades; none at all under reduced motion (the
   [data-reduce-motion="1"] opt-in is zeroed globally in brand.css). */
.figview-enter-active,
.figview-leave-active {
  transition: opacity 0.18s ease;
}
.figview-enter-from,
.figview-leave-to {
  opacity: 0;
}
.figview-fade-enter-active,
.figview-fade-leave-active {
  transition: opacity 0.16s ease;
}
.figview-fade-enter-from,
.figview-fade-leave-to {
  opacity: 0;
}
@media (prefers-reduced-motion: reduce) {
  .figview-enter-active,
  .figview-leave-active,
  .figview-fade-enter-active,
  .figview-fade-leave-active,
  .figimg-thumb-img,
  .figimg-mat {
    transition: none;
  }
  .figimg-thumb:hover .figimg-thumb-img {
    transform: none;
  }
}
</style>
