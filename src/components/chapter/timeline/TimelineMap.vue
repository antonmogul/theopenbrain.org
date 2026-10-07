<script setup>
/*
 * TimelineMap — the chapter timeline full screen (OPENBRAIN-128), opened by
 * the dock's map button (ChapterTimeline). The bars again, large, with the
 * same hover, preview and jump; then the chapter section by section: its
 * subsections, widgets, figures and media, the reader's highlights and
 * notes, and the passages other readers highlight most. Every entry is a
 * button: the host closes the map and jumps there (a section or subsection
 * to its heading, `{ index, anchorId }`; anything else by item index), told
 * `{ pointer }`: whether a click or tap made the jump.
 *
 * A modal dialog. Focus starts on the close button and stays inside (Tab
 * wraps, from the dialog itself too), Escape closes, and the page behind
 * doesn't scroll while it is open (overflow on <html>). `close` says whether
 * a pointer closed it: the host gives focus back to its map button only
 * after a keyboard close.
 *
 * The large bars are for the pointer and are hidden from assistive tech:
 * the section list below reaches every place they do, by keyboard.
 */
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
} from "vue";
import { useMediaQuery } from "@/composables/useMediaQuery";
import { sectionIndexOf } from "@/helper/chapterTimeline";
import { HIGHLIGHT_HEX } from "@/composables/useHighlights";
import { widgetThumb } from "@/widgets/thumbnails";
import CloseIcon from "@/icons/custom/CloseIcon.vue";
import TimelineBars from "./TimelineBars.vue";
import TimelinePreview, {
  displayTitle,
  readers,
  sectionName,
  sectionNumber,
} from "./TimelinePreview.vue";

const props = defineProps({
  /** buildTimeline() result. */
  model: { type: Object, required: true },
  /** The reading line as a fractional item index. */
  position: { type: Number, default: 0 },
  /** 0..100. */
  readPercent: { type: Number, default: 0 },
  /** useChapterTimeline layers: Maps of item index → entries. */
  layers: { type: Object, default: null },
  chapterTitle: { type: String, default: "" },
  /** Touch: a tap selects a bar and the preview offers "Go here". */
  touch: { type: Boolean, default: false },
});

const emit = defineEmits(["close", "jump"]);

// Passages per section in the trending list.
const TRENDING_MAX = 3;
const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

const dialogEl = ref(null);
const closeButton = ref(null);
const barsRef = ref(null);
const phone = useMediaQuery("(max-width: 639px)");

const items = computed(() => props.model?.items || []);
const sections = computed(() => props.model?.sections || []);
const layer = (name, index) => props.layers?.[name]?.get(index) || [];
const hex = (color) => HIGHLIGHT_HEX[color] || HIGHLIGHT_HEX.yellow;
// The legend's "your highlights" dot: every highlight colour in one.
const SWATCH = (() => {
  const colors = Object.values(HIGHLIGHT_HEX);
  const step = 100 / colors.length;
  return `conic-gradient(${colors
    .map((c, i) => `${c} ${i * step}% ${(i + 1) * step}%`)
    .join(", ")})`;
})();
const percent = computed(() =>
  Math.round(Math.min(100, Math.max(0, props.readPercent || 0)))
);
const currentIndex = computed(() =>
  items.value.length
    ? Math.min(items.value.length - 1, Math.floor(props.position || 0))
    : -1
);
const currentKey = computed(
  () => items.value[currentIndex.value]?.sectionKey ?? null
);

/* ---- The chapter, section by section --------------------------------- */

const MEDIA_NOUN = {
  figure: "Figure",
  image: "Image",
  video: "Video",
  break: "Break",
};

// Each section once (a section a box interrupts comes back as a
// `continued` run: its items join the first run's entry).
const groups = computed(() => {
  const list = [];
  const byKey = new Map();
  for (const run of sections.value) {
    let group = byKey.get(run.key);
    if (!group) {
      group = {
        key: run.key,
        id: `${run.key}:${run.start}`,
        number: sectionNumber(run),
        name: sectionName(run),
        title: run.title || sectionName(run),
        kind: run.kind,
        start: run.start,
        anchorId: run.anchorId ?? null,
        runs: [],
      };
      byKey.set(run.key, group);
      list.push(group);
    }
    group.runs.push(run);
  }

  for (const group of list) {
    const widgets = [];
    const media = [];
    const yours = [];
    const trending = [];
    const seen = new Set();
    let paragraphs = 0;
    let count = 0;
    for (const run of group.runs) {
      for (let i = run.start; i < run.end; i++) {
        const item = items.value[i];
        count += 1;
        if (item.kind === "text") paragraphs += 1;
        if (item.kind === "widget") {
          widgets.push({
            index: i,
            title: item.title,
            credit: item.widget?.credit || "",
            thumb: widgetThumb(item.widget?.widgetId) || null,
          });
        }
        for (const mark of item.marks || []) {
          if (!MEDIA_NOUN[mark.type]) continue;
          const title =
            mark.type === "figure" ? displayTitle(mark.title) : mark.title;
          const key = `${mark.type}:${title}`;
          if (seen.has(key)) continue;
          seen.add(key);
          media.push({ key, index: i, type: mark.type, title });
        }
        for (const h of layer("highlights", i))
          yours.push({
            key: `h:${h.id}`,
            index: i,
            kind: "highlight",
            color: hex(h.color),
            text: h.text,
          });
        for (const n of layer("notes", i))
          yours.push({
            key: `n:${n.id}`,
            index: i,
            kind: "note",
            text: n.content,
          });
        for (const t of layer("trending", i))
          trending.push({ index: i, text: t.text, count: t.count });
      }
    }
    trending.sort((a, b) => b.count - a.count);
    Object.assign(group, {
      count,
      paragraphs,
      widgets,
      media,
      yours,
      trending: trending
        .slice(0, TRENDING_MAX)
        .map((t, n) => ({ ...t, key: `${t.index}:${n}` })),
      subsections: (props.model?.subsections || []).filter(
        (s) => s.sectionKey === group.key
      ),
      meta: [
        paragraphs && plural(paragraphs, "paragraph"),
        widgets.length && plural(widgets.length, "widget"),
      ]
        .filter(Boolean)
        .join(" · "),
    });
  }
  return list;
});

// Thumbnails that failed to load: their cards keep the placeholder.
const failedThumbs = reactive(new Set());

function plural(n, noun) {
  return `${n} ${noun}${n === 1 ? "" : "s"}`;
}

// How much of each section is read (0..1), from the reading position.
const readOf = computed(() => {
  const out = new Map();
  for (const group of groups.value) {
    let read = 0;
    for (const run of group.runs)
      read += Math.min(
        run.end - run.start,
        Math.max(0, props.position - run.start)
      );
    out.set(group.key, group.count ? read / group.count : 0);
  }
  return out;
});

// What the legend explains: only the marks this chapter has.
const legend = computed(() => {
  const types = new Set();
  for (const item of items.value)
    for (const mark of item.marks || [])
      types.add(mark.type === "image" ? "figure" : mark.type);
  const out = [
    ["widget", "Widget"],
    ["figure", "Figure"],
    ["video", "Video"],
    ["break", "Break"],
  ]
    .filter(([type]) => types.has(type))
    .map(([type, label]) => ({ type, label }));
  if (props.layers?.highlights?.size)
    out.push({ type: "highlight", label: "Your highlights" });
  if (props.layers?.notes?.size)
    out.push({ type: "note", label: "Your notes" });
  if (props.layers?.trending?.size)
    out.push({ type: "trending", label: "Trending" });
  return out;
});

/* ---- The large bars --------------------------------------------------- */

const cursor = ref(-1);
const previewItem = computed(() =>
  cursor.value >= 0 ? items.value[cursor.value] : null
);
const previewX = computed(() =>
  previewItem.value && barsRef.value
    ? barsRef.value.centerOf(cursor.value)
    : null
);
const previewSection = computed(
  () => sections.value[sectionIndexOf(sections.value, cursor.value)] || null
);
const previewSubsection = computed(() => {
  const key = previewItem.value?.sectionKey;
  let found = null;
  for (const sub of props.model?.subsections || [])
    if (sub.sectionKey === key && sub.start <= cursor.value) found = sub;
  return found;
});

function onHover(hit) {
  cursor.value = hit ? hit.index : -1;
}

/* An item, or with `anchorId` (a section's or subsection's element) the
   heading above it: { index, anchorId }; and whether a click or tap made
   the jump (lastInput). */
function jump(index, anchorId = null) {
  if (index < 0 || index >= items.value.length) return;
  emit("jump", anchorId ? { index, anchorId } : index, {
    pointer: lastInput === "pointer",
  });
}

/* ---- Dialog ------------------------------------------------------------ */

// What the reader last used in the map, for `close` and `jump`: a click or
// tap is "pointer"; Escape, or Enter on a button, the keyboard.
let lastInput = "keyboard";

function onPointerDown() {
  lastInput = "pointer";
}

function close() {
  emit("close", { pointer: lastInput === "pointer" });
}

function onKeydown(e) {
  lastInput = "keyboard";
  if (e.key === "Escape") {
    e.preventDefault();
    e.stopPropagation();
    emit("close", { pointer: false });
    return;
  }
  if (e.key !== "Tab" || !dialogEl.value) return;
  const focusable = [...dialogEl.value.querySelectorAll(FOCUSABLE)].filter(
    (el) => !el.hasAttribute("hidden")
  );
  if (!focusable.length) {
    e.preventDefault();
    dialogEl.value.focus();
    return;
  }
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement;
  // The dialog itself (a click on its text or padding focuses it) counts as
  // outside its controls: the browser's own Shift+Tab from there would go
  // to the page behind.
  if (active === dialogEl.value || !dialogEl.value.contains(active)) {
    e.preventDefault();
    (e.shiftKey ? last : first).focus();
  } else if (e.shiftKey && active === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && active === last) {
    e.preventDefault();
    first.focus();
  }
}

let previousOverflow = "";

onMounted(async () => {
  const root = document.documentElement;
  previousOverflow = root.style.overflow;
  root.style.overflow = "hidden";
  await nextTick();
  closeButton.value?.focus();
});

onBeforeUnmount(() => {
  document.documentElement.style.overflow = previousOverflow;
});
</script>

<template>
  <div
    ref="dialogEl"
    class="ctl-map"
    role="dialog"
    aria-modal="true"
    aria-labelledby="ctl-map-title"
    tabindex="-1"
    data-testid="chapter-timeline-map"
    @keydown="onKeydown"
    @pointerdown.capture="onPointerDown"
  >
    <header class="map-head">
      <div class="map-heading">
        <p class="map-kicker">Chapter map</p>
        <h2 id="ctl-map-title" class="map-title">
          {{ chapterTitle || "Chapter map" }}
        </h2>
      </div>
      <p class="map-percent">{{ percent }}% read</p>
      <button
        ref="closeButton"
        type="button"
        class="map-close"
        aria-label="Close chapter map"
        @click="close"
      >
        <CloseIcon :width="18" :height="18" />
      </button>
    </header>

    <div class="map-scroll">
      <div class="map-inner">
        <div v-if="items.length" class="map-bars">
          <TimelineBars
            ref="barsRef"
            :model="model"
            :position="position"
            :bar-height="phone ? 56 : 96"
            :expanded="true"
            :cursor="cursor"
            :layers="layers"
            aria-hidden="true"
            @hover="onHover"
            @pick="jump($event.index)"
          />
          <TimelinePreview
            v-if="previewItem"
            :item="previewItem"
            :section="previewSection"
            :subsection="previewSubsection"
            :highlights="layer('highlights', cursor)"
            :notes="layer('notes', cursor)"
            :trending="layer('trending', cursor)"
            :x="previewX"
            placement="below"
            :touch="touch"
            @go="jump(cursor)"
          />
        </div>

        <ul v-if="legend.length" class="map-legend" aria-label="Key">
          <li v-for="entry in legend" :key="entry.type">
            <svg
              v-if="entry.type === 'note'"
              class="map-pencil"
              viewBox="0 0 8 8"
              width="9"
              height="9"
              aria-hidden="true"
            >
              <path d="M0.5 7.5l1-3 4-4 2 2-4 4z" />
            </svg>
            <span
              v-else-if="entry.type === 'highlight'"
              class="map-dot"
              :style="{ background: SWATCH }"
              aria-hidden="true"
            ></span>
            <span
              v-else
              class="tl-glyph"
              :data-type="entry.type"
              aria-hidden="true"
            ></span>
            {{ entry.label }}
          </li>
        </ul>

        <p v-if="!groups.length" class="map-empty">
          This chapter has nothing to map yet.
        </p>

        <ol v-else class="map-sections">
          <li
            v-for="group in groups"
            :key="group.id"
            class="map-section"
            :class="{
              'is-current': group.key === currentKey,
              'is-box': group.kind === 'box',
            }"
          >
            <button
              type="button"
              class="map-section-head"
              :aria-current="group.key === currentKey ? 'location' : undefined"
              @click="jump(group.start, group.anchorId)"
            >
              <span class="map-num">{{ group.number }}</span>
              <span class="map-section-title">{{ group.title }}</span>
              <span v-if="group.meta" class="map-meta">{{ group.meta }}</span>
              <span class="map-rule" aria-hidden="true">
                <span
                  class="map-rule-fill"
                  :style="{
                    transform: `scaleX(${readOf.get(group.key) || 0})`,
                  }"
                ></span>
              </span>
            </button>

            <ul v-if="group.subsections.length" class="map-list">
              <li v-for="sub in group.subsections" :key="`s${sub.start}`">
                <button
                  type="button"
                  class="map-entry is-sub"
                  @click="jump(sub.start, sub.anchorId)"
                >
                  <span class="map-entry-text">{{ sub.title }}</span>
                </button>
              </li>
            </ul>

            <template v-if="group.widgets.length">
              <p class="map-group-label">Widgets</p>
              <ul class="map-list">
                <li v-for="w in group.widgets" :key="`w${w.index}`">
                  <button
                    type="button"
                    class="map-widget"
                    @click="jump(w.index)"
                  >
                    <span class="map-thumb">
                      <img
                        v-if="w.thumb && !failedThumbs.has(w.thumb)"
                        :src="w.thumb"
                        alt=""
                        width="480"
                        height="300"
                        loading="lazy"
                        decoding="async"
                        @error="failedThumbs.add(w.thumb)"
                      />
                      <span v-else class="map-thumb-empty" aria-hidden="true">
                        <span class="tl-glyph" data-type="widget"></span>
                      </span>
                    </span>
                    <span class="map-widget-text">
                      <span class="map-widget-kicker">Interactive</span>
                      <span class="map-widget-title">{{ w.title }}</span>
                      <span v-if="w.credit" class="map-widget-credit">{{
                        w.credit
                      }}</span>
                    </span>
                  </button>
                </li>
              </ul>
            </template>

            <template v-if="group.media.length">
              <p class="map-group-label">Figures and media</p>
              <ul class="map-list">
                <li v-for="m in group.media" :key="m.key">
                  <button
                    type="button"
                    class="map-entry"
                    @click="jump(m.index)"
                  >
                    <span
                      class="tl-glyph"
                      :data-type="m.type === 'image' ? 'figure' : m.type"
                      aria-hidden="true"
                    ></span>
                    <span class="map-entry-noun">{{ MEDIA_NOUN[m.type] }}</span>
                    <span class="map-entry-text is-one-line">{{
                      m.title
                    }}</span>
                  </button>
                </li>
              </ul>
            </template>

            <template v-if="group.yours.length">
              <p class="map-group-label">Your highlights and notes</p>
              <ul class="map-list">
                <li v-for="y in group.yours" :key="y.key">
                  <button
                    type="button"
                    class="map-entry is-yours"
                    :class="`is-${y.kind}`"
                    :style="y.color ? { '--tl-hl': y.color } : null"
                    @click="jump(y.index)"
                  >
                    <svg
                      v-if="y.kind === 'note'"
                      class="map-pencil"
                      viewBox="0 0 8 8"
                      width="9"
                      height="9"
                      aria-hidden="true"
                    >
                      <path d="M0.5 7.5l1-3 4-4 2 2-4 4z" />
                    </svg>
                    <span class="sr-only">{{
                      y.kind === "note" ? "Your note: " : "Your highlight: "
                    }}</span>
                    <span class="map-entry-text">{{ y.text }}</span>
                  </button>
                </li>
              </ul>
            </template>

            <template v-if="group.trending.length">
              <p class="map-group-label">Trending</p>
              <ul class="map-list">
                <li v-for="t in group.trending" :key="t.key">
                  <button
                    type="button"
                    class="map-entry is-trending"
                    @click="jump(t.index)"
                  >
                    <span class="map-entry-count">{{ readers(t.count) }} </span>
                    <span class="map-entry-text">“{{ t.text }}”</span>
                  </button>
                </li>
              </ul>
            </template>
          </li>
        </ol>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Same accent pair as the dock: the chapter colour, else the accent. */
.ctl-map {
  --tl-accent: var(--color-accent);
  --tl-accent-deep: var(--color-accent);

  position: fixed;
  inset: 0;
  /* Over the reader's chrome and sidebar, under lightboxes and DemoModal. */
  z-index: 250;
  display: flex;
  flex-direction: column;
  background: rgb(var(--color-paper));
  color: rgb(var(--color-ink));
  font-family: var(--font-ui);
}

[data-chapter] .ctl-map {
  --tl-accent: var(--color-chapter);
  --tl-accent-deep: var(--color-chapter-deep);
}

.ctl-map:focus {
  outline: none;
}

/* Header: the reader's top-bar height, hairline below. */
.map-head {
  display: flex;
  align-items: center;
  gap: 16px;
  min-height: var(--reader-topbar-h);
  padding: 8px 10px 8px 24px;
  border-bottom: 1px solid rgb(var(--color-line));
}

.map-heading {
  flex: 1;
  min-width: 0;
}

.map-kicker,
.map-group-label,
.map-meta,
.map-percent,
.map-legend {
  margin: 0;
  font-family: var(--font-mono);
  font-size: var(--ui-size-10);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgb(var(--color-mute));
}

.map-title {
  margin: 2px 0 0;
  font-size: var(--ui-size-18);
  font-weight: 600;
  line-height: 1.25;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.map-percent {
  flex-shrink: 0;
  color: rgb(var(--color-ink));
  font-variant-numeric: tabular-nums;
}

.map-close {
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  padding: 0;
  border: 1px solid rgb(var(--color-line));
  border-radius: var(--radius-control);
  background: transparent;
  color: rgb(var(--color-ink));
  cursor: pointer;
  transition: border-color 0.12s ease;
}

.map-close:hover {
  border-color: rgb(var(--color-ink));
}

/* The page behind doesn't move; this does (contain, never none: the wheel
   must still work over it). */
.map-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.map-inner {
  max-width: 75rem;
  margin: 0 auto;
  padding: 28px 24px 64px;
}

.map-bars {
  position: relative;
}

.map-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 18px;
  list-style: none;
  margin: 14px 0 0;
  padding: 0;
}

.map-legend li {
  display: flex;
  align-items: center;
  gap: 6px;
}

.map-legend .tl-glyph {
  color: rgb(var(--color-ink) / 0.6);
}

.map-legend .tl-glyph[data-type="trending"] {
  color: rgb(var(--tl-accent-deep));
}

.map-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.map-pencil {
  flex-shrink: 0;
  fill: rgb(var(--color-ink));
}

.map-empty {
  margin: 32px 0 0;
  color: rgb(var(--color-mute));
  font-size: var(--ui-size-14);
}

/* Sections: a grid of columns, each opened by a hairline in ink. */
.map-sections {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 18rem), 1fr));
  gap: 32px 32px;
  list-style: none;
  margin: 36px 0 0;
  padding: 0;
}

.map-section {
  min-width: 0;
  border-top: 1px solid rgb(var(--color-ink));
}

.map-section.is-box {
  border-top-style: dashed;
}

.map-section-head {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: baseline;
  gap: 2px 10px;
  width: 100%;
  min-height: 44px;
  padding: 10px 0 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.map-num {
  font-family: var(--font-mono);
  font-size: var(--ui-size-11);
  font-variant-numeric: tabular-nums;
  color: rgb(var(--color-mute));
}

.map-section.is-current .map-num {
  color: rgb(var(--color-ink));
}

.map-section-title {
  font-size: var(--ui-size-16);
  font-weight: 600;
  line-height: 1.3;
}

.map-meta {
  grid-column: 2;
}

.map-rule {
  grid-column: 1 / -1;
  position: relative;
  height: 2px;
  margin-top: 8px;
  overflow: hidden;
  background: rgb(var(--color-line));
}

.map-rule-fill {
  position: absolute;
  inset: 0;
  background: rgb(var(--tl-accent));
  transform-origin: left;
}

.map-section-head:hover .map-section-title,
.map-entry:hover .map-entry-text,
.map-widget:hover .map-widget-title {
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 3px;
}

.map-group-label {
  margin: 18px 0 2px;
}

.map-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.map-list li + li {
  border-top: 1px solid rgb(var(--color-line));
}

.map-entry,
.map-widget {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 44px;
  padding: 6px 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: var(--ui-size-13);
  line-height: 1.4;
  text-align: left;
  cursor: pointer;
}

.map-entry .tl-glyph {
  color: rgb(var(--color-ink) / 0.6);
}

.map-entry-noun,
.map-entry-count {
  flex-shrink: 0;
  font-family: var(--font-mono);
  font-size: var(--ui-size-10);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgb(var(--color-mute));
}

.map-entry-count {
  color: rgb(var(--color-ink));
}

.map-entry-text {
  min-width: 0;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
}

.map-entry-text.is-one-line {
  -webkit-line-clamp: 1;
  line-clamp: 1;
}

.map-entry.is-sub {
  padding-left: 12px;
  font-weight: 500;
}

.map-entry.is-highlight .map-entry-text {
  padding-left: 8px;
  border-left: 3px solid var(--tl-hl);
}

.map-entry.is-note {
  align-items: baseline;
  color: rgb(var(--color-mute));
}

.map-entry.is-trending {
  flex-wrap: wrap;
  gap: 2px 8px;
}

.map-entry.is-trending .map-entry-count::before {
  content: "";
  display: inline-block;
  width: 9px;
  height: 2px;
  margin-right: 6px;
  vertical-align: middle;
  background: rgb(var(--tl-accent-deep));
}

.map-entry.is-trending .map-entry-text {
  flex-basis: 100%;
}

/* Widgets: a 16:10 thumbnail beside the title. */
.map-widget {
  align-items: flex-start;
  gap: 12px;
  padding: 8px 0;
}

.map-thumb {
  flex-shrink: 0;
  width: 6rem;
  aspect-ratio: 16 / 10;
  overflow: hidden;
  border: 1px solid rgb(var(--color-line));
  background: rgb(var(--color-bg));
}

.map-thumb img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.map-thumb-empty {
  display: grid;
  place-items: center;
  height: 100%;
  color: rgb(var(--tl-accent));
  background: repeating-linear-gradient(
    -45deg,
    rgb(var(--tl-accent) / 0.1) 0 1px,
    transparent 1px 6px
  );
}

.map-widget-text {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.map-widget-kicker,
.map-widget-credit {
  font-family: var(--font-mono);
  font-size: var(--ui-size-10);
  letter-spacing: 0.06em;
  color: rgb(var(--color-mute));
}

.map-widget-kicker {
  text-transform: uppercase;
}

.map-widget-title {
  font-weight: 600;
}

.map-close:focus-visible,
.map-section-head:focus-visible,
.map-entry:focus-visible,
.map-widget:focus-visible {
  outline: 3px solid rgb(var(--color-accent));
  outline-offset: 2px;
}

@media (max-width: 639px) {
  .map-head {
    padding-left: 16px;
  }

  .map-inner {
    padding: 20px 16px 48px;
  }
}
</style>
