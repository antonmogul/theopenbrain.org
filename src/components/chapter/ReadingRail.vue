<script setup>
/*
 * ReadingRail (OPENBRAIN-175): the marks on the line between the figure pane
 * and the text, from 1024px (helper/readingRail.js has the idea and the
 * rules). It sits in TextComp's #container, before the reading point
 * (`.reading-line`, TextComp's own element, still switched on and off by its
 * ScrollTrigger), and draws three layers on the divider:
 *
 * - `.rr-spans`: the ribbon of the figure that is on, under the reading point,
 * - `.rr-point`: the one-off pulse and beam at the reading point when the
 *   pane changes (Web Animations, never under reduced motion),
 * - `.rr-marks`: a button per figure, over the reading point.
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

// The pane's fallback when the animations fetch fails or is empty.
import animationJSON from "@/assets/json_backend/animations.json";
import { useAnimations } from "@/composables/useAnimations";
import { useMediaQuery } from "@/composables/useMediaQuery";
import { READER_WIDE_QUERY } from "@/helper/readerLayout";
import {
  FIGURE_BANDS,
  figureEnd,
  figureRecordFor,
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
const ring = ref(null);
const beam = ref(null);
const landing = ref(null);
const wide = useMediaQuery(READER_WIDE_QUERY);
const { animations, fetchAnimations } = useAnimations();
const list = computed(
  () =>
    props.records ||
    (animations.value?.length ? animations.value : animationJSON.animations)
);

/** One per figure: { key, id, el, els, top, end, kind, label, name, stacked }
 *  (`id` is the trigger's, which a figure shown twice shares; `key` is the
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
let armTimer = null;
let armed = false;
let unmounted = false;
let running = [];
const settle = [];

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
}

function measure() {
  if (unmounted) return;
  classObserver?.disconnect();
  if (!root.value || !wide.value) {
    triggers = [];
    marks.value = [];
    bands.value = [];
    showing.value = null;
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
    const top = rect.top - origin;
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
      stacked: false,
      ...mark,
    });
  }
  marks.value = found;
  if (typeof MutationObserver === "function") {
    classObserver ||= new MutationObserver(readShowing);
    for (const trigger of triggers)
      classObserver.observe(trigger, {
        attributes: true,
        attributeFilter: ["class"],
      });
  }
  readShowing();
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

/* One quiet motion when the pane changes: a ring leaves the reading point
   and a beam runs from it into the pane. Not while one is still running (a
   jump crosses many figures), not before the page has settled, and never
   under reduced motion. */
function pulse() {
  if (!armed || reducedMotionPreferred()) return;
  if (!reader().querySelector?.(".reading-line.is-on")) return;
  if (running.some((animation) => animation.playState === "running")) return;
  if (typeof ring.value?.animate !== "function") return;
  const timing = { duration: 620, easing: "cubic-bezier(0.2, 0.7, 0.2, 1)" };
  running = [
    ring.value.animate(
      [
        { transform: "translate(-50%, -50%) scale(1)", opacity: 0.9 },
        { transform: "translate(-50%, -50%) scale(3.4)", opacity: 0 },
      ],
      timing
    ),
    beam.value.animate(
      [
        { transform: "translateY(-50%) scaleX(0)", opacity: 1 },
        { transform: "translateY(-50%) scaleX(1)", opacity: 1, offset: 0.55 },
        { transform: "translateY(-50%) scaleX(1)", opacity: 0 },
      ],
      timing
    ),
  ];
}

watch(showing, (key) => {
  if (key) pulse();
});
watch([wide, list], () => nextTick(measure));

/* Bring a figure's paragraph to the reading point, where its figure shows.
   The landing is a hair past the paragraph's top: a trigger whose top sits
   exactly on the reading line (a fraction of a pixel short, once the
   browser has rounded the scroll) has not fired yet. So the jump goes to
   an anchor of the rail's own, put there first. */
const LANDING_PAST_PX = 2;
function go(mark) {
  const anchor = landing.value;
  if (!anchor || !root.value) return;
  const top =
    mark.el.getBoundingClientRect().top -
    root.value.getBoundingClientRect().top;
  anchor.style.top = `${top + LANDING_PAST_PX}px`;
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
  ScrollTrigger.addEventListener("refresh", remeasure);
  window.addEventListener("resize", remeasure);
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
  armTimer = setTimeout(() => (armed = true), 1500);
  if (!props.records) {
    try {
      await fetchAnimations();
    } catch (err) {
      console.warn("ReadingRail: using the JSON fallback:", err);
    }
  }
  await nextTick();
  measure();
});

onBeforeUnmount(() => {
  unmounted = true;
  ScrollTrigger.removeEventListener("refresh", remeasure);
  window.removeEventListener("resize", remeasure);
  classObserver?.disconnect();
  layoutObserver?.disconnect();
  domObserver?.disconnect();
  clearTimeout(measureTimer);
  clearTimeout(armTimer);
  for (const timer of settle.splice(0)) clearTimeout(timer);
  for (const animation of running.splice(0)) animation.cancel?.();
});
</script>

<template>
  <div
    ref="root"
    class="reading-rail"
    :data-showing="showing ? current?.kind : null"
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
      <div class="rr-point" aria-hidden="true">
        <span ref="ring" class="rr-ring" />
        <span ref="beam" class="rr-beam" />
      </div>
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
          :class="`rr-mark--${mark.kind}`"
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
            <span v-if="mark.label" class="rr-label">{{ mark.label }}</span>
          </span>
        </button>
      </nav>
    </template>
  </div>
</template>

<style scoped>
/* On the divider: the prose column's left edge, as the reading point and
   the column itself have it (--app-w minus --reader-prose-w). A box with no
   size and no stacking context of its own, so its three layers stack with
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
  transform-origin: top;
  animation: rr-unroll 0.45s cubic-bezier(0.2, 0.7, 0.2, 1) both;
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

/* The reading point's pulse: fixed at mid-screen on the line, like the dot
   it starts from. Nothing shows until the pane changes. */
.rr-point {
  position: fixed;
  z-index: 31;
  top: 50vh;
  left: calc(var(--app-w, 100vw) - var(--reader-prose-w));
  width: 0;
  height: 0;
}
.rr-ring {
  position: absolute;
  left: 0;
  top: 0;
  width: 0.875rem;
  height: 0.875rem;
  border: 1.5px solid rgb(var(--color-chapter));
  border-radius: 50%;
  transform: translate(-50%, -50%);
  opacity: 0;
}
.rr-beam {
  position: absolute;
  right: 0;
  top: 0;
  width: 5.5rem;
  height: 2px;
  background: linear-gradient(
    to left,
    rgb(var(--color-chapter)) 45%,
    rgb(var(--color-chapter) / 0)
  );
  transform: translateY(-50%) scaleX(0);
  transform-origin: right;
  opacity: 0;
}

/* The marks: a pill on the line at the top of each paragraph that brings a
   figure in, in the section badge's manner (paper, an ink hairline), with
   a pointer towards the pane.

   The button is the strip of gutter beside the pill, not the pill: the
   pill reaches over the pane's edge, and a press there belongs to the pane
   (a gallery's "next" arrow sits on that edge). So the pill takes no
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
.rr-pill {
  /* How far the pill leans over the pane: enough to clear the text, which
     starts a gutter away (3.125rem from 1280px, 2rem below). */
  --rr-lean: -36%;
  position: absolute;
  left: 0;
  top: 50%;
  transform: translate(var(--rr-lean), -50%);
  display: inline-flex;
  align-items: center;
  gap: 0.3125rem;
  height: 1.25rem;
  padding: 0 0.5rem 0 0.375rem;
  border: 1px solid rgb(var(--color-ink));
  border-radius: 999px;
  background: rgb(var(--color-paper));
  color: rgb(var(--color-ink));
  font-family: var(--font-mono);
  font-size: var(--ui-size-10);
  font-weight: 600;
  line-height: 1;
  letter-spacing: 0.08em;
  white-space: nowrap;
  pointer-events: none;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease;
}
.rr-mark--plain .rr-pill {
  padding: 0 0.4375rem;
}
.rr-arrow {
  flex: none;
}
.rr-mark:hover .rr-pill {
  border-color: rgb(var(--color-chapter-deep));
  color: rgb(var(--color-chapter-deep));
}
.rr-mark:focus-visible .rr-pill {
  outline: 2px solid rgb(var(--color-accent));
  outline-offset: 2px;
}
/* The figure in the pane now. */
.rr-mark[data-showing] .rr-pill {
  border-color: rgb(var(--color-chapter-ground));
  background: rgb(var(--color-chapter-ground));
  color: rgb(var(--color-chapter-on));
}
@media (max-width: 1279px) {
  .rr-pill {
    --rr-lean: -60%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .rr-span {
    animation: none;
  }
  .rr-pill {
    transition: none;
  }
}
:root[data-reduce-motion="1"] .rr-span {
  animation: none;
}
:root[data-reduce-motion="1"] .rr-pill {
  transition: none;
}
</style>
