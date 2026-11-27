<script setup>
/*
 * ReadingRail (OPENBRAIN-175): the marks on the line between the figure pane
 * and the text, from 1024px (helper/readingRail.js has the idea and the
 * rules). It sits in TextComp's #container, before the reading point
 * (`.reading-line`, TextComp's own element, still switched on and off by its
 * ScrollTrigger), and draws two layers on the divider:
 *
 * - `.rr-spans`: the ribbon of the figure that is on, under the reading point,
 * - `.rr-marks`: a button per figure, over the reading point: a pointer
 *   towards the pane with no words (OPENBRAIN-195), filled while its figure
 *   is on, in the chapter's colour for a figure to look at and in the
 *   interaction accent for one to operate (a square rather than a round
 *   mark too, so the difference is not colour alone). A hover or keyboard
 *   focus brings up its name.
 *
 * When a figure comes on its mark is at the reading point, and it swells a
 * little as it fills (CSS, on `[data-showing]`), staying that size while
 * its figure is in the pane. Maura, 25 Nov (OPENBRAIN-91): "the ripple
 * effect could be replaced with a more subtle interaction, like the center
 * increasing in size". It replaced a ring that left the reading point and a
 * beam that ran into the pane.
 * OPENBRAIN-101: the arrow now stays at that point for its ribbon's window,
 * handing over when the next figure comes on. Only the arrows follow the
 * sketch's 85ms exponential easing; the page and figure timing are unchanged.
 *
 * It measures the pane's own triggers and never decides what shows:
 * IllustrationsComp sets `.active` on a trigger while its figure is on, and
 * the last active trigger in reading order is the figure in the pane. A
 * figure's span is figureEnd's, the function the pane's ScrollTrigger ends
 * with, so the ribbon is as long as the figure stays.
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

import { useAnimations } from "@/composables/useAnimations";
import { useMediaQuery } from "@/composables/useMediaQuery";
import { READER_WIDE_QUERY } from "@/helper/readerLayout";
import {
  FIGURE_BANDS,
  figureEnd,
  figureRecordFor,
  figureWait,
} from "@/helper/historyFigureTiming";
import { jumpToElement, reducedMotionPreferred } from "@/helper/readerJump";
import {
  cutSpan,
  railMarkFor,
  showingIndex,
  stepMark,
} from "@/helper/readingRail";

const props = defineProps({
  /** The figure records, for stories and tests; the reader fetches them. */
  records: { type: Array, default: null },
});

const root = ref(null);
const landing = ref(null);
const wide = useMediaQuery(READER_WIDE_QUERY);
const { animations, fetchAnimations } = useAnimations();
const list = computed(() => props.records || animations.value);

/** One per figure: { key, id, el, els, top, end, wait, kind, interactive,
 *  tip, name, stacked }
 *  (`top` is the line on which the figure comes on: `wait` below its
 *  paragraph's top; `id` is the trigger's, which a figure shown twice shares; `key` is the
 *  mark's own). */
const marks = ref([]);
/** [top, bottom] of each full-width band, in the rail's own pixels. */
const bands = ref([]);
/** The key of the mark whose figure is in the pane, or null. */
const showing = ref(null);
/** The key of the mark the keyboard is on (the rail is one tab stop). */
const focused = ref(null);

// Every pane trigger in this reader, marked or not: which one shows is
// decided among all of them.
let triggers = [];
let classObserver = null;
let layoutObserver = null;
let domObserver = null;
let measureTimer = null;
let unmounted = false;
const settle = [];
let arrowFrame = null;
let arrowTime = null;
let motionObserver = null;
let motionQuery = null;
const arrowPositions = new Map();

/* Maura's sketch eases its scroll with 1 - exp(-dt / 85), stopping within
   0.15px. Here that easing belongs only to the arrows. Store viewport
   positions, rather than easing a scroll offset: an arrow already at the
   reading point then stays perfectly still while the prose scrolls. */
function drawArrows(now) {
  arrowFrame = null;
  if (!root.value || !wide.value || unmounted) return;
  const origin = root.value.getBoundingClientRect().top;
  const half = window.innerHeight / 2;
  const reduced = reducedMotionPreferred();
  const dt = Math.min(64, arrowTime === null ? 16 : now - arrowTime);
  const ease = reduced ? 1 : 1 - Math.exp(-dt / 85);
  let moving = false;
  const buttons = root.value.querySelectorAll(".rr-mark");
  visible.value.forEach((mark, index) => {
    const button = buttons[index];
    if (!button) return;
    const active = mark.key === showing.value;
    const natural = origin + mark.top;
    const previous = arrowPositions.get(mark.key);
    // The outgoing arrow leaves above the viewport as the incoming arrow
    // takes its place. It never traverses the entire earlier paragraph on
    // a fast jump. Reverse scrolling brings its ordinary mark back.
    const leaving = natural < -30 && (previous?.active || previous?.leaving);
    const target = active
      ? Math.max(natural, Math.min(half, origin + mark.end))
      : leaving
        ? -30
        : natural;
    let y = previous ? previous.y + (target - previous.y) * ease : target;
    if (Math.abs(target - y) < 0.15 || reduced) y = target;
    else moving = true;
    button.style.translate = `0 ${y - natural}px`;
    arrowPositions.set(mark.key, { y, active, leaving });
  });
  arrowTime = moving ? now : null;
  if (moving) arrowFrame = requestAnimationFrame(drawArrows);
}

function moveArrows() {
  if (arrowFrame === null && !unmounted)
    arrowFrame = requestAnimationFrame(drawArrows);
}

const visible = computed(() => marks.value.filter((mark) => !mark.stacked));
const current = computed(
  () => marks.value.find((mark) => mark.key === showing.value) || null
);
const pieces = computed(() =>
  current.value
    ? cutSpan(current.value.top, current.value.end, bands.value)
    : []
);
const tabStop = computed(() => {
  const keys = visible.value.map((mark) => mark.key);
  if (keys.includes(focused.value)) return focused.value;
  if (keys.includes(showing.value)) return showing.value;
  return keys[0] ?? null;
});

function reader() {
  return root.value?.closest(".chapter-reader") || document;
}

function readShowing() {
  const at = showingIndex(
    triggers.map((trigger) => trigger.classList.contains("active"))
  );
  const on = at < 0 ? null : triggers[at];
  showing.value =
    (on && marks.value.find((mark) => mark.els.includes(on))?.key) || null;
  moveArrows();
}

/* The figure records, once and only when there is a figure to name (a
   phone, or a chapter with no pane figures, asks for nothing). It is the
   pane's own request, cached and shared; when the rows arrive `list`
   changes and the rail measures again. */
let asked = false;
async function askForRecords() {
  if (asked || props.records) return;
  asked = true;
  try {
    await fetchAnimations();
  } catch (err) {
    console.warn("ReadingRail: using the JSON fallback:", err);
  }
}

function measure() {
  if (unmounted) return;
  classObserver?.disconnect();
  if (!root.value || !wide.value) {
    triggers = [];
    marks.value = [];
    bands.value = [];
    showing.value = null;
    arrowPositions.clear();
    return;
  }
  const scope = reader();
  const origin = root.value.getBoundingClientRect().top;
  const half = window.innerHeight / 2;
  // The pane's own list (IllustrationsComp's readerTriggers): a breakout
  // box draws its figures in itself.
  triggers = [...scope.querySelectorAll(".animationTrigger[id]")]
    .filter((trigger) => /^trigger/i.test(trigger.id))
    .filter((trigger) => !trigger.closest("[data-breakout-box]"));
  if (triggers.length) askForRecords();
  bands.value = [...scope.querySelectorAll(FIGURE_BANDS)].map((band) => {
    const rect = band.getBoundingClientRect();
    return [rect.top - origin, rect.bottom - origin];
  });
  // The line is the text column's left edge and ends with it: a figure may
  // stay on past the column (the closing figure, beside what follows the
  // text), its ribbon does not.
  const column = scope.querySelector?.("#text")?.getBoundingClientRect();
  const limit = column?.height > 0 ? column.bottom - origin : Infinity;
  const found = [];
  for (const el of triggers) {
    const mark = railMarkFor(
      figureRecordFor(el.id.replace(/^trigger/i, ""), list.value)
    );
    if (!mark) continue;
    const rect = el.getBoundingClientRect();
    // A scroll position when the figure holds, else "bottom <half>": its
    // paragraph's window.
    const end = figureEnd(el, triggers, list.value);
    // Where the pane is clear for it: its paragraph's top, or further down
    // when a box above still covers the pane (figureWait). The mark is
    // drawn on that line, so it fills as it meets the reading point and
    // not a third of a screen after passing it (OPENBRAIN-73). A paragraph
    // that carries on the figure before it never waits (OPENBRAIN-76).
    const wait = figureWait(el, window, end, triggers, list.value);
    const top = rect.top - origin + wait;
    const bottom = Math.min(
      limit,
      (typeof end === "number" ? end + half - window.scrollY : rect.bottom) -
        origin
    );
    const before = found[found.length - 1];
    // The same figure on the paragraphs that follow (the Retina's widgets
    // stay beside several): one mark, one ribbon, as the pane never changes.
    if (before && before.id === el.id && top - before.end < 8) {
      before.els.push(el);
      before.end = Math.max(before.end, bottom);
      continue;
    }
    // A container's figure and its first paragraph's start on one line:
    // the paragraph's wins there, so only its mark is drawn.
    if (before && Math.abs(before.top - top) < 4) before.stacked = true;
    found.push({
      key: `${found.length}:${el.id}`,
      id: el.id,
      el,
      els: [el],
      top,
      end: bottom,
      // How far below its paragraph's top that line is.
      wait,
      stacked: false,
      ...mark,
    });
  }
  marks.value = found;
  const keys = new Set(found.map((mark) => mark.key));
  for (const key of arrowPositions.keys())
    if (!keys.has(key)) arrowPositions.delete(key);
  if (typeof MutationObserver === "function") {
    classObserver ||= new MutationObserver(readShowing);
    for (const trigger of triggers)
      classObserver.observe(trigger, {
        attributes: true,
        attributeFilter: ["class"],
      });
  }
  readShowing();
  nextTick(moveArrows);
}

// Fonts, images and stages keep moving the text after it mounts; every
// cause ends here, once.
function remeasure() {
  if (unmounted || measureTimer !== null) return;
  measureTimer = setTimeout(() => {
    measureTimer = null;
    measure();
  }, 60);
}

watch([wide, list], () => nextTick(measure));

/* Bring a figure's paragraph to the reading point, where its figure shows.
   The landing is a hair past the paragraph's top: a trigger whose top sits
   exactly on the reading line (a fraction of a pixel short, once the
   browser has rounded the scroll) has not fired yet; and a figure under a
   box waits for the box to leave the pane (figureWait). So the jump goes to
   an anchor of the rail's own, put there first. */
const LANDING_PAST_PX = 2;
function go(mark) {
  const anchor = landing.value;
  if (!anchor || !root.value) return;
  const top =
    mark.el.getBoundingClientRect().top -
    root.value.getBoundingClientRect().top;
  anchor.style.top = `${top + (mark.wait || 0) + LANDING_PAST_PX}px`;
  jumpToElement(anchor, { align: "reading-line" });
}

// The rail is one tab stop; the arrow keys walk the figures, each brought
// to the reading point as it takes focus, so focus is never off screen.
function onKey(event, index) {
  if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
  event.preventDefault();
  const to = stepMark(index, visible.value.length, event.key);
  const next = visible.value[to];
  if (!next || to === index) return;
  focused.value = next.key;
  nextTick(() => {
    root.value
      ?.querySelectorAll(".rr-mark")
      [to]?.focus({ preventScroll: true });
    go(next);
  });
}

onMounted(async () => {
  ScrollTrigger.addEventListener?.("refresh", remeasure);
  window.addEventListener("resize", remeasure);
  window.addEventListener("scroll", moveArrows, { passive: true });
  motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  motionQuery.addEventListener?.("change", moveArrows);
  if (typeof MutationObserver === "function") {
    motionObserver = new MutationObserver(moveArrows);
    motionObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-reduce-motion"],
    });
  }
  const scope = reader();
  const content = root.value?.parentElement;
  if (content && typeof ResizeObserver === "function") {
    layoutObserver = new ResizeObserver(remeasure);
    layoutObserver.observe(content);
  }
  const text = scope.querySelector?.("#text") || content;
  if (text && typeof MutationObserver === "function") {
    // A creator changing a paragraph's figure, or how long it stays: the
    // trigger is the paragraph's own span, so only its attributes change
    // (text that is added or removed resizes the content, above).
    domObserver = new MutationObserver(remeasure);
    domObserver.observe(text, {
      subtree: true,
      attributes: true,
      attributeFilter: ["id", "data-figure-hold", "data-figure-room"],
    });
  }
  for (const ms of [400, 1200, 2500]) settle.push(setTimeout(remeasure, ms));
  await nextTick();
  measure();
});

onBeforeUnmount(() => {
  unmounted = true;
  ScrollTrigger.removeEventListener?.("refresh", remeasure);
  window.removeEventListener("resize", remeasure);
  window.removeEventListener("scroll", moveArrows);
  motionQuery?.removeEventListener?.("change", moveArrows);
  motionObserver?.disconnect();
  if (arrowFrame !== null) cancelAnimationFrame(arrowFrame);
  arrowPositions.clear();
  classObserver?.disconnect();
  layoutObserver?.disconnect();
  domObserver?.disconnect();
  clearTimeout(measureTimer);
  for (const timer of settle.splice(0)) clearTimeout(timer);
});
</script>

<template>
  <div
    ref="root"
    class="reading-rail"
    :data-showing="showing ? current?.kind : null"
    :data-operable="current?.interactive ? '' : null"
  >
    <template v-if="wide">
      <div class="rr-spans" aria-hidden="true">
        <span
          v-for="(piece, index) in pieces"
          :key="`${showing}-${index}`"
          class="rr-span"
          :class="{ 'rr-span--foot': piece[1] === current.end }"
          :style="{ top: `${piece[0]}px`, height: `${piece[1] - piece[0]}px` }"
        />
      </div>
      <span ref="landing" class="rr-landing" aria-hidden="true" />
      <nav
        v-if="visible.length"
        class="rr-marks"
        aria-label="Figures beside the text"
      >
        <button
          v-for="(mark, index) in visible"
          :key="mark.key"
          type="button"
          class="rr-mark"
          :class="[
            `rr-mark--${mark.kind}`,
            { 'rr-mark--operable': mark.interactive },
          ]"
          :style="{ top: `${mark.top}px` }"
          :data-rail-mark="mark.id"
          :data-showing="mark.key === showing ? '' : null"
          :aria-label="mark.name"
          :aria-current="mark.key === showing ? 'true' : null"
          :tabindex="mark.key === tabStop ? 0 : -1"
          @click="go(mark)"
          @focus="focused = mark.key"
          @keydown="onKey($event, index)"
        >
          <span class="rr-pill">
            <svg
              class="rr-arrow"
              viewBox="0 0 5 8"
              width="5"
              height="8"
              aria-hidden="true"
            >
              <path d="M5 0v8L0 4z" fill="currentColor" />
            </svg>
          </span>
          <span class="rr-tip" aria-hidden="true">{{ mark.tip }}</span>
        </button>
      </nav>
    </template>
  </div>
</template>

<style scoped>
/* On the divider: the prose column's left edge, as the reading point and
   the column itself have it (--app-w minus --reader-prose-w). A box with no
   size and no stacking context of its own, so its two layers stack with
   the reading point (z 31) inside TextComp's #container. */
.reading-rail {
  position: absolute;
  top: 0;
  left: calc(var(--app-w, 100vw) - var(--reader-prose-w));
  width: 0;
  height: 0;
  pointer-events: none;
}

/* The ribbon: the line itself, thicker and in the chapter's colour, along
   the text its figure stays for. Under the reading point, which rides it. */
.rr-spans {
  position: absolute;
  inset: 0 auto auto 0;
  z-index: 31;
}
.rr-span {
  position: absolute;
  left: -1.5px;
  width: 3px;
  background: rgb(var(--color-chapter));
  transition: background-color 0.2s ease;
  transform-origin: top;
  animation: rr-unroll 0.45s cubic-bezier(0.2, 0.7, 0.2, 1) both;
}
/* A figure to operate: the ribbon in the interaction accent, as its mark. */
.reading-rail[data-operable] .rr-span {
  background: rgb(var(--color-accent));
}
/* Where the figure leaves: a short foot closes the bracket. */
.rr-span--foot::after {
  content: "";
  position: absolute;
  left: 0;
  bottom: 0;
  width: 0.625rem;
  height: 3px;
  background: inherit;
}
@keyframes rr-unroll {
  from {
    opacity: 0;
    clip-path: inset(0 0 100% 0);
  }
  to {
    opacity: 1;
    clip-path: inset(0 -1rem 0 0);
  }
}

/* Where a mark's jump lands (go()). */
.rr-landing {
  position: absolute;
  left: 0;
  width: 0;
  height: 0;
}

/* The marks: a small disc on the line where each figure comes on (the top
   of its paragraph, or lower when a box above it must first leave the
   pane), in the section badge's manner (paper, an ink
   hairline), with a pointer towards the pane and no words (Stuart, 11 Nov).

   The button is the strip of gutter beside the disc, not the disc: the
   disc sits half over the pane's edge, and a press there belongs to the
   pane (a gallery's "next" arrow sits on that edge). So the disc takes no
   pointer events and the button is as wide as the column's left gutter. */
.rr-marks {
  position: absolute;
  inset: 0 auto auto 0;
  z-index: 32;
}
.rr-mark {
  position: absolute;
  left: 0;
  /* Short of the text by the half rem an edited block's outline reaches. */
  width: calc(var(--reader-gutter-l) - 0.5rem);
  height: 2.125rem;
  transform: translateY(-50%);
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
  pointer-events: auto;
}
.rr-mark:focus-visible {
  outline: none;
}
.rr-mark[data-showing] {
  z-index: 1;
}
.rr-pill {
  position: absolute;
  left: 0;
  top: 50%;
  /* Centred on the line: half on the pane, half on the paper. */
  transform: translate(-50%, -50%);
  display: grid;
  place-items: center;
  width: 1.25rem;
  height: 1.25rem;
  border: 1px solid rgb(var(--color-ink));
  border-radius: 50%;
  background: rgb(var(--color-paper));
  color: rgb(var(--color-ink));
  pointer-events: none;
  /* `scale`, not `transform`: the translate above keeps the disc on the
     line. The curve runs a touch past the size and settles. */
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease,
    border-radius 0.2s ease,
    color 0.2s ease,
    scale 0.2s cubic-bezier(0.34, 1.5, 0.64, 1);
}
/* A figure to operate is a square mark: the second colour is not the only
   difference (a reader who can't tell violet from magenta, or a chapter
   whose own colour is close to the accent). */
.rr-mark--operable .rr-pill {
  border-radius: 0.25rem;
}
.rr-arrow {
  flex: none;
  /* The triangle's weight sits right of its box's centre. */
  margin-right: 1px;
}
.rr-mark:hover .rr-pill {
  border-color: rgb(var(--color-chapter-deep));
  color: rgb(var(--color-chapter-deep));
}
.rr-mark--operable:hover .rr-pill {
  border-color: rgb(var(--color-accent));
  color: rgb(var(--color-accent));
}
.rr-mark:focus-visible .rr-pill {
  outline: 2px solid rgb(var(--color-accent));
  outline-offset: 2px;
}
/* The figure in the pane now: the mark fills, in the chapter's colour for a
   figure to look at, and is a fifth larger (20px to 24px) for as long as
   its figure stays: it swells as it meets the reading point (OPENBRAIN-91). */
.rr-mark[data-showing] .rr-pill {
  border-color: rgb(var(--color-chapter-ground));
  background: rgb(var(--color-chapter-ground));
  color: rgb(var(--color-chapter-on));
  scale: 1.2;
}
/* …and in the interaction accent for one to operate. White on the magenta
   is 4.1:1; the accent stands 4.1:1 off the paper and 4.2:1 off the dark
   pane, the two grounds the mark straddles. */
.rr-mark--operable[data-showing] .rr-pill {
  border-color: rgb(var(--color-accent));
  background: rgb(var(--color-accent));
  color: #fff;
}

/* The mark's name, on a hover or keyboard focus: over the start of the
   text beside it, where the button is. Not announced (the button's name
   says the same). */
.rr-tip {
  position: absolute;
  left: 1.125rem;
  top: 50%;
  transform: translateY(-50%);
  width: max-content;
  max-width: min(20rem, var(--reader-prose-w) - 4rem);
  padding: 0.375rem 0.5rem;
  border-radius: var(--radius-control);
  background: rgb(var(--color-ink));
  color: rgb(var(--color-paper));
  font-family: var(--font-mono);
  font-size: var(--ui-size-11);
  font-weight: 400;
  line-height: 1.35;
  letter-spacing: 0.02em;
  text-align: left;
  white-space: normal;
  pointer-events: none;
  opacity: 0;
  visibility: hidden;
  transition:
    opacity 0.12s ease,
    visibility 0s linear 0.12s;
}
.rr-mark:hover .rr-tip,
.rr-mark:focus-visible .rr-tip {
  opacity: 1;
  visibility: visible;
  transition:
    opacity 0.12s ease 0.25s,
    visibility 0s linear 0.25s;
}
.rr-mark:focus-visible .rr-tip {
  transition-delay: 0s;
}

/* Reduced motion: no unrolling, no fades, and the mark keeps its size (it
   still fills). */
@media (prefers-reduced-motion: reduce) {
  :root:not([data-reduce-motion="0"]) .rr-span {
    animation: none;
  }
  :root:not([data-reduce-motion="0"]) .rr-pill,
  :root:not([data-reduce-motion="0"]) .rr-span,
  :root:not([data-reduce-motion="0"]) .rr-tip {
    transition: none;
  }
  :root:not([data-reduce-motion="0"]) .rr-mark[data-showing] .rr-pill {
    scale: 1;
  }
}
:root[data-reduce-motion="1"] .rr-mark[data-showing] .rr-pill {
  scale: 1;
}
:root[data-reduce-motion="1"] .rr-span {
  animation: none;
}
:root[data-reduce-motion="1"] .rr-pill,
:root[data-reduce-motion="1"] .rr-span,
:root[data-reduce-motion="1"] .rr-tip {
  transition: none;
}
</style>
