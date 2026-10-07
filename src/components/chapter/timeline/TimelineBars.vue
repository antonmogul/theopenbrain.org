<script setup>
/*
 * TimelineBars — the chapter as bars (OPENBRAIN-128): one per paragraph,
 * widget or break, in reading order, as tall as the paragraph is long; the
 * part already read in the chapter colour, the bar being read filling from
 * the bottom. Widgets and breaks are full-height hatched blocks, objects
 * rather than text. The dock draws it small (ChapterTimeline), the map large
 * (TimelineMap), from the same model (helper/chapterTimeline.js).
 *
 * Expanded, it adds the section labels above the bars, a trending cap on
 * the bars other readers highlight most, and two lanes under them: what the
 * chapter shows there (widget ■, figure ●, video ▶, break ◆) and what this
 * reader left (highlights in their colour, notes ✎).
 *
 * SVG, not canvas (index.css fixes every <canvas>). The bars are a few paths
 * built once per layout; reading progress only moves two clip rects, so a
 * scroll re-renders almost nothing. The SVG stretches to the root's height
 * (preserveAspectRatio="none"), so when the host animates that height the
 * bars grow with it and land on whole pixels.
 *
 * It reports the pointer, not decisions: `hover` with the item under it (a
 * mouse; on touch, a drag scrubs and a tap selects), `pick` when the reader
 * commits (a click; on touch, a second tap on the selected bar). Keyboard
 * and ARIA belong to the host: its attributes fall through to the root.
 */
import { computed, onBeforeUnmount, onMounted, ref, useId, watch } from "vue";
import { layoutBars } from "@/helper/chapterTimeline";
import { HIGHLIGHT_HEX } from "@/composables/useHighlights";

const props = defineProps({
  /** buildTimeline() result. */
  model: { type: Object, required: true },
  /** The reading line as a fractional item index (0..items.length). */
  position: { type: Number, default: 0 },
  /** px, a full-height bar. */
  barHeight: { type: Number, default: 12 },
  /** Labels, trending caps and the two lanes. */
  expanded: { type: Boolean, default: false },
  /** Item index of the bar drawn in ink (pointer or keyboard), -1 for none. */
  cursor: { type: Number, default: -1 },
  /** useChapterTimeline layers: Maps of item index → entries. */
  layers: { type: Object, default: null },
  /** False: ignore the pointer (the host handles a tap itself). */
  interactive: { type: Boolean, default: true },
});

const emit = defineEmits(["hover", "pick"]);

// Expanded geometry, top to bottom (px): labels, room for trending caps,
// the bars, then the content lane and the "you" lane.
const LABEL_H = 14;
const CAP_ROOM = 4;
const LANE_GAP = 4;
const LANE_H = 10;
const LANE_SPACING = 2;
// Glyphs in a lane closer than this share one spot (the more telling wins).
const GLYPH_GAP = 7;
// A touch that moves less than this is a tap, not a scrub.
const TAP_SLOP = 6;
// Mono --ui-size-10: about 6.5px a character, plus breathing room.
const LABEL_CHAR_W = 6.5;
const LABEL_PAD = 6;
const MARK_RANK = { widget: 4, video: 3, break: 2, figure: 1, image: 1 };

const uid = `tl${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
const rootEl = ref(null);
const width = ref(0);

const items = computed(() => props.model?.items || []);
const sections = computed(() => props.model?.sections || []);
const layers = computed(() => props.layers || {});

/* ---- Layout -------------------------------------------------------- */

const layout = computed(() =>
  layoutBars(items.value, sections.value, width.value, props.model?.maxWords)
);
const bars = computed(() => layout.value.bars);

// Item index → index of the bar that draws it (bars can hold several).
const barOf = computed(() => {
  const out = new Array(items.value.length).fill(-1);
  bars.value.forEach((bar, b) => {
    for (let i = bar.from; i < bar.to; i++) out[i] = b;
  });
  return out;
});

const geom = computed(() => {
  const h = props.barHeight;
  if (!props.expanded) return { top: 0, base: h, total: h };
  const top = LABEL_H + CAP_ROOM;
  const base = top + h;
  const content = base + LANE_GAP + LANE_H / 2;
  const you = content + LANE_H + LANE_SPACING;
  return { top, base, content, you, total: you + LANE_H / 2 };
});

const px = (v) => Math.round(v * 100) / 100;

// A bar with 1px-rounded top corners.
function barPath(x, w, top, base) {
  const r = Math.min(1, w / 2, base - top);
  return (
    `M${px(x)} ${px(base)}V${px(top + r)}` +
    `Q${px(x)} ${px(top)} ${px(x + r)} ${px(top)}H${px(x + w - r)}` +
    `Q${px(x + w)} ${px(top)} ${px(x + w)} ${px(top + r)}V${px(base)}Z`
  );
}

const barTop = (bar) =>
  geom.value.base - Math.max(1, bar.height * props.barHeight);

// Blocks are outlined: inset half the 1px stroke so it stays in the bar.
function shapeOf(bar) {
  const { base } = geom.value;
  if (bar.kind !== "block") return barPath(bar.x, bar.w, barTop(bar), base);
  return barPath(bar.x + 0.5, bar.w - 1, barTop(bar) + 0.5, base);
}

const paths = computed(() => {
  let text = "";
  let block = "";
  for (const bar of bars.value) {
    if (bar.kind === "block") block += shapeOf(bar);
    else text += shapeOf(bar);
  }
  return { text, block };
});

/* ---- Progress and cursor ------------------------------------------- */

// Bars left of the bar being read are played (one clip rect); the bar being
// read fills from the bottom by how far into it the reading line is.
const progress = computed(() => {
  const n = items.value.length;
  if (!n || !bars.value.length) return { playX: 0, current: null };
  if (props.position >= n) return { playX: width.value, current: null };
  const i = Math.min(n - 1, Math.max(0, Math.floor(props.position || 0)));
  const bar = bars.value[barOf.value[i]];
  if (!bar) return { playX: 0, current: null };
  const fraction = Math.min(
    1,
    Math.max(0, (props.position - bar.from) / (bar.to - bar.from))
  );
  if (!fraction) return { playX: bar.x, current: null };
  const height = (geom.value.base - barTop(bar)) * fraction;
  return {
    playX: bar.x,
    current: {
      x: bar.x - 0.5,
      w: bar.w + 1,
      y: geom.value.base - height,
      h: height,
    },
  };
});

const cursorBar = computed(() => {
  if (props.cursor < 0) return null;
  const bar = bars.value[barOf.value[props.cursor]];
  return bar ? { kind: bar.kind, d: shapeOf(bar) } : null;
});

/** The x of an item's bar centre, from the root's left edge. */
function centerOf(index) {
  const bar = bars.value[barOf.value[index]];
  return bar ? bar.x + bar.w / 2 : 0;
}

/* ---- Expanded layers ------------------------------------------------ */

// Section labels over their first bar, once per section (a run a box
// interrupts is `continued`), skipped where one would overlap the last.
const labels = computed(() => {
  if (!props.expanded) return [];
  const runs = new Map(sections.value.map((s) => [s.start, s]));
  const cursorKey = items.value[props.cursor]?.sectionKey;
  const readingKey =
    items.value[
      Math.min(items.value.length - 1, Math.floor(props.position || 0))
    ]?.sectionKey;
  const out = [];
  let free = -Infinity;
  for (const bar of bars.value) {
    if (!bar.sectionStart) continue;
    const run = runs.get(bar.from);
    if (!run || run.continued || !run.label || bar.x < free) continue;
    out.push({
      key: `${run.key}:${run.start}`,
      text: run.label,
      x: bar.x,
      current: run.key === readingKey,
      cursor: run.key === cursorKey,
    });
    free = bar.x + run.label.length * LABEL_CHAR_W + LABEL_PAD;
  }
  return out;
});

const caps = computed(() => {
  const trending = layers.value.trending;
  if (!props.expanded || !trending?.size) return [];
  const out = [];
  let max = 0;
  for (const bar of bars.value) {
    let count = 0;
    for (let i = bar.from; i < bar.to; i++)
      for (const t of trending.get(i) || []) count += t.count || 0;
    if (!count) continue;
    max = Math.max(max, count);
    out.push({ x: bar.x, w: bar.w, y: barTop(bar) - 3, count });
  }
  // More readers, a stronger cap.
  return out.map((c) => ({ ...c, opacity: px(0.4 + (0.6 * c.count) / max) }));
});

function glyph(type, cx, cy) {
  if (type === "widget") return `M${px(cx - 2.5)} ${px(cy - 2.5)}h5v5h-5Z`;
  if (type === "video")
    return `M${px(cx - 2)} ${px(cy - 3)}L${px(cx + 3)} ${px(cy)}L${px(cx - 2)} ${px(cy + 3)}Z`;
  if (type === "break") return `M${px(cx)} ${px(cy - 3)}l3 3-3 3-3-3Z`;
  // figure / image: a dot
  return `M${px(cx - 2.5)} ${px(cy)}a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0Z`;
}

// The content lane: one glyph per bar, the most telling of its marks.
const contentPath = computed(() => {
  if (!props.expanded) return "";
  const spots = [];
  for (const bar of bars.value) {
    let best = null;
    for (let i = bar.from; i < bar.to; i++)
      for (const m of items.value[i].marks || [])
        if (MARK_RANK[m.type] > (MARK_RANK[best] || 0)) best = m.type;
    if (!best) continue;
    const cx = bar.x + bar.w / 2;
    const last = spots[spots.length - 1];
    if (last && cx - last.cx < GLYPH_GAP) {
      if (MARK_RANK[best] > MARK_RANK[last.type]) last.type = best;
      continue;
    }
    spots.push({ type: best, cx });
  }
  const cy = geom.value.content;
  return spots.map((s) => glyph(s.type, s.cx, cy)).join("");
});

const pencil = (cx, cy) => `M${px(cx - 3)} ${px(cy + 3)}l1-3 4-4 2 2-4 4Z`;

// The "you" lane: a dot in the first highlight's colour, a pencil for notes.
const yourMarks = computed(() => {
  const { highlights, notes } = layers.value;
  if (!props.expanded || !(highlights?.size || notes?.size))
    return { dots: [], notes: "" };
  const dots = new Map(); // colour → path
  let notePath = "";
  let free = -Infinity;
  const cy = geom.value.you;
  for (const bar of bars.value) {
    let color = null;
    let note = false;
    for (let i = bar.from; i < bar.to; i++) {
      color = color || highlights?.get(i)?.[0]?.color || null;
      note = note || !!notes?.get(i)?.length;
    }
    if (!color && !note) continue;
    const cx = bar.x + bar.w / 2;
    if (cx < free) continue;
    if (color) {
      const hex = HIGHLIGHT_HEX[color] || HIGHLIGHT_HEX.yellow;
      dots.set(hex, (dots.get(hex) || "") + glyph("figure", cx, cy));
    }
    if (note) notePath += pencil(color ? cx + 6 : cx, cy);
    free = cx + (color && note ? 6 : 0) + GLYPH_GAP;
  }
  return {
    dots: [...dots].map(([color, d]) => ({ color, d })),
    notes: notePath,
  };
});

/* ---- Width ---------------------------------------------------------- */

let observer = null;

function measure() {
  const el = rootEl.value;
  if (!el) return;
  const w = el.clientWidth || el.getBoundingClientRect().width || 0;
  if (Math.abs(w - width.value) >= 0.5) width.value = w;
}

onMounted(() => {
  measure();
  if (typeof ResizeObserver === "function") {
    observer = new ResizeObserver(measure);
    observer.observe(rootEl.value);
  } else window.addEventListener("resize", measure);
});

onBeforeUnmount(() => {
  observer?.disconnect();
  observer = null;
  window.removeEventListener("resize", measure);
});

/* ---- Pointer -------------------------------------------------------- */

let down = null; // the pointer that is down: { type, x, moved, cursor }
let lastHover;

function indexAt(e) {
  const left = rootEl.value?.getBoundingClientRect().left || 0;
  return layout.value.indexAtX(e.clientX - left);
}

function hover(index) {
  if (index === lastHover) return;
  lastHover = index;
  emit("hover", index < 0 ? null : { index, x: centerOf(index) });
}

const sameBar = (a, b) => a >= 0 && b >= 0 && barOf.value[a] === barOf.value[b];

function onPointerDown(e) {
  if (!props.interactive) return;
  down = {
    type: e.pointerType || "mouse",
    x: e.clientX,
    moved: false,
    cursor: props.cursor,
  };
}

function onPointerMove(e) {
  if (!props.interactive) return;
  if (e.pointerType !== "touch") {
    hover(indexAt(e));
    return;
  }
  // Touch: a drag across the bars scrubs the preview.
  if (!down) return;
  if (!down.moved && Math.abs(e.clientX - down.x) < TAP_SLOP) return;
  down.moved = true;
  hover(indexAt(e));
}

function onPointerCancel() {
  down = null;
}

function onPointerLeave(e) {
  if (e.pointerType === "touch") return;
  hover(-1);
}

function onClick(e) {
  if (!props.interactive) return;
  const index = indexAt(e);
  const press = down;
  down = null;
  if (index < 0) return;
  const type = press?.type || e.pointerType || "mouse";
  if (type !== "touch") {
    emit("pick", { index, x: centerOf(index) });
    return;
  }
  // Touch: the first tap selects, a second on the same bar commits; a
  // scrub already selected where it ended.
  if (press?.moved) return;
  if (sameBar(index, press ? press.cursor : props.cursor))
    emit("pick", { index, x: centerOf(index) });
  else {
    lastHover = undefined;
    hover(index);
  }
}

// A cursor the host moved (keyboard, a collapse) is where hover starts from.
watch(
  () => props.cursor,
  (c) => {
    if (c < 0) lastHover = undefined;
  }
);

defineExpose({ centerOf });
</script>

<template>
  <div
    ref="rootEl"
    class="tl-bars"
    :class="{ 'is-expanded': expanded, 'is-interactive': interactive }"
    :style="{ height: `${geom.total}px` }"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointercancel="onPointerCancel"
    @pointerleave="onPointerLeave"
    @click="onClick"
  >
    <div v-if="expanded" class="tl-labels" aria-hidden="true">
      <span
        v-for="label in labels"
        :key="label.key"
        class="tl-label"
        :class="{ 'is-current': label.current, 'is-cursor': label.cursor }"
        :style="{ left: `${label.x}px` }"
        >{{ label.text }}</span
      >
    </div>
    <svg
      class="tl-svg"
      :viewBox="`0 0 ${Math.max(1, width)} ${geom.total}`"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <pattern
          v-for="tone in ['rest', 'played', 'cursor']"
          :id="`${uid}-hatch-${tone}`"
          :key="tone"
          width="3"
          height="3"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <rect class="tl-hatch" :class="`is-${tone}`" width="1" height="3" />
        </pattern>
        <clipPath :id="`${uid}-played`">
          <rect x="0" y="0" :width="progress.playX" :height="geom.total" />
        </clipPath>
        <clipPath v-if="progress.current" :id="`${uid}-current`">
          <rect
            :x="progress.current.x"
            :y="progress.current.y"
            :width="progress.current.w"
            :height="progress.current.h"
          />
        </clipPath>
      </defs>

      <g class="tl-layer">
        <path class="tl-text" :d="paths.text" />
        <path
          class="tl-block"
          :d="paths.block"
          :fill="`url(#${uid}-hatch-rest)`"
        />
        <path v-if="contentPath" class="tl-content" :d="contentPath" />
      </g>
      <g
        v-for="clip in progress.current ? ['played', 'current'] : ['played']"
        :key="clip"
        class="tl-layer is-played"
        :clip-path="`url(#${uid}-${clip})`"
      >
        <path class="tl-text" :d="paths.text" />
        <path
          class="tl-block"
          :d="paths.block"
          :fill="`url(#${uid}-hatch-played)`"
        />
        <path
          v-if="contentPath && clip === 'played'"
          class="tl-content"
          :d="contentPath"
        />
      </g>
      <path
        v-if="cursorBar"
        class="tl-cursor"
        :class="{ 'is-block': cursorBar.kind === 'block' }"
        :d="cursorBar.d"
        :fill="
          cursorBar.kind === 'block' ? `url(#${uid}-hatch-cursor)` : undefined
        "
      />

      <rect
        v-for="cap in caps"
        :key="cap.x"
        class="tl-cap"
        :x="cap.x"
        :y="cap.y"
        :width="cap.w"
        height="2"
        :opacity="cap.opacity"
      />
      <path
        v-for="dot in yourMarks.dots"
        :key="dot.color"
        class="tl-dot"
        :d="dot.d"
        :fill="dot.color"
      />
      <path v-if="yourMarks.notes" class="tl-note" :d="yourMarks.notes" />
    </svg>
  </div>
</template>

<style scoped>
.tl-bars {
  /* The read part: the host's accent (the chapter colour). */
  --tl-played: var(--tl-accent, var(--color-accent));

  position: relative;
  /* Whoever animates the dock animates this; the SVG stretches along. */
  transition: height 180ms cubic-bezier(0.2, 0.7, 0.3, 1);
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.tl-bars.is-interactive {
  cursor: pointer;
  /* A horizontal drag scrubs; a vertical one still scrolls the page. */
  touch-action: pan-y;
}

.tl-svg {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
}

/* Unread: grey prose bars, outlined hatched blocks. */
.tl-text {
  fill: rgb(var(--color-ink) / 0.22);
}

.tl-block {
  stroke: rgb(var(--color-ink) / 0.5);
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
}

.tl-hatch.is-rest {
  fill: rgb(var(--color-ink) / 0.3);
}

.tl-content {
  fill: rgb(var(--color-ink) / 0.45);
}

/* Read: the chapter colour. On white paper the light ramps' main step is
   as light as the unread grey (perc 1.08:1, deve 1.06:1), so read and unread
   bars only differ in hue; their deep step keeps them apart (1.65, 1.71:1).
   Every other ramp, and every ramp in the dark theme, is past 1.9:1. */
:root[data-chapter="perc"]:not([data-theme="dark"]) .tl-bars,
:root[data-chapter="deve"]:not([data-theme="dark"]) .tl-bars {
  --tl-played: var(--color-chapter-deep);
}

.is-played .tl-text,
.tl-hatch.is-played {
  fill: rgb(var(--tl-played));
}

.is-played .tl-block {
  stroke: rgb(var(--tl-played));
}

.is-played .tl-content {
  fill: rgb(var(--tl-accent-deep));
}

/* The bar under the pointer or the keyboard cursor: ink (a block keeps
   its hatch, in ink). */
.tl-cursor:not(.is-block) {
  fill: rgb(var(--color-ink));
}

.tl-cursor.is-block {
  stroke: rgb(var(--color-ink));
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
}

.tl-hatch.is-cursor {
  fill: rgb(var(--color-ink));
}

.tl-cap {
  fill: rgb(var(--tl-accent-deep));
}

.tl-dot {
  stroke: rgb(var(--color-ink) / 0.3);
  stroke-width: 0.75;
}

.tl-note {
  fill: rgb(var(--color-ink));
}

/* Section labels: mono, over each section's first bar. */
.tl-labels {
  position: absolute;
  inset: 0 0 auto;
  height: 14px;
  pointer-events: none;
  animation: tl-fade-in 180ms ease-out;
}

@keyframes tl-fade-in {
  from {
    opacity: 0;
  }
}

.tl-label {
  position: absolute;
  top: 0;
  font-family: var(--font-mono);
  font-size: var(--ui-size-10);
  line-height: 14px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-variant-numeric: tabular-nums;
  color: rgb(var(--color-mute));
  white-space: nowrap;
}

.tl-label.is-current,
.tl-label.is-cursor {
  color: rgb(var(--color-ink));
}

.tl-label.is-current {
  box-shadow: inset 0 -1px 0 rgb(var(--tl-accent));
}
</style>
