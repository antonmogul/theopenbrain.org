<script setup>
/*
 * The artwork inside the figure shell (OPENBRAIN-41; gallery OPENBRAIN-97,
 * rebuilt as a rotating gallery in OPENBRAIN-144, grid view OPENBRAIN-177).
 *
 * One image renders on its own, as large as the shell allows. A set renders
 * as a gallery with two views:
 *
 * - single, Stuart's "updating main image": one full-size image at a time in
 *   a stage box, a row of thumbnails under it (the current one in the
 *   chapter colour), previous/next arrows at the sides of the box;
 * - grid, "view all": every image at once, each a button that opens the
 *   single view on it. A gallery opens on the single view, on its first
 *   image (Anton, 11 Nov; galleryStartView in helper/figureCycle.js); a
 *   figure's row can ask for the grid.
 *
 * Under them, one row of controls: the counter, play/pause and the
 * view-all switch. The single view advances every 15 s on its own in a
 * gallery that opens on it: hovering or focusing it pauses the clock, any
 * manual step stops it, the play button starts it again (and then a hover
 * no longer holds it: the reader asked for it), and it never runs under
 * reduced motion, in the grid, while the gallery is off-screen or while the
 * tab is hidden.
 *
 * The arrows are centred on the stage box, not on the image, so they stay
 * put while plates of different heights go by (Stuart, 1 Oct). The box has
 * a fixed height in the pane and the fullscreen dialog (`fit`), and a fixed
 * aspect ratio inline in the text column (flow), for the same reason.
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
import {
  galleryStartView,
  gridColumns,
  stepIndex,
  youtubeLoopUrl,
} from "@/helper/figureCycle";
import VideoEmbed from "../text/VideoEmbed.vue";
import { reducedMotionPreferred } from "@/helper/readerJump";

const props = defineProps({
  /* Normalised by figureImages(): [{ src, caption, alt }]. */
  images: { type: Array, required: true },
  /* Figure-level caption, shown when an image has none of its own. */
  caption: { type: String, default: "" },
  /* "FIG 06" and the figure title, for accessible names. */
  label: { type: String, default: "" },
  title: { type: String, default: "" },
  /* Fullscreen overlay: roomier caption and arrows, and the arrow keys work
     from anywhere in the dialog. */
  large: { type: Boolean, default: false },
  /* The container has a fixed height: the stage takes what the thumbnails and
     legend leave. Off inline, where the stage is an aspect-ratio box. */
  fit: { type: Boolean, default: true },
  /* The shell shows the legend with the title, so the selected image's
     caption here is left out to avoid saying it twice. */
  legendAbove: { type: Boolean, default: false },
  /* Pause the background pane while its fullscreen viewer is open. */
  suspended: { type: Boolean, default: false },
  /* The figure's own say on the opening view ("grid" | "single"); empty
     leaves it to the size of the set. */
  start: { type: String, default: "" },
});

/* The shown image, two-way so the shell can open its fullscreen dialog on
   the same plate the pane is showing. */
const index = defineModel("index", { type: Number, default: 0 });
/* "grid" | "single", two-way for the same reason; empty until the reader
   chooses, which leaves the opening view to galleryStartView. */
const view = defineModel("view", { type: String, default: "" });

/* Stuart's "every 15s". */
const AUTO_ADVANCE_MS = 15_000;

const reducedMotion = ref(reducedMotionPreferred());
const isSet = computed(() => props.images.length > 1);
// A video item: a player the reader starts (play: "player"), or a silent
// loop in place of its still, unless the reader asked for reduced motion:
// then the still stays, with a link to the video.
const loopSrc = (img) => {
  if (!img?.youtube) return "";
  if (img.play === "player") return "";
  return reducedMotion.value ? "" : youtubeLoopUrl(img.youtube);
};
const watchHref = (img) =>
  img?.youtube ? `https://www.youtube.com/watch?v=${img.youtube}` : "";
const first = computed(() => props.images[0] || {});
const figureName = computed(
  () => [props.label, props.title].filter(Boolean).join(": ") || "Figure"
);

function captionFor(img) {
  return img?.caption || props.caption;
}
const shownCaption = computed(() =>
  props.legendAbove ? "" : captionFor(first.value)
);
/* The image describes the artwork itself. */
function altFor(img) {
  return img?.alt || captionFor(img) || figureName.value;
}

/* ── Gallery ─────────────────────────────────────────────────────────── */
const uid = useId();
const liveId = `figimg-live-${uid}`;
const root = ref(null);
const viewSwitch = ref(null);

const count = computed(() => props.images.length);
const safeIndex = computed(() => {
  const i = index.value;
  return Number.isInteger(i) && i >= 0 && i < count.value ? i : 0;
});
const current = computed(() => props.images[safeIndex.value] || first.value);

const startView = computed(() => galleryStartView(count.value, props.start));
const shownView = computed(() =>
  view.value === "grid" || view.value === "single"
    ? view.value
    : startView.value
);
const inGrid = computed(() => shownView.value === "grid");
const columns = computed(() => gridColumns(count.value));

/* The shell owns the selected legend; standalone and dialog viewers show it
   here: the shown image's, or in the grid the figure's own. */
const currentCaption = computed(() => {
  if (props.legendAbove) return "";
  return inGrid.value ? props.caption : captionFor(current.value);
});
/* What a screen reader hears on a change: "Image 3 of 10: Albertus…". */
const status = computed(() => {
  if (inGrid.value) return `All ${count.value} images`;
  const text = captionFor(current.value);
  const base = `Image ${safeIndex.value + 1} of ${count.value}`;
  return text ? `${base}: ${text}` : base;
});

/* "Image 3 of 10: Albertus Magnus, 1490." */
function thumbnailLabel(img, i) {
  const base = `Image ${i + 1} of ${count.value}`;
  const text = img?.caption || img?.alt || "";
  return text ? `${base}: ${text}` : base;
}
const tileNumber = (i) => String(i + 1).padStart(2, "0");

function go(direction) {
  index.value = stepIndex(safeIndex.value, count.value, direction);
}
function show(i) {
  index.value = i;
}
/* The reader took over: no more automatic steps. */
function goManual(direction) {
  stopAutoplay();
  go(direction);
}
function showManual(i) {
  stopAutoplay();
  show(i);
}

/* ── Grid ⇄ single ───────────────────────────────────────────────────── */
/* The view-all switch stays mounted in both views, so it is where focus
   goes when the tile that had it leaves. */
function focusSwitch() {
  viewSwitch.value?.focus?.({ preventScroll: true });
}
function toggleView() {
  if (inGrid.value) {
    view.value = "single";
  } else {
    stopAutoplay();
    view.value = "grid";
  }
}
/* A tile opens the single view on its image, growing from where the tile
   was (not under reduced motion). */
async function openFromGrid(i, event) {
  const from = event?.currentTarget?.getBoundingClientRect?.();
  const hadFocus = root.value?.contains(document.activeElement);
  stopAutoplay();
  show(i);
  view.value = "single";
  await nextTick();
  if (hadFocus) focusSwitch();
  growFrom(from);
}
function growFrom(from) {
  if (!from?.width || reducedMotionPreferred()) return;
  const slide = root.value?.querySelector(".figimg-slide");
  if (typeof slide?.animate !== "function") return;
  const to = slide.getBoundingClientRect();
  if (!to.width || !to.height) return;
  const scale = Math.min(from.width / to.width, from.height / to.height);
  const dx = from.left + from.width / 2 - (to.left + to.width / 2);
  const dy = from.top + from.height / 2 - (to.top + to.height / 2);
  slide.animate(
    [
      {
        transform: `translate(${dx}px, ${dy}px) scale(${scale})`,
        opacity: 0.4,
      },
      { transform: "none", opacity: 1 },
    ],
    { duration: 320, easing: "cubic-bezier(0.2, 0.7, 0.2, 1)" }
  );
}

/* ── Keys ────────────────────────────────────────────────────────────── */
/* Single view: left/right step. Grid: the arrows walk the tiles (up and
   down by a row), Home and End reach the ends; Enter opens, as a button. */
function tiles() {
  return [...(root.value?.querySelectorAll(".figimg-tile") || [])];
}
function gridKey(e) {
  const list = tiles();
  if (!list.length) return;
  const at = list.indexOf(document.activeElement);
  const top = list[0].offsetTop;
  const perRow = list.filter((t) => t.offsetTop === top).length || 1;
  const last = list.length - 1;
  let next = null;
  if (e.key === "ArrowRight") next = at < 0 ? safeIndex.value : at + 1;
  else if (e.key === "ArrowLeft") next = at < 0 ? safeIndex.value : at - 1;
  else if (at < 0) return;
  else if (e.key === "ArrowDown") next = at + perRow;
  else if (e.key === "ArrowUp") next = at - perRow;
  else if (e.key === "Home") next = 0;
  else if (e.key === "End") next = last;
  if (next === null) return;
  e.preventDefault();
  list[Math.min(Math.max(next, 0), last)]?.focus();
}
function onKeydown(e) {
  if (inGrid.value) {
    gridKey(e);
  } else if (e.key === "ArrowRight") {
    e.preventDefault();
    goManual(1);
  } else if (e.key === "ArrowLeft") {
    e.preventDefault();
    goManual(-1);
  }
}
/* In the pane the keys belong to the gallery only while it has focus. The
   dialog is all gallery, so there they work from anywhere in it (its close
   button has focus when it opens): one listener or the other, never both. */
function onRootKeydown(e) {
  if (!props.large) onKeydown(e);
}
function onWindowKeydown(e) {
  if (e.defaultPrevented || !root.value?.isConnected) return;
  if (e.target?.closest?.("input, textarea, select, [contenteditable]")) return;
  onKeydown(e);
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
    goManual(dx < 0 ? 1 : -1);
  }
}
function onPointerCancel() {
  swipe = null;
}

/* Warm the neighbours so stepping never lands on a blank frame. */
function preloadNeighbours() {
  if (!isSet.value || typeof Image === "undefined") return;
  for (const d of [1, -1]) {
    const img = props.images[stepIndex(safeIndex.value, count.value, d)];
    if (img?.src) new Image().src = img.src;
  }
}

/* ── Auto-advance ────────────────────────────────────────────────────── */
/* `autoplay` is the reader's standing: on from the start in a gallery that
   opens on the single view, off after a manual step, on again from the play
   button, and never under reduced motion. `asked` is the play button: a
   reader who pressed it is still hovering it, so hover and focus no longer
   hold the clock. The rest are pauses: the clock resumes when they lift. */
const autoplay = ref(!reducedMotionPreferred() && startView.value === "single");
const asked = ref(false);
const hovered = ref(false);
const focused = ref(false);
const inView = ref(true);
const pageVisible = ref(
  typeof document === "undefined" || document.visibilityState !== "hidden"
);
let timer = null;
let intersection = null;
let motionObserver = null;
let motionQuery = null;
function syncMotion() {
  reducedMotion.value = reducedMotionPreferred();
  if (reducedMotion.value) stopAutoplay();
}

const running = computed(
  () =>
    isSet.value &&
    autoplay.value &&
    !inGrid.value &&
    !props.suspended &&
    current.value?.play !== "player" &&
    (asked.value || (!hovered.value && !focused.value)) &&
    inView.value &&
    pageVisible.value
);
/* The play button is offered wherever the clock could run. */
const canPlay = computed(
  () =>
    !reducedMotion.value && (inGrid.value || current.value?.play !== "player")
);

function clearTimer() {
  if (timer) clearTimeout(timer);
  timer = null;
}
function schedule() {
  clearTimer();
  if (!running.value) return;
  timer = setTimeout(tick, AUTO_ADVANCE_MS);
}
function tick() {
  timer = null;
  if (!running.value) return;
  // The reader may have switched reduced motion on since the gallery
  // mounted: the setting wins at every step.
  if (reducedMotionPreferred()) {
    autoplay.value = false;
    return;
  }
  go(1);
  // A video the reader plays (the Milner interview in the H.M. gallery) is
  // where the clock stops: it would be rude to cut away from it. A silent
  // loop keeps rotating like a still.
  if (current.value?.play === "player") {
    autoplay.value = false;
    return;
  }
  schedule();
}
function stopAutoplay() {
  autoplay.value = false;
  asked.value = false;
  clearTimer();
}
/* Play from the grid turns to the single view first: that is where the
   images go by. */
function togglePlay() {
  if (autoplay.value) {
    stopAutoplay();
    return;
  }
  if (reducedMotionPreferred()) return;
  const hadFocus = root.value?.contains(document.activeElement);
  if (inGrid.value) view.value = "single";
  asked.value = true;
  autoplay.value = true;
  // The single view may open on a video the reader plays, which has no
  // play button of ours: focus must not be left on a button that went.
  nextTick(() => {
    if (hadFocus && !root.value?.contains(document.activeElement))
      focusSwitch();
  });
}
function onVisibility() {
  pageVisible.value = document.visibilityState !== "hidden";
}
function onFocusIn() {
  focused.value = true;
}
function onFocusOut(e) {
  if (!root.value?.contains(e.relatedTarget)) focused.value = false;
}

watch(running, schedule);
watch(index, () => {
  preloadNeighbours();
});
/* A different figure reusing this instance starts from the top, in its own
   opening view, with the clock as that view has it. */
watch(
  () => props.images,
  () => {
    index.value = 0;
    view.value = "";
    asked.value = false;
    autoplay.value = !reducedMotionPreferred() && startView.value === "single";
    schedule();
  }
);

onMounted(() => {
  motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  motionQuery.addEventListener?.("change", syncMotion);
  motionObserver = new MutationObserver(syncMotion);
  motionObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-reduce-motion"],
  });
  if (!isSet.value) return;
  document.addEventListener("visibilitychange", onVisibility);
  if (props.large) window.addEventListener("keydown", onWindowKeydown);
  if (typeof IntersectionObserver !== "undefined" && root.value) {
    intersection = new IntersectionObserver(
      ([entry]) => {
        inView.value = !!entry?.isIntersecting;
      },
      { threshold: 0.4 }
    );
    intersection.observe(root.value);
  }
  preloadNeighbours();
  schedule();
});
onBeforeUnmount(() => {
  clearTimer();
  intersection?.disconnect();
  motionObserver?.disconnect();
  motionQuery?.removeEventListener?.("change", syncMotion);
  document.removeEventListener("visibilitychange", onVisibility);
  window.removeEventListener("keydown", onWindowKeydown);
});
</script>

<template>
  <!-- One image: as large as the shell allows, with its caption. -->
  <div
    v-if="!isSet"
    class="figimg"
    :class="{ 'figimg--large': large, 'figimg--flow': !fit }"
  >
    <div class="figimg-stage">
      <VideoEmbed
        v-if="first.play === 'player'"
        :key="first.youtube"
        class="figimg-player"
        :video="{
          youtubeId: first.youtube,
          title: altFor(first),
          poster: first.src,
          start: first.start,
        }"
        :show-caption="false"
      />
      <iframe
        v-else-if="loopSrc(first)"
        :key="first.youtube"
        class="figimg-video"
        :src="loopSrc(first)"
        :title="altFor(first) || 'Video'"
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowfullscreen
        loading="lazy"
      />
      <img
        v-else
        :key="first.src"
        class="figimg-img"
        :src="first.src"
        :alt="altFor(first)"
        decoding="async"
        draggable="false"
      />
    </div>
    <p v-if="shownCaption" class="figimg-caption">
      {{ shownCaption }}
    </p>
    <a
      v-if="first.youtube && reducedMotion"
      class="figimg-watch"
      :href="watchHref(first)"
      target="_blank"
      rel="noopener"
      >Watch the video on YouTube ↗</a
    >
  </div>

  <!-- A set: the gallery, as a grid of all its images or one at a time. -->
  <div
    v-else
    ref="root"
    class="figimg figimg--gallery"
    :class="{
      'figimg--large': large,
      'figimg--fit': fit,
      'figimg--flow': !fit,
      'figimg--grid': inGrid,
    }"
    role="group"
    :aria-label="figureName"
    aria-roledescription="gallery"
    :data-autoplay="running ? 'running' : 'paused'"
    :data-view="shownView"
    @keydown="onRootKeydown"
    @pointerenter="hovered = true"
    @pointerleave="hovered = false"
    @focusin="onFocusIn"
    @focusout="onFocusOut"
  >
    <!-- View all: every image, each opening the single view on itself. -->
    <div
      v-if="inGrid"
      class="figimg-grid"
      role="group"
      aria-label="All images"
      :style="{ '--cols': columns.wide, '--cols-narrow': columns.narrow }"
    >
      <button
        v-for="(img, i) in images"
        :key="img.src + i"
        type="button"
        class="figimg-tile"
        :class="{ 'is-current': i === safeIndex }"
        :style="{ '--i': i }"
        :aria-label="thumbnailLabel(img, i)"
        @click="openFromGrid(i, $event)"
      >
        <img
          class="figimg-tile-image"
          :src="img.src"
          alt=""
          loading="lazy"
          decoding="async"
          draggable="false"
        />
        <span class="figimg-tile-n" aria-hidden="true">{{
          tileNumber(i)
        }}</span>
        <span v-if="img.youtube" class="figimg-tile-video" aria-hidden="true"
          >▶</span
        >
      </button>
    </div>

    <div
      v-else
      class="figimg-stage figimg-stage--gallery"
      @pointerdown="onPointerDown"
      @pointerup="onPointerUp"
      @pointercancel="onPointerCancel"
    >
      <!-- Crossfade: the leaving slide fades under the arriving one. -->
      <transition name="figimg-x">
        <div :key="current.src + safeIndex" class="figimg-slide">
          <VideoEmbed
            v-if="current.play === 'player'"
            class="figimg-player"
            :video="{
              youtubeId: current.youtube,
              title: altFor(current),
              poster: current.src,
              start: current.start,
            }"
            :show-caption="false"
          />
          <iframe
            v-else-if="loopSrc(current)"
            class="figimg-video figimg-gallery-video"
            :src="loopSrc(current)"
            :title="altFor(current) || 'Video'"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowfullscreen
          />
          <img
            v-else
            class="figimg-img figimg-gallery-img"
            :src="current.src"
            :alt="altFor(current)"
            decoding="async"
            draggable="false"
          />
        </div>
      </transition>
      <button
        type="button"
        class="figimg-nav figimg-nav--prev"
        aria-label="Previous image"
        @click="goManual(-1)"
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
        class="figimg-nav figimg-nav--next"
        aria-label="Next image"
        @click="goManual(1)"
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

    <div class="figimg-foot">
      <div
        v-if="!inGrid"
        class="figimg-thumbnails"
        role="group"
        aria-label="Choose an image"
      >
        <button
          v-for="(img, i) in images"
          :key="img.src + i"
          type="button"
          class="figimg-thumbnail"
          :class="{ 'is-current': i === safeIndex }"
          :aria-current="i === safeIndex ? 'true' : undefined"
          :aria-label="thumbnailLabel(img, i)"
          @click="showManual(i)"
        >
          <img
            class="figimg-thumbnail-image"
            :src="img.src"
            alt=""
            loading="lazy"
            draggable="false"
          />
          <span
            v-if="img.youtube"
            class="figimg-thumbnail-video"
            aria-hidden="true"
            >▶</span
          >
        </button>
      </div>

      <!-- The controls: the counter, play/pause, view all. -->
      <div class="figimg-bar">
        <p class="figimg-count">
          <span class="figimg-count-n">{{
            inGrid ? `${count} images` : `${safeIndex + 1} / ${count}`
          }}</span>
        </p>
        <div class="figimg-controls" role="group" aria-label="Gallery controls">
          <button
            v-if="canPlay"
            type="button"
            class="figimg-ctl figimg-play"
            :data-state="autoplay ? 'playing' : 'stopped'"
            :aria-label="autoplay ? 'Pause slideshow' : 'Play slideshow'"
            :title="autoplay ? 'Pause slideshow' : 'Play slideshow'"
            @click="togglePlay"
          >
            <svg
              v-if="autoplay"
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="currentColor"
              aria-hidden="true"
            >
              <rect x="2" y="1.5" width="3" height="9" />
              <rect x="7" y="1.5" width="3" height="9" />
            </svg>
            <svg
              v-else
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M3 1.5v9l7.5-4.5z" />
            </svg>
            <!-- The 15 s to the next image, drawn along the button's foot. -->
            <span
              v-if="running"
              :key="safeIndex"
              class="figimg-clock"
              aria-hidden="true"
            ></span>
          </button>
          <!-- On a video the reader plays there is nothing to play here:
               the button's place is kept, so view all does not move. -->
          <span
            v-else-if="!reducedMotion"
            class="figimg-ctl figimg-ctl--gap"
            aria-hidden="true"
          ></span>
          <button
            ref="viewSwitch"
            type="button"
            class="figimg-ctl figimg-all"
            aria-label="View all images"
            :aria-pressed="inGrid ? 'true' : 'false'"
            :title="inGrid ? 'Back to one image' : 'View all images'"
            @click="toggleView"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              stroke-width="1.4"
              aria-hidden="true"
            >
              <rect x="1.5" y="1.5" width="4" height="4" />
              <rect x="8.5" y="1.5" width="4" height="4" />
              <rect x="1.5" y="8.5" width="4" height="4" />
              <rect x="8.5" y="8.5" width="4" height="4" />
            </svg>
          </button>
        </div>
        <a
          v-if="!inGrid && current.youtube"
          class="figimg-watch"
          :href="watchHref(current)"
          target="_blank"
          rel="noopener"
          >Watch on YouTube ↗</a
        >
      </div>

      <!-- The legend, where the shell does not show it. In a fixed-height
           container the single view's row keeps its lines whether the image
           has a legend or not, so the stage and its arrows stay put. -->
      <p
        v-if="!legendAbove && (currentCaption || (fit && !inGrid))"
        class="figimg-caption figimg-legend"
      >
        {{ currentCaption }}
      </p>
      <p
        :id="liveId"
        class="sr-only"
        :aria-live="running ? 'off' : 'polite'"
        aria-atomic="true"
      >
        {{ status }}
      </p>
    </div>
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
  min-height: min(16rem, 30vh);
}
.figimg-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: scale-down;
  user-select: none;
}
/* In the text column (fit off): the image sizes the figure, full width,
   so on a phone it runs edge to edge. */
.figimg--flow .figimg-stage {
  flex: none;
  min-height: 0;
}
.figimg--flow .figimg-img {
  position: static;
  display: block;
  height: auto;
  max-height: 85vh;
  object-fit: contain;
}
.figimg-caption {
  flex: none;
  margin: 0 auto;
  max-width: 100%;
  font-family: var(--font-body);
  font-size: var(--ui-size-13);
  line-height: 1.45;
  color: rgb(var(--color-mute));
  text-align: left;
}
.figimg--large .figimg-caption {
  font-size: var(--ui-size-15);
  max-width: 100%;
}
.figimg-video {
  display: block;
  width: 100%;
  aspect-ratio: 16 / 9;
  height: auto;
  border: 0;
  background: #000;
}

/* ── Gallery ─────────────────────────────────────────────────────────── */
.figimg--gallery {
  gap: 0.75rem;
  outline: none;
}
/* The stage is a box of its own: fixed height in the pane and the dialog,
   where it takes what the foot leaves; a 4:3 box inline, capped to the
   viewport. The image fits inside it, so the box, and the arrows centred
   on it, never move with the image. */
.figimg-stage--gallery {
  overflow: hidden;
  touch-action: pan-y pinch-zoom;
}
.figimg--flow .figimg-stage--gallery {
  width: 100%;
  aspect-ratio: 4 / 3;
  max-height: 85vh;
}
.figimg-slide {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.figimg--gallery .figimg-gallery-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
}
/* The player fills the box and letterboxes the clip itself. */
.figimg-gallery-video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  aspect-ratio: auto;
}

/* Arrows: centred on the stage box, not on the image (Stuart, 1 Oct). */
.figimg-nav {
  position: absolute;
  top: 50%;
  z-index: 1;
  transform: translateY(-50%);
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  padding: 0;
  border: 1px solid rgb(var(--color-line));
  border-radius: 0;
  background: rgb(var(--color-paper) / 0.85);
  color: rgb(var(--color-ink));
  cursor: pointer;
  transition:
    background 0.15s ease,
    border-color 0.15s ease;
}
.figimg-nav--prev {
  left: 0.5rem;
}
.figimg-nav--next {
  right: 0.5rem;
}
.figimg-nav:hover {
  background: rgb(var(--color-paper));
  border-color: rgb(var(--color-chapter, var(--color-accent)));
  color: rgb(var(--color-chapter-deep, var(--color-accent)));
}
.figimg-nav:focus-visible,
.figimg-thumbnail:focus-visible,
.figimg-tile:focus-visible {
  outline: 2px solid rgb(var(--color-chapter, var(--color-accent)));
  outline-offset: 2px;
}
/* The dialog has room for bigger arrows; a phone's dialog does not, so
   there they stay the pane's size and cover less of the plate. */
@media (min-width: 768px) {
  .figimg--large .figimg-nav {
    width: 48px;
    height: 48px;
  }
  .figimg--large .figimg-nav--prev {
    left: 1rem;
  }
  .figimg--large .figimg-nav--next {
    right: 1rem;
  }
}

/* ── Grid: view all ──────────────────────────────────────────────────────
   In the pane and the dialog the grid takes the stage's place and its
   height, the rows sharing it, so every image is on screen at once; in the
   text column the tiles are squares and the grid is as tall as they make
   it. The chrome draws from the ink it is given (currentColor), so it
   reads on the dark pane, on paper and in a coloured breakout box alike. */
.figimg-grid {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(var(--cols, 4), minmax(0, 1fr));
  grid-auto-rows: minmax(0, 1fr);
  gap: 0.5rem;
  padding: 0 1rem;
}
.figimg--flow .figimg-grid {
  flex: none;
  grid-auto-rows: auto;
}
@media (max-width: 639px) {
  .figimg-grid {
    grid-template-columns: repeat(var(--cols-narrow, 3), minmax(0, 1fr));
  }
}
.figimg-tile {
  position: relative;
  min-width: 0;
  min-height: 0;
  padding: 0;
  border: 1px solid color-mix(in srgb, currentColor 16%, transparent);
  border-radius: 0;
  background: color-mix(in srgb, currentColor 5%, transparent);
  color: inherit;
  cursor: zoom-in;
  overflow: hidden;
  transition:
    border-color 0.15s ease,
    background 0.15s ease;
  animation: figimg-tile-in 0.28s cubic-bezier(0.2, 0.7, 0.2, 1) backwards;
  animation-delay: calc(var(--i, 0) * 22ms);
}
.figimg--flow .figimg-tile {
  aspect-ratio: 1;
}
.figimg-tile-image {
  position: absolute;
  inset: 0.375rem;
  width: calc(100% - 0.75rem);
  height: calc(100% - 0.75rem);
  object-fit: contain;
  transition: transform 0.2s ease;
}
.figimg-tile:hover,
.figimg-tile:focus-visible {
  border-color: rgb(var(--color-chapter, var(--color-accent)));
  background: color-mix(in srgb, currentColor 9%, transparent);
}
.figimg-tile:hover .figimg-tile-image {
  transform: scale(1.04);
}
/* The image's number, on a chip of its own so it reads over any plate; the
   one last looked at carries the chapter colour. */
.figimg-tile-n,
.figimg-tile-video {
  position: absolute;
  top: 0;
  padding: 0.125rem 0.3125rem;
  background: rgb(var(--color-dark-surface) / 0.78);
  color: #fff;
  font-family: var(--font-mono);
  font-size: var(--ui-size-10);
  line-height: 1.3;
  letter-spacing: 0.08em;
  font-variant-numeric: tabular-nums;
}
.figimg-tile-n {
  left: 0;
}
.figimg-tile-video {
  right: 0;
}
.figimg-tile.is-current .figimg-tile-n {
  background: rgb(var(--color-chapter, var(--color-accent)));
}
@keyframes figimg-tile-in {
  from {
    opacity: 0;
    transform: translateY(6px) scale(0.95);
  }
}

.figimg-foot {
  flex: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  /* The shell gives the artwork its whole area, edge to edge. */
  padding: 0 1rem 0.75rem;
}
/* A single row preserves artwork height; all thumbnails remain keyboard reachable. */
.figimg-thumbnails {
  display: flex;
  max-width: 100%;
  gap: 0.375rem;
  overflow-x: auto;
  padding: 0.25rem;
}
.figimg-thumbnail {
  position: relative;
  flex: 0 0 56px;
  width: 56px;
  height: 44px;
  padding: 3px;
  border: 2px solid transparent;
  border-radius: 0;
  background: rgb(var(--color-paper));
  cursor: pointer;
}
.figimg-thumbnail-image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.figimg-thumbnail:hover {
  border-color: rgb(var(--color-line));
}
.figimg-thumbnail.is-current {
  border-color: rgb(var(--color-chapter, var(--color-accent)));
  background: rgb(var(--color-chapter, var(--color-accent)) / 0.12);
}
.figimg-thumbnail-video {
  position: absolute;
  right: 2px;
  bottom: 2px;
  background: rgb(var(--color-paper));
  color: rgb(var(--color-ink));
  font-size: var(--ui-size-10);
}
.figimg-player {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  display: flex;
  align-items: center;
}
.figimg-player :deep(.ve-frame) {
  width: 100%;
  max-height: 100%;
}

/* The controls: counter, then play/pause and view all beside it. One row
   always: the link a video brings is cut short rather than wrapped, so the
   row is the same height on every image (OPENBRAIN-190). */
.figimg-bar {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.25rem 0.75rem;
}
.figimg-count {
  flex: none;
  margin: 0;
  /* Wide enough for "10 / 10" (seven characters and their spacing), so the
     controls beside it stay put: 4.5em was 3px short of it. */
  min-width: calc(7ch + 0.56em);
  font-family: var(--font-mono);
  font-size: var(--ui-size-11);
  letter-spacing: 0.08em;
  font-variant-numeric: tabular-nums;
  color: rgb(var(--color-mute));
}
.figimg-controls {
  flex: none;
  display: flex;
  align-items: center;
  gap: 0.375rem;
}
.figimg-ctl {
  position: relative;
  display: grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  padding: 0;
  border: 1px solid color-mix(in srgb, currentColor 28%, transparent);
  border-radius: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  overflow: hidden;
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;
}
.figimg-ctl:hover {
  border-color: currentColor;
  background: color-mix(in srgb, currentColor 8%, transparent);
}
.figimg-ctl:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 2px;
}
/* On: the slideshow is playing, the grid is showing. */
.figimg-play[data-state="playing"],
.figimg-all[aria-pressed="true"] {
  border-color: rgb(var(--color-chapter, var(--color-accent)));
  background: rgb(var(--color-chapter, var(--color-accent)) / 0.16);
}
/* A finger needs 44px. */
@media (pointer: coarse) {
  .figimg-ctl {
    width: 2.75rem;
    height: 2.75rem;
  }
}
.figimg-clock {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 2px;
  background: rgb(var(--color-chapter, var(--color-accent)));
  transform-origin: left;
  animation: figimg-clock 15s linear both;
}
@keyframes figimg-clock {
  from {
    transform: scaleX(0);
  }
}

.figimg-legend {
  width: 100%;
  margin: 0;
}
/* The dialog is not endless: a long legend (Figure 6's run to 900
   characters) scrolls within its lines rather than squeezing the stage. */
.figimg--fit .figimg-legend {
  --legend-lines: calc(var(--ui-size-13) * 1.45 * 3);
  height: var(--legend-lines);
  overflow-y: auto;
  overscroll-behavior: contain;
}
.figimg--large.figimg--fit .figimg-legend {
  --legend-lines: calc(var(--ui-size-15) * 1.45 * 4);
}
.figimg-watch {
  font-family: var(--font-ui);
  font-size: var(--ui-size-12);
  display: inline-block;
  margin-left: auto;
  color: inherit;
  text-underline-offset: 0.2em;
}
.figimg-bar .figimg-watch {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
/* The play button's place while there is nothing to play. */
.figimg-ctl--gap {
  visibility: hidden;
}

/* On the dark ground (.figure-pane--dark: the pane, OPENBRAIN-152, and the
   fullscreen dialog, OPENBRAIN-177) the gallery's chrome takes the pane's
   ink: bare arrows (the Figma draws them without a box), the thumbnails
   dimmed but the current one, the count and captions muted. */
.figure-pane--dark .figimg-caption,
.figure-pane--dark .figimg-count {
  color: rgb(var(--figure-pane-ink) / 0.62);
}
.figure-pane--dark .figimg-nav {
  border-color: transparent;
  background: transparent;
  color: rgb(var(--figure-pane-ink));
}
.figure-pane--dark .figimg-nav:hover {
  border-color: transparent;
  background: rgb(var(--figure-pane-ink) / 0.08);
  color: rgb(var(--color-chapter, var(--color-accent)));
}
.figure-pane--dark .figimg-thumbnail {
  background: transparent;
  opacity: 0.55;
}
.figure-pane--dark .figimg-thumbnail:hover {
  border-color: rgb(var(--figure-pane-ink) / 0.3);
  opacity: 1;
}
.figure-pane--dark .figimg-thumbnail.is-current {
  border-color: rgb(var(--color-chapter, var(--color-accent)));
  background: rgb(var(--color-chapter, var(--color-accent)) / 0.12);
  opacity: 1;
}
/* In the dialog a plate can run the whole width (a phone's always does),
   which puts the bare white arrows on white paper: there they sit on a
   chip of the ground. */
.figure-pane--dark .figimg--large .figimg-nav {
  background: rgb(var(--color-dark-surface) / 0.6);
}
.figure-pane--dark .figimg--large .figimg-nav:hover {
  background: rgb(var(--color-dark-surface) / 0.85);
}
/* In the dialog the legend is the pane's: mono, in the pane's ink. */
.figure-pane--dark .figimg--large .figimg-caption {
  font-family: var(--font-mono);
  font-size: var(--ui-size-12);
  line-height: 1.5;
  letter-spacing: 0.04em;
  color: rgb(var(--figure-pane-ink) / 0.86);
  /* A legend is read, not scanned: no line as long as a wide screen. */
  max-width: 62rem;
}
.figure-pane--dark .figimg--large.figimg--fit .figimg-legend {
  --legend-lines: calc(var(--ui-size-12) * 1.5 * 4);
}

/* Crossfade, ~300 ms; none at all under reduced motion (the
   [data-reduce-motion="1"] opt-in is zeroed globally in brand.css). */
.figimg-x-enter-active,
.figimg-x-leave-active {
  transition: opacity 0.3s ease;
}
.figimg-x-enter-from,
.figimg-x-leave-to {
  opacity: 0;
}
@media (prefers-reduced-motion: reduce) {
  .figimg-x-enter-active,
  .figimg-x-leave-active,
  .figimg-thumbnail-image,
  .figimg-tile-image,
  .figimg-nav,
  .figimg-ctl {
    transition: none;
  }
  .figimg-tile,
  .figimg-clock {
    animation: none;
  }
}
</style>
