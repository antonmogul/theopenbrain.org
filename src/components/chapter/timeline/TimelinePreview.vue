<script>
/*
 * Words the timeline shows for the model's raw values. Exported for the dock
 * (its live region and slider text) and the map, which render the same
 * sections and figures this card does.
 */

/** "Introduction", "Section 3", "Box A". */
export function sectionName(section) {
  if (!section) return "";
  if (section.kind === "intro") return "Introduction";
  const noun = section.kind === "box" ? "Box" : "Section";
  return section.label ? `${noun} ${section.label}` : noun;
}

/** The number the TOC prints: the intro is "0", a box its letter. */
export function sectionNumber(section) {
  if (!section) return "";
  return section.kind === "intro" ? "0" : section.label || "";
}

/**
 * A figure title fit to read. Figures without a title fall back to their
 * animation key, so "AccommodationVergence" or "eyeMovements" become
 * "Accommodation vergence" and "Eye movements"; real titles pass through.
 */
export function displayTitle(title) {
  const t = String(title || "").trim();
  if (!t || /\s/.test(t)) return t;
  if (/[a-z][A-Z]/.test(t)) {
    const words = t
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
      .toLowerCase();
    return words[0].toUpperCase() + words.slice(1);
  }
  return t === t.toLowerCase() ? t[0].toUpperCase() + t.slice(1) : t;
}

/** "1 reader", "12 readers". */
export const readers = (count) =>
  `${count} ${count === 1 ? "reader" : "readers"}`;
</script>

<script setup>
/*
 * TimelinePreview — the card above a timeline bar (OPENBRAIN-128): where the
 * bar is (section, subsection), what it is (the paragraph's opening line; a
 * widget's thumbnail, title, blurb and credit; a video or break), what the
 * reader left there and what other readers highlight there.
 *
 * Given `x`, it places itself over that point of its positioned parent,
 * clamped 8px inside it, so it never pushes the page sideways at 390px.
 * It is information, not a target: pointer events pass through to the bars
 * under it, except on touch, where it carries the "Go here" button.
 */
import { computed, ref, watch } from "vue";
import { plainText } from "@/helper/chapterTimeline";
import { HIGHLIGHT_HEX } from "@/composables/useHighlights";
import { widgetThumb } from "@/widgets/thumbnails";

const props = defineProps({
  /** A timeline item (buildTimeline). */
  item: { type: Object, required: true },
  /** Its section run and the subsection it falls under, if any. */
  section: { type: Object, default: null },
  subsection: { type: Object, default: null },
  /** The reader's highlights / notes on the item, and the trending passages. */
  highlights: { type: Array, default: () => [] },
  notes: { type: Array, default: () => [] },
  trending: { type: Array, default: () => [] },
  /** px from the parent's left edge to point at; null keeps it in flow. */
  x: { type: Number, default: null },
  /** Above the point (the dock) or below it (the map's bars). */
  placement: { type: String, default: "above" },
  /** Touch: a tap selected the bar, so offer the jump as a button. */
  touch: { type: Boolean, default: false },
});

const emit = defineEmits(["go"]);

const MAX_YOURS = 2;

const kind = computed(() => props.item.kind);
const isVideo = computed(() =>
  props.item.marks?.some((m) => m.type === "video")
);
const breakKicker = computed(() => (isVideo.value ? "Video" : "Break"));

// A break's excerpt is its title unless it has none; say it once.
const breakText = computed(() =>
  props.item.excerpt && props.item.excerpt !== props.item.title
    ? props.item.excerpt
    : ""
);

const widget = computed(() => props.item.widget || null);
// A thumbnail that fails to load leaves the hatched placeholder.
const thumbFailed = ref(false);
const thumb = computed(() =>
  widget.value?.widgetId && !thumbFailed.value
    ? widgetThumb(widget.value.widgetId)
    : null
);
watch(
  () => widget.value?.widgetId,
  () => (thumbFailed.value = false)
);
const blurb = computed(() => plainText(widget.value?.blurb || ""));

// What a prose paragraph shows besides its words: figures, images, videos.
const media = computed(() => {
  const seen = new Set();
  const out = [];
  for (const m of props.item.marks || []) {
    if (!["figure", "image", "video"].includes(m.type)) continue;
    const title = displayTitle(m.title);
    const key = `${m.type}:${title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ key, type: m.type === "image" ? "figure" : m.type, title });
  }
  return out.slice(0, 2);
});
const mediaNoun = { figure: "Figure", video: "Video" };

const yourHighlights = computed(() => props.highlights.slice(0, MAX_YOURS));
const yourNotes = computed(() =>
  props.notes.slice(0, Math.max(0, MAX_YOURS - yourHighlights.value.length))
);
const moreYours = computed(
  () =>
    props.highlights.length +
    props.notes.length -
    yourHighlights.value.length -
    yourNotes.value.length
);
const topTrend = computed(() => props.trending[0] || null);

const hex = (color) => HIGHLIGHT_HEX[color] || HIGHLIGHT_HEX.yellow;

const anchored = computed(() => Number.isFinite(props.x));
const style = computed(() =>
  anchored.value ? { "--tl-x": `${Math.round(props.x)}px` } : null
);
</script>

<template>
  <div
    class="tl-preview"
    :class="[
      `is-${kind}`,
      {
        'is-anchored': anchored,
        'is-below': placement === 'below',
        'is-touch': touch,
      },
    ]"
    :style="style"
    data-testid="timeline-preview"
  >
    <p v-if="section" class="tl-preview-where">
      <span v-if="sectionNumber(section)" class="tl-preview-num">{{
        sectionNumber(section)
      }}</span>
      <span class="tl-preview-section">{{
        section.title || sectionName(section)
      }}</span>
    </p>
    <p v-if="subsection" class="tl-preview-sub">{{ subsection.title }}</p>

    <template v-if="kind === 'widget'">
      <div class="tl-preview-thumb">
        <img
          v-if="thumb"
          :src="thumb"
          alt=""
          width="480"
          height="300"
          decoding="async"
          @error="thumbFailed = true"
        />
        <span v-else class="tl-preview-thumb-empty" aria-hidden="true">
          <span class="tl-glyph" data-type="widget"></span>
        </span>
      </div>
      <p class="tl-preview-kicker">
        <span class="tl-glyph" data-type="widget" aria-hidden="true"></span>
        Interactive
      </p>
      <p class="tl-preview-title">{{ item.title }}</p>
      <p v-if="blurb" class="tl-preview-blurb">{{ blurb }}</p>
      <p v-if="widget?.credit" class="tl-preview-credit">
        {{ widget.credit }}
      </p>
    </template>

    <template v-else-if="kind === 'break'">
      <p class="tl-preview-kicker">
        <span
          class="tl-glyph"
          :data-type="isVideo ? 'video' : 'break'"
          aria-hidden="true"
        ></span>
        {{ breakKicker }}
      </p>
      <p class="tl-preview-title">{{ item.title }}</p>
      <p v-if="breakText" class="tl-preview-excerpt">{{ breakText }}</p>
    </template>

    <template v-else>
      <p v-if="item.excerpt" class="tl-preview-excerpt">{{ item.excerpt }}</p>
      <ul v-if="media.length" class="tl-preview-media">
        <li v-for="m in media" :key="m.key">
          <span class="tl-glyph" :data-type="m.type" aria-hidden="true"></span>
          <span class="tl-preview-media-noun">{{ mediaNoun[m.type] }}</span>
          <span class="tl-preview-media-title">{{ m.title }}</span>
        </li>
      </ul>
    </template>

    <div
      v-if="highlights.length || notes.length"
      class="tl-preview-block"
      data-testid="timeline-preview-yours"
    >
      <p class="tl-preview-label">You</p>
      <p
        v-for="h in yourHighlights"
        :key="h.id"
        class="tl-preview-quote"
        :style="{ '--tl-hl': hex(h.color) }"
      >
        {{ h.text }}
      </p>
      <p v-for="n in yourNotes" :key="n.id" class="tl-preview-note">
        <svg
          class="tl-preview-pencil"
          viewBox="0 0 8 8"
          width="9"
          height="9"
          aria-hidden="true"
        >
          <path d="M0.5 7.5l1-3 4-4 2 2-4 4z" />
        </svg>
        <span>{{ n.content }}</span>
      </p>
      <p v-if="moreYours > 0" class="tl-preview-more">+{{ moreYours }} more</p>
    </div>

    <div
      v-if="topTrend"
      class="tl-preview-block"
      data-testid="timeline-preview-trending"
    >
      <p class="tl-preview-label is-trending">
        <span class="tl-glyph" data-type="trending" aria-hidden="true"></span>
        {{ readers(topTrend.count) }} highlighted:
      </p>
      <p class="tl-preview-quote is-trending">“{{ topTrend.text }}”</p>
      <p v-if="trending.length > 1" class="tl-preview-more">
        +{{ trending.length - 1 }} more
        {{ trending.length === 2 ? "passage" : "passages" }}
      </p>
    </div>

    <button
      v-if="touch"
      type="button"
      class="tl-preview-go"
      @click.stop="emit('go')"
    >
      Go here
      <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
        <path d="M2 6h8M7 3l3 3-3 3" />
      </svg>
    </button>
  </div>
</template>

<style scoped>
/* Same accent pair as the dock (ChapterTimeline): the chapter colour, the
   global accent only where no chapter ramp is set. */
.tl-preview {
  --tl-accent: var(--color-accent);
  --tl-accent-deep: var(--color-accent);
  --tl-w: min(20rem, calc(100% - 16px));

  width: 20rem;
  max-width: calc(100% - 16px);
  padding: 12px 14px 14px;
  background: rgb(var(--color-paper));
  border: 1px solid rgb(var(--color-line));
  border-radius: var(--radius-control);
  box-shadow:
    0 1px 2px rgb(var(--color-ink) / 0.06),
    0 12px 32px -12px rgb(var(--color-ink) / 0.28);
  color: rgb(var(--color-ink));
  font-family: var(--font-ui);
  text-align: left;
}

[data-chapter] .tl-preview {
  --tl-accent: var(--color-chapter);
  --tl-accent-deep: var(--color-chapter-deep);
}

/* Over a point of the parent: centred on it, clamped 8px inside, and no
   taller than the viewport above the open dock (--tl-peek-h, set by the
   dock), 8px clear at each end; what doesn't fit scrolls. */
.tl-preview.is-anchored {
  position: absolute;
  bottom: calc(100% + 8px);
  left: clamp(
    8px,
    calc(var(--tl-x) - var(--tl-w) / 2),
    calc(100% - var(--tl-w) - 8px)
  );
  width: var(--tl-w);
  max-height: calc(100vh - var(--tl-peek-h, 104px) - 16px);
  max-height: calc(100dvh - var(--tl-peek-h, 104px) - 16px);
  overflow-y: auto;
  overscroll-behavior: contain;
  z-index: 1;
  pointer-events: none;
}

/* Below the map's bars, which scroll with the map: no cap. */
.tl-preview.is-anchored.is-below {
  top: calc(100% + 8px);
  bottom: auto;
  max-height: none;
  overflow: visible;
}

/* A short viewport (a phone on its side): the card drops the widget's
   thumbnail, the tallest thing in it, rather than scroll. */
@media (max-height: 520px) {
  .tl-preview.is-anchored:not(.is-below) .tl-preview-thumb {
    display: none;
  }
}

.tl-preview.is-anchored.is-touch {
  pointer-events: auto;
}

/* Where: the section's number and title, then the subsection. */
.tl-preview-where {
  margin: 0;
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-family: var(--font-mono);
  font-size: var(--ui-size-10);
  line-height: 1.4;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgb(var(--color-mute));
}

.tl-preview-num {
  flex-shrink: 0;
  padding-left: 7px;
  border-left: 2px solid rgb(var(--tl-accent));
  color: rgb(var(--color-ink));
  font-variant-numeric: tabular-nums;
}

.tl-preview-section {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tl-preview-sub {
  margin: 2px 0 0;
  font-size: var(--ui-size-12);
  font-weight: 500;
  line-height: 1.35;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* What: the opening line of a paragraph. */
.tl-preview-excerpt {
  margin: 8px 0 0;
  font-family: var(--font-body);
  font-size: var(--ui-size-14);
  line-height: 1.45;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  overflow: hidden;
}

.tl-preview-media {
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
  display: grid;
  gap: 4px;
}

.tl-preview-media li {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  font-size: var(--ui-size-11);
  line-height: 1.3;
  color: rgb(var(--color-mute));
}

.tl-preview-media-noun {
  flex-shrink: 0;
  font-family: var(--font-mono);
  font-size: var(--ui-size-10);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.tl-preview-media-title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: rgb(var(--color-ink));
}

/* Widgets: the card the chapter shows, small. */
.tl-preview-thumb {
  margin-top: 10px;
  aspect-ratio: 16 / 10;
  overflow: hidden;
  border: 1px solid rgb(var(--color-line));
  background: rgb(var(--color-bg));
}

.tl-preview-thumb img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.tl-preview-thumb-empty {
  display: grid;
  place-items: center;
  height: 100%;
  background: repeating-linear-gradient(
    -45deg,
    rgb(var(--tl-accent) / 0.1) 0 1px,
    transparent 1px 6px
  );
}

.tl-preview-thumb-empty .tl-glyph {
  width: 12px;
  height: 12px;
  color: rgb(var(--tl-accent));
}

.tl-preview-kicker {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 10px 0 0;
  font-family: var(--font-mono);
  font-size: var(--ui-size-10);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgb(var(--color-mute));
}

.tl-preview-kicker .tl-glyph {
  color: rgb(var(--tl-accent));
}

.tl-preview-title {
  margin: 4px 0 0;
  font-size: var(--ui-size-15);
  font-weight: 600;
  line-height: 1.3;
}

.tl-preview-blurb {
  margin: 4px 0 0;
  font-size: var(--ui-size-12);
  line-height: 1.45;
  color: rgb(var(--color-mute));
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  overflow: hidden;
}

.tl-preview-credit {
  margin: 6px 0 0;
  font-family: var(--font-mono);
  font-size: var(--ui-size-10);
  letter-spacing: 0.04em;
  color: rgb(var(--color-mute));
}

/* The reader's own marks, then everyone's. */
.tl-preview-block {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid rgb(var(--color-line));
  display: grid;
  gap: 4px;
}

.tl-preview-label {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-mono);
  font-size: var(--ui-size-10);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgb(var(--color-mute));
}

.tl-preview-label.is-trending {
  color: rgb(var(--color-ink));
}

.tl-preview-quote {
  margin: 0;
  padding-left: 8px;
  border-left: 3px solid var(--tl-hl, rgb(var(--color-line)));
  font-size: var(--ui-size-12);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
}

.tl-preview-quote.is-trending {
  border-left-color: rgb(var(--tl-accent-deep));
}

.tl-preview-note {
  margin: 0;
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-size: var(--ui-size-12);
  line-height: 1.4;
  color: rgb(var(--color-mute));
}

.tl-preview-note span {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
}

.tl-preview-pencil {
  flex-shrink: 0;
  fill: rgb(var(--color-ink));
}

.tl-preview-more {
  margin: 0;
  font-family: var(--font-mono);
  font-size: var(--ui-size-10);
  color: rgb(var(--color-mute));
}

/* Touch: the selected bar's jump. */
.tl-preview-go {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  min-height: 44px;
  margin-top: 12px;
  border: 0;
  border-radius: var(--radius-control);
  background: rgb(var(--color-ink));
  color: rgb(var(--color-paper));
  font-family: var(--font-mono);
  font-size: var(--ui-size-11);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
}

.tl-preview-go svg {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.4;
}

.tl-preview-go:focus-visible {
  outline: 3px solid rgb(var(--color-accent));
  outline-offset: 2px;
}
</style>

<style>
/*
 * The timeline's glyphs in HTML (the card and the map), drawn in CSS so they
 * match the SVG lanes in TimelineBars whatever the font: widget ■, figure ●,
 * video ▶, break ◆, trending ▀. Coloured by currentColor.
 */
.tl-glyph {
  display: inline-block;
  flex-shrink: 0;
  width: 7px;
  height: 7px;
  background: currentColor;
}

.tl-glyph[data-type="figure"] {
  border-radius: 50%;
}

.tl-glyph[data-type="video"] {
  clip-path: polygon(0 0, 100% 50%, 0 100%);
}

.tl-glyph[data-type="break"] {
  clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%);
}

.tl-glyph[data-type="trending"] {
  width: 9px;
  height: 2px;
  color: rgb(var(--tl-accent-deep, var(--color-accent)));
}
</style>
