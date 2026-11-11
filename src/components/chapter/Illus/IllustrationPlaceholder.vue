<script setup>
// Typed figure/diagram placeholder for the left illustration column.
//
// Fills the figure pane with a framed "diagram container": a toolbar at the top
// (figure label + name on the left, a fullscreen-expand button on the right) and
// the diagram area below. While a chapter's figures have no real artwork yet,
// the diagram area shows a labelled placeholder ("Artwork pending"). The shell
// is what every real diagram slots into: once the row carries artwork
// (config.images, or image_file_url for a single image; see
// helper/figureCycle.js) the same frame shows it, as a gallery when there are
// several (OPENBRAIN-41, OPENBRAIN-97). IllustrationsComp routes both states
// here.
//
// Expected props on `animation` (spread from animations.config in useAnimations.js):
//   placeholder: true        — routes IllustrationsComp here
//   figureNumber: 3          — "FIG 03" toolbar label (number | box letter)
//   diagramType: "photo"     — one of DIAGRAM_TYPES; renders a type chip
//   title: "Edwin Smith papyrus"  — diagram name in the toolbar + frame
//   description / caption    — optional supporting line
//   note                     — optional production note (what art to source)
//   images: [{ src, caption?, alt? }]  — real artwork; replaces the placeholder
//   galleryStart: "grid" | "single"    — a set's opening view (else by its size)
//
// In the pane the legend is folded away so the artwork gets the height
// (OPENBRAIN-177): the toolbar keeps the label and title, and a "Legend"
// control shows the legend as a panel over the edge of the artwork, on
// hover or focus for a look and on a click to keep it. It stays in the
// document while folded, so screen readers read it with the figure. In the
// text column the legend is in the flow as before.
import { ref, computed, onBeforeUnmount, useId } from "vue";
import DemoModal from "@/components/chapter/demos/DemoModal.vue";
import FigureImages from "@/components/chapter/Illus/FigureImages.vue";
import { figureImages, galleryStartView } from "@/helper/figureCycle";

const props = defineProps({
  animation: { type: Object, required: true },
  /* Rendered in the text column (IllustrationInline), where the shell takes
     the height its content needs rather than filling a fixed pane. */
  inline: { type: Boolean, default: false },
});

const DIAGRAM_TYPES = {
  photo: { label: "Photo", glyph: "▣" },
  portrait: { label: "Portrait", glyph: "☺" },
  manuscript: { label: "Manuscript", glyph: "✎" },
  diagram: { label: "Diagram", glyph: "◫" },
  illustration: { label: "Illustration", glyph: "✦" },
  map: { label: "Map", glyph: "⊕" },
  interactive: { label: "Interactive", glyph: "⊙" },
  chart: { label: "Chart", glyph: "▤" },
  // A video still to come, e.g. an interview the manuscript marks
  // (OPENBRAIN-107).
  video: { label: "Video", glyph: "▶" },
};

const type = computed(
  () => DIAGRAM_TYPES[props.animation.diagramType] || DIAGRAM_TYPES.diagram
);

// "FIG 03" (numeric, zero-padded) or "FIG A" (box letter).
const figureLabel = computed(() => {
  const n = props.animation.figureNumber;
  if (n === undefined || n === null || n === "") return "FIG";
  const isNumeric = typeof n === "number" || /^\d+$/.test(String(n));
  return `FIG ${isNumeric ? String(n).padStart(2, "0") : n}`;
});

const title = computed(() => props.animation.title || "Untitled figure");
const images = computed(() => figureImages(props.animation));
const caption = computed(
  () => props.animation.caption || props.animation.description || ""
);
// The gallery's current image and view (all the images, or one), shared by
// the pane and the fullscreen dialog so expanding opens on the same plate
// in the same view (OPENBRAIN-144, OPENBRAIN-177).
const galleryIndex = ref(0);
const galleryView = ref(
  galleryStartView(images.value.length, props.animation.galleryStart)
);

// The legend sits with the title (OPENBRAIN-138): the shown image's own
// caption, else the figure's; over the grid of all the images, the figure's.
const legend = computed(() => {
  if (images.value.length > 1 && galleryView.value === "grid")
    return caption.value;
  return (
    (images.value[galleryIndex.value] || images.value[0])?.caption ||
    caption.value
  );
});

// In the pane the legend folds away behind its control. A hover or keyboard
// focus is a look (`peek`): the legend floats over the edge of the artwork
// and nothing moves. A click keeps it (`pinned`): it takes its place under
// the title, as the redesign draws it, and the artwork gives up the room.
const folds = computed(() => !props.inline);
const legendId = `fig-legend-${useId()}`;
const legendPinned = ref(false);
const legendPeek = ref(false);
const legendFloats = computed(() => folds.value && !legendPinned.value);
const legendOpen = computed(() => legendFloats.value && legendPeek.value);
let peekTimer = null;
function clearPeekTimer() {
  clearTimeout(peekTimer);
  peekTimer = null;
}
// A pointer crossing the heading on its way elsewhere should not flash the
// legend: it opens after a beat, and only for a mouse (a tap is a click).
function onLegendHover(e) {
  if (!folds.value || e.pointerType !== "mouse" || legendPeek.value) return;
  clearPeekTimer();
  peekTimer = setTimeout(() => {
    peekTimer = null;
    legendPeek.value = true;
  }, 140);
}
function onToolbarLeave() {
  clearPeekTimer();
  legendPeek.value = false;
}
function toggleLegend() {
  clearPeekTimer();
  legendPinned.value = !legendPinned.value;
  // Unpinning closes it even while the pointer is still on the control.
  if (!legendPinned.value) legendPeek.value = false;
}
function closeLegend() {
  clearPeekTimer();
  legendPinned.value = false;
  legendPeek.value = false;
}
onBeforeUnmount(clearPeekTimer);

// Fullscreen expand — overlay the diagram over the whole viewport. The
// dialog keeps the ground the chapter's figure pane has (OPENBRAIN-177):
// dark, as the History redesign draws its figures, unless the chapter's
// art was drawn for paper (figurePaneGround; the pane says so itself, and
// a figure in the text column or a breakout box asks its reader's pane).
const shellElement = ref(null);
const isFullscreen = ref(false);
const dialogGround = ref("dark");
function paneGround() {
  const element = shellElement.value;
  const pane =
    element?.closest?.(".figure-pane") ||
    element?.closest?.(".chapter-reader")?.querySelector?.(".figure-pane");
  return pane?.dataset?.ground === "paper" ? "paper" : "dark";
}
function openFullscreen() {
  dialogGround.value = paneGround();
  isFullscreen.value = true;
}
function closeFullscreen() {
  isFullscreen.value = false;
}
</script>

<template>
  <div ref="shellElement" class="fig-pane pointer-events-auto">
    <!-- Diagram container: toolbar + diagram area -->
    <figure class="fig-shell" :class="{ 'fig-shell--inline': inline }">
      <header
        class="fig-toolbar"
        :class="{
          'fig-toolbar--pane': folds,
          'fig-toolbar--folded': legendFloats,
        }"
        @pointerleave="onToolbarLeave"
        @keydown.esc="closeLegend"
      >
        <div class="fig-toolbar-left">
          <!-- pointerover, not pointerenter: on the dark pane the heading
               has no box of its own (display: contents). -->
          <p class="fig-heading" @pointerover="onLegendHover">
            <span class="fig-label">{{ figureLabel }}</span>
            <span class="fig-name">{{ title }}</span>
          </p>
        </div>
        <button
          class="fig-fs-btn"
          type="button"
          title="Expand to full screen"
          aria-label="Expand to full screen"
          @click="openFullscreen"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            stroke="currentColor"
            stroke-width="1.4"
            stroke-linecap="round"
          >
            <path d="M1 5V1h4M13 5V1H9M1 9v4h4M13 9v4H9" />
          </svg>
        </button>
        <template v-if="images.length && legend">
          <button
            v-if="folds"
            type="button"
            class="fig-legend-btn"
            :aria-expanded="legendPinned ? 'true' : 'false'"
            :aria-controls="legendId"
            :title="legendPinned ? 'Hide the legend' : 'Show the legend'"
            @click="toggleLegend"
            @pointerover="onLegendHover"
            @focus="legendPeek = true"
            @blur="legendPeek = false"
          >
            <span>Legend</span>
            <svg
              class="fig-legend-caret"
              width="10"
              height="10"
              viewBox="0 0 10 10"
              fill="none"
              stroke="currentColor"
              stroke-width="1.4"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M2 6.5l3-3 3 3" />
            </svg>
          </button>
          <figcaption
            :id="legendId"
            class="fig-legend"
            :class="{
              'fig-legend--folds': legendFloats,
              'is-open': legendOpen,
            }"
          >
            {{ legend }}
          </figcaption>
        </template>
      </header>

      <!-- Diagram area: the artwork, or a placeholder until it lands -->
      <div class="fig-area" :class="{ 'fig-area--art': images.length }">
        <FigureImages
          v-if="images.length"
          :images="images"
          :caption="caption"
          :label="figureLabel"
          :title="title"
          v-model:index="galleryIndex"
          v-model:view="galleryView"
          :start="animation.galleryStart || ''"
          :fit="!inline"
          :suspended="isFullscreen"
          legend-above
        />
        <div v-else class="fig-placeholder">
          <span class="fig-type-chip">
            <span aria-hidden="true">{{ type.glyph }}</span> {{ type.label }}
          </span>
          <span class="fig-glyph" aria-hidden="true">{{ type.glyph }}</span>
          <p class="fig-title">{{ title }}</p>
          <p v-if="caption" class="fig-caption">{{ caption }}</p>
          <p class="fig-status">Artwork pending</p>
          <p v-if="animation.note" class="fig-note">
            <span class="note-tag">NOTE</span> {{ animation.note }}
          </p>
        </div>
      </div>
    </figure>

    <!-- The shared reader dialog owns scroll lock, focus and navigation. -->
    <DemoModal
      :show="isFullscreen"
      :title="`${figureLabel}: ${title}`"
      wide
      :ground="dialogGround"
      @close="closeFullscreen"
    >
      <!-- On the dark ground the heading is the pane's toolbar: the label
           in amber, then the title, both mono. -->
      <template v-if="dialogGround === 'dark'" #title>
        <span class="fs-label">{{ figureLabel }}</span>
        <span class="fs-name">{{ title }}</span>
      </template>
      <div class="fs-content">
        <div
          class="fig-area fs-area"
          :class="{ 'fig-area--art': images.length }"
        >
          <FigureImages
            v-if="images.length"
            :images="images"
            :caption="caption"
            :label="figureLabel"
            :title="title"
            v-model:index="galleryIndex"
            v-model:view="galleryView"
            :start="animation.galleryStart || ''"
            large
          />
          <div v-else class="fig-placeholder">
            <span class="fig-type-chip">
              <span aria-hidden="true">{{ type.glyph }}</span>
              {{ type.label }}
            </span>
            <span class="fig-glyph fs-glyph" aria-hidden="true">{{
              type.glyph
            }}</span>
            <p class="fig-title fs-title">{{ title }}</p>
            <p v-if="caption" class="fig-caption">{{ caption }}</p>
            <p class="fig-status">Artwork pending</p>
          </div>
        </div>
      </div>
    </DemoModal>
  </div>
</template>

<style scoped>
/* Pane wrapper — fill the whole figure column, edge to edge */
.fig-pane {
  width: 100%;
  height: 100%;
  font-family: var(--font-mono);
  display: flex;
}

/* Diagram container fills the pane edge-to-edge — no detached frame or radius.
   The prose column's own left border provides the divider between the panes. */
.fig-shell {
  flex: 1;
  margin: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: rgb(var(--color-paper));
  overflow: hidden;
}
/* In the text column the figure has no frame of its own: no surface, and
   below the two-column reader it runs edge to edge, the title and legend
   kept on the prose's gutters (OPENBRAIN-138). */
.fig-shell--inline {
  background: transparent;
  overflow: visible;
}
@media (max-width: 1023px) {
  .fig-shell--inline {
    width: var(--app-w, 100vw);
    margin-left: calc(50% - var(--app-w, 100vw) / 2);
  }
  .fig-shell--inline .fig-toolbar {
    padding-inline: var(--reader-gutter-l) var(--reader-gutter-r);
  }
}

/* Toolbar */
.fig-toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: flex-start;
  padding: 0.875rem 0.875rem 0.75rem;
  flex-shrink: 0;
  /* A long legend (Figure 6's runs to 900 characters) scrolls rather than
     squeezing the artwork out of the pane. */
  max-height: 45%;
  overflow-y: auto;
}
.fig-shell--inline .fig-toolbar {
  max-height: none;
  padding-inline: 0;
}
/* In the pane the legend is folded behind its control (OPENBRAIN-177), so
   the toolbar is one row and the artwork has the rest. While folded the
   toolbar is the floating panel's containing block and must not clip it;
   with the legend kept open it is the scrolling toolbar above again. */
.fig-toolbar--pane {
  grid-template-columns: minmax(0, 1fr) auto auto;
}
.fig-toolbar--folded {
  position: relative;
  max-height: none;
  overflow: visible;
}
.fig-legend-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  height: 28px;
  padding: 0 0.5rem;
  border: 1px solid rgb(var(--color-line));
  border-radius: var(--radius-control);
  background: transparent;
  color: rgb(var(--color-ink));
  font-family: var(--font-mono);
  font-size: 0.65625rem;
  font-weight: 600;
  line-height: 1;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  cursor: pointer;
  flex-shrink: 0;
  transition:
    border-color 0.12s ease,
    background 0.12s ease,
    color 0.12s ease;
}
.fig-legend-btn:hover {
  border-color: rgb(var(--color-ink));
  background: rgb(var(--color-ink) / 0.04);
}
.fig-legend-btn:focus-visible,
.fig-fs-btn:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 2px;
}
.fig-legend-caret {
  transition: transform 0.16s ease;
}
/* The caret points the way the panel opens: down under a toolbar at the
   top (the paper pane), up over the artwork on the dark pane. */
.fig-legend-btn .fig-legend-caret {
  transform: rotate(180deg);
}
.fig-legend-btn[aria-expanded="true"] .fig-legend-caret {
  transform: none;
}
/* Folded: out of sight, still in the document for assistive technology. */
.fig-legend--folds:not(.is-open) {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
/* Open: a panel over the edge of the artwork, as wide as the pane. A long
   legend (Figure 6's run to 900 characters) scrolls inside it. It takes no
   grid area: an absolutely placed grid item measures from its area, and
   this one must measure from the whole toolbar. */
.fig-legend--folds.is-open {
  position: absolute;
  grid-area: auto;
  z-index: 3;
  top: 100%;
  left: 0;
  right: 0;
  width: auto;
  max-height: min(18rem, 45vh);
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 0.75rem 0.875rem;
  border-bottom: 1px solid rgb(var(--color-line));
  background: rgb(var(--color-paper) / 0.97);
  animation: fig-legend-in 0.16s ease;
}
@keyframes fig-legend-in {
  from {
    opacity: 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  .fig-legend--folds.is-open {
    animation: none;
  }
  .fig-legend-caret {
    transition: none;
  }
}
.fig-toolbar-left {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  min-width: 0;
}
.fig-heading {
  display: flex;
  align-items: baseline;
  gap: 0.625rem;
  min-width: 0;
  margin: 0;
}
.fig-legend {
  margin: 0;
  grid-column: 1 / -1;
  width: 100%;
  font-family: var(--font-body);
  font-size: var(--ui-size-13);
  line-height: 1.45;
  color: rgb(var(--color-mute));
}
.fig-label {
  font-size: 0.65625rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: rgb(var(--color-mute));
  flex-shrink: 0;
}
.fig-name {
  font-size: 0.71875rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgb(var(--color-ink));
}
.fig-fs-btn {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border: 1px solid rgb(var(--color-line));
  border-radius: var(--radius-control);
  background: transparent;
  color: rgb(var(--color-ink));
  cursor: pointer;
  flex-shrink: 0;
  transition:
    border-color 0.12s ease,
    background 0.12s ease;
}
.fig-fs-btn:hover {
  border-color: rgb(var(--color-ink));
  background: rgb(var(--color-ink) / 0.04);
}

/* Diagram area — fills remaining height; placeholder centered within */
.fig-area {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.25rem;
}
/* With artwork the viewer owns the whole area, edge to edge. */
.fig-area--art {
  align-items: stretch;
  padding: 0;
}
.fs-area.fig-area--art {
  padding: 1.25rem;
}
.fig-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.625rem;
  max-width: 420px;
}
.fig-type-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.3125rem;
  font-size: 0.65625rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: rgb(var(--color-accent));
  border: 1px solid rgb(var(--color-accent) / 0.5);
  border-radius: var(--radius-control);
  padding: 0.1875rem 0.5625rem;
}
.fig-glyph {
  font-size: 3.125rem;
  line-height: 1;
  color: rgb(var(--color-mute) / 0.5);
  margin-top: 0.375rem;
}
.fig-title {
  font-family: var(--font-body);
  font-size: var(--ui-size-20);
  font-weight: 500;
  line-height: 1.2;
  letter-spacing: -0.01em;
  color: rgb(var(--color-ink));
  margin: 0;
}
.fig-caption {
  font-family: var(--font-body);
  font-size: var(--ui-size-14);
  line-height: 1.45;
  color: rgb(var(--color-mute));
  margin: 0;
}
.fig-status {
  font-size: var(--ui-size-10);
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: rgb(var(--color-mute) / 0.8);
  margin: 0.125rem 0 0;
}
.fig-note {
  font-size: var(--ui-size-11);
  line-height: 1.5;
  color: rgb(var(--color-mute));
  margin: 0.625rem 0 0;
  max-width: 360px;
}
.note-tag {
  font-size: 0.59375rem;
  letter-spacing: 0.12em;
  color: rgb(var(--color-complete));
  margin-right: 0.25rem;
}

/*
 * On the dark pane (.figure-pane--dark, IllustrationsComp; OPENBRAIN-152),
 * as the History redesign draws the figure (Figma Yv7WvZSoabK2t5fNtsChvf,
 * Toolbar 2730:8241): the artwork on the dark surface, and the toolbar
 * below it as one row, the expand icon, then "FIG 05" in --color-warn, then
 * the title with its legend under it, all IBM Plex Mono — label and title
 * SemiBold at the sizes above (the designer traced them), the legend Text
 * at the title's size, white. The toolbar's borders are transparent there.
 * The legend is folded behind the "Legend" control that ends the row
 * (OPENBRAIN-177). The text column's inline figure never matches these
 * selectors and keeps the paper shell. The fullscreen dialog carries the
 * class when the chapter's pane is dark (DemoModal `ground`), but it has no
 * toolbar: its heading is .fs-label / .fs-name below.
 */
.figure-pane--dark .fig-shell {
  background: transparent;
}
.figure-pane--dark .fig-toolbar {
  order: 1;
  display: grid;
  grid-template-columns: auto auto minmax(0, 1fr) auto;
  column-gap: 0.5rem;
  row-gap: 0.5rem;
  align-items: start;
  padding: 1.875rem 0.875rem;
}
/* The artwork keeps a little air under the top bar (Anton, 11 Nov). */
.figure-pane--dark .fig-shell .fig-area--art {
  padding-top: 1rem;
}
/* Label and title become grid items of the toolbar, so the icon can lead
   the row and the legend can sit under the title. */
.figure-pane--dark .fig-toolbar-left,
.figure-pane--dark .fig-heading {
  display: contents;
}
/* The bare 14px icon flush with the padding, in the label's amber; the
   28px hit area reaches 7px around it, into the padding. */
.figure-pane--dark .fig-fs-btn {
  grid-row: 1;
  grid-column: 1;
  margin: -7px;
  border-color: transparent;
  color: rgb(var(--color-warn));
}
.figure-pane--dark .fig-fs-btn:hover {
  border-color: transparent;
  background: rgb(var(--figure-pane-ink) / 0.08);
  color: rgb(var(--figure-pane-ink));
}
/* The label's column is 50px in the Figma, so the title starts at 94px
   whatever the number. */
.figure-pane--dark .fig-label {
  grid-row: 1;
  grid-column: 2;
  min-width: 3.125rem;
  font-weight: 600;
  line-height: 1.3;
  color: rgb(var(--color-warn));
}
.figure-pane--dark .fig-name {
  grid-row: 1;
  grid-column: 3;
  font-weight: 600;
  line-height: 1.3;
  color: rgb(var(--figure-pane-ink));
}
.figure-pane--dark .fig-legend {
  grid-row: 2;
  grid-column: 3 / -1;
  font-family: var(--font-mono);
  font-size: 0.71875rem;
  line-height: 1.3;
  letter-spacing: 0.06em;
  color: rgb(var(--figure-pane-ink));
}
/* The legend's control ends the row, bare like the expand icon; amber while
   the legend is kept open. */
.figure-pane--dark .fig-legend-btn {
  grid-row: 1;
  grid-column: 4;
  margin: -8px -0.5rem -8px 0;
  border-color: transparent;
  color: rgb(var(--figure-pane-ink) / 0.72);
}
.figure-pane--dark .fig-legend-btn:hover {
  border-color: transparent;
  background: rgb(var(--figure-pane-ink) / 0.08);
  color: rgb(var(--figure-pane-ink));
}
.figure-pane--dark .fig-legend-btn[aria-expanded="true"] {
  color: rgb(var(--color-warn));
}
.figure-pane--dark .fig-legend-btn .fig-legend-caret {
  transform: none;
}
.figure-pane--dark .fig-legend-btn[aria-expanded="true"] .fig-legend-caret {
  transform: rotate(180deg);
}
/* The toolbar is under the artwork here, so the panel opens upwards over
   the artwork's foot, on the pane's own ground; its text starts where the
   title does (14px padding, the 14px icon, the label's 50px, two gaps). */
.figure-pane--dark .fig-legend--folds.is-open {
  grid-area: auto;
  top: auto;
  bottom: 100%;
  padding: 1rem 0.875rem 1rem 5.875rem;
  border: 0;
  border-top: 1px solid rgb(var(--figure-pane-ink) / 0.14);
  background: rgb(var(--color-dark-surface) / 0.94);
  line-height: 1.45;
  backdrop-filter: blur(8px);
}
:root[data-theme="dark"] .figure-pane--dark .fig-legend--folds.is-open {
  background: rgb(var(--color-bg) / 0.94);
}
/* The "artwork pending" state in the pane's ink. */
.figure-pane--dark .fig-title {
  color: rgb(var(--figure-pane-ink));
}
.figure-pane--dark .fig-caption,
.figure-pane--dark .fig-note,
.figure-pane--dark .fig-status {
  color: rgb(var(--figure-pane-ink) / 0.62);
}
.figure-pane--dark .fig-glyph {
  color: rgb(var(--figure-pane-ink) / 0.3);
}

/* Fill the shared full-viewport dialog's body. */
.fs-content {
  height: 100%;
  display: flex;
  flex-direction: column;
}
/* The dark dialog's heading, as the pane's toolbar: label in amber, title
   after it, IBM Plex Mono SemiBold. */
.fs-label,
.fs-name {
  font-family: var(--font-mono);
  font-weight: 600;
  line-height: 1.3;
  text-transform: uppercase;
}
.fs-label {
  margin-right: 0.75rem;
  font-size: var(--ui-size-12);
  letter-spacing: 0.12em;
  color: rgb(var(--color-warn));
}
.fs-name {
  font-size: var(--ui-size-13);
  letter-spacing: 0.06em;
}
.fs-glyph {
  font-size: 5rem;
}
.fs-title {
  font-size: 1.875rem;
}
</style>
