<script setup>
/*
 * FigureBar — the toolbar row of a figure widget that draws its own
 * (History's trepanation and papyrus): the pane's row on the dark ground,
 * the label, the title, and the legend folded behind a "Legend" control
 * that ends the row, exactly as the image shell has it
 * (IllustrationPlaceholder on .figure-pane--dark; the behaviour is shared,
 * composables/useFigureLegend).
 *
 * The two widgets each drew this row with the legend always open, so in a
 * chapter whose every other legend is folded these two stood open and took
 * the artwork's room (OPENBRAIN-195; Stuart, 13 Nov: "a few of them are
 * still open by default (e.g., methods of trepanation, Edwin smith papyrus
 * case 20)").
 *
 * - In the pane a mouse resting on the heading, or keyboard focus on the
 *   control, floats the legend over the foot of the artwork; a click keeps
 *   it under the title.
 * - Inline in the text column (the host's `fit`, below the two-column
 *   reader) there is no look: a tap opens it under the title, and the page
 *   re-measures.
 * - Folded, it stays in the document for screen readers.
 *
 * The `lead` slot takes a control that leads the row (the papyrus's expand
 * button). The label and the control's lit state take `--fbar-accent`; the
 * rest is the widget's ink.
 */
import { inject, nextTick, useId } from "vue";
import ScrollTrigger from "gsap/ScrollTrigger";
import { useFigureLegend } from "@/composables/useFigureLegend";
import { FIGURE_WIDGET_FIT } from "./figureFit.js";

defineProps({
  /** "Fig 02". */
  label: { type: String, default: "" },
  title: { type: String, default: "" },
  legend: { type: String, default: "" },
});

// The host sizes the widget to its content (inline): the row is then part
// of the page, and opening the legend moves what follows.
const fit = inject(FIGURE_WIDGET_FIT, null);
const inFlow = () => !!fit?.value;
const legendId = `fbar-legend-${useId()}`;
const {
  pinned,
  folded,
  open,
  onHover,
  onLeave,
  onFocus,
  onBlur,
  toggle,
  close,
} = useFigureLegend({
  floats: () => !inFlow(),
  onMove: () => {
    if (inFlow()) nextTick(() => ScrollTrigger.refresh());
  },
});
</script>

<template>
  <div
    class="fbar"
    :class="{ 'fbar--lead': $slots.lead }"
    @pointerleave="onLeave"
    @keydown.esc="close"
  >
    <slot name="lead" />
    <span class="fbar-fig" @pointerover="onHover">{{ label }}</span>
    <h4 class="fbar-title" @pointerover="onHover">{{ title }}</h4>
    <template v-if="legend">
      <button
        type="button"
        class="fbar-legend-btn"
        :aria-expanded="pinned ? 'true' : 'false'"
        :aria-controls="legendId"
        :title="pinned ? 'Hide the legend' : 'Show the legend'"
        @click="toggle"
        @pointerover="onHover"
        @focus="onFocus"
        @blur="onBlur"
      >
        <span>Legend</span>
        <svg
          class="fbar-caret"
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
      <p
        :id="legendId"
        class="fbar-legend"
        :class="{ 'fbar-legend--folds': folded, 'is-open': open }"
      >
        {{ legend }}
      </p>
    </template>
  </div>
</template>

<style scoped>
/* The pane's toolbar row (IllustrationPlaceholder on the dark pane): the
   label in the accent, then the title, then the legend's control; the
   legend under the title once it is kept open. */
.fbar {
  --fbar-ink: #ffffff;
  position: relative;
  flex: none;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  column-gap: 0.5rem;
  row-gap: 0.5rem;
  align-items: start;
  padding: 1.875rem 0.875rem;
  color: var(--fbar-ink);
  font-family: var(--font-mono, "IBM Plex Mono", ui-monospace, monospace);
  line-height: 1.3;
}
.fbar--lead {
  grid-template-columns: auto auto minmax(0, 1fr) auto;
}
.fbar-fig {
  min-width: 3.125rem;
  color: var(--fbar-accent, rgb(var(--color-warn, 244 166 33)));
  font-size: 0.65625rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.fbar .fbar-title {
  margin: 0;
  color: inherit;
  font-family: inherit;
  font-size: 0.71875rem;
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

/* The control ends the row, bare like the pane's; lit while the legend is
   kept open. Its 28px target reaches into the row's padding. */
.fbar-legend-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  height: 28px;
  margin: -8px -0.5rem -8px 0;
  padding: 0 0.5rem;
  border: 1px solid transparent;
  border-radius: var(--radius-control, 2px);
  background: transparent;
  color: color-mix(in srgb, var(--fbar-ink) 72%, transparent);
  font-family: inherit;
  font-size: 0.65625rem;
  font-weight: 600;
  line-height: 1;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  cursor: pointer;
  transition:
    background-color 0.12s ease,
    color 0.12s ease;
}
/* Only where there is a pointer to hover with: a tap leaves :hover on. */
@media (hover: hover) {
  .fbar-legend-btn:hover {
    background: color-mix(in srgb, var(--fbar-ink) 8%, transparent);
    color: var(--fbar-ink);
  }
}
.fbar-legend-btn[aria-expanded="true"] {
  color: var(--fbar-accent, rgb(var(--color-warn, 244 166 33)));
}
.fbar-legend-btn:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 2px;
}
/* The caret points the way the legend opens: up over the artwork. */
.fbar-caret {
  transition: transform 0.16s ease;
}
.fbar-legend-btn[aria-expanded="true"] .fbar-caret {
  transform: rotate(180deg);
}

/* Kept open: under the title. */
.fbar .fbar-legend {
  grid-column: -3 / -1;
  max-width: 34.5rem;
  margin: 0;
  font-size: 0.71875rem;
  line-height: 1.3;
  letter-spacing: 0.06em;
}
/* Folded: out of sight, still in the document for assistive technology. */
.fbar .fbar-legend--folds:not(.is-open) {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
/* A look: a panel over the foot of the artwork, as wide as the figure, on
   the pane's own ground. It takes no grid area: an absolutely placed grid
   item measures from its area, and this one must measure from the row. */
.fbar .fbar-legend--folds.is-open {
  position: absolute;
  grid-area: auto;
  z-index: 5;
  left: 0;
  right: 0;
  bottom: 100%;
  max-width: none;
  max-height: min(18rem, 45vh);
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 1rem 0.875rem;
  border-top: 1px solid color-mix(in srgb, var(--fbar-ink) 14%, transparent);
  background: rgb(var(--color-figure-ground, 39 39 39) / 0.94);
  line-height: 1.45;
  backdrop-filter: blur(8px);
  animation: fbar-legend-in 0.16s ease;
}
@keyframes fbar-legend-in {
  from {
    opacity: 0;
  }
}

/* A narrow box (a phone, a breakout box's column): less air, the legend
   the full width of the row. */
@container figure (max-width: 560px) {
  .fbar {
    padding: 1.25rem 0.875rem;
  }
  .fbar .fbar-legend {
    grid-column: 1 / -1;
  }
}
/* A finger needs 44px. */
@media (pointer: coarse) {
  .fbar-legend-btn {
    height: 2.75rem;
    margin: -1rem -0.75rem -1rem 0;
    padding: 0 0.75rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  :root:not([data-reduce-motion="0"]) .fbar .fbar-legend--folds.is-open {
    animation: none;
  }
  :root:not([data-reduce-motion="0"]) .fbar-caret,
  :root:not([data-reduce-motion="0"]) .fbar-legend-btn {
    transition: none;
  }
}
:root[data-reduce-motion="1"] .fbar .fbar-legend--folds.is-open {
  animation: none;
}
:root[data-reduce-motion="1"] .fbar-caret,
:root[data-reduce-motion="1"] .fbar-legend-btn {
  transition: none;
}
</style>
