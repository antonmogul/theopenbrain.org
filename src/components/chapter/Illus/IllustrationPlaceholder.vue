<script setup>
// Typed figure/diagram placeholder for the left illustration column.
//
// Fills the figure pane with a framed "diagram container": a toolbar at the top
// (figure label + name on the left, a fullscreen-expand button on the right) and
// the diagram area below. While a chapter's figures have no real artwork yet,
// the diagram area shows a labelled placeholder ("Artwork pending"). The shell
// is what every real diagram will eventually slot into.
//
// Expected props on `animation` (spread from animations.config in useAnimations.js):
//   placeholder: true        — routes IllustrationsComp here
//   figureNumber: 3          — "FIG 03" toolbar label (number | box letter)
//   diagramType: "photo"     — one of DIAGRAM_TYPES; renders a type chip
//   title: "Edwin Smith papyrus"  — diagram name in the toolbar + frame
//   description / caption    — optional supporting line
//   note                     — optional production note (what art to source)
import { ref, computed, onBeforeUnmount } from "vue";

const props = defineProps({
  animation: { type: Object, required: true },
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
const caption = computed(
  () => props.animation.caption || props.animation.description || ""
);

// Fullscreen expand — overlay the diagram over the whole viewport.
const isFullscreen = ref(false);
function openFullscreen() {
  isFullscreen.value = true;
  window.addEventListener("keydown", onKey);
}
function closeFullscreen() {
  isFullscreen.value = false;
  window.removeEventListener("keydown", onKey);
}
function onKey(e) {
  if (e.key === "Escape") closeFullscreen();
}
onBeforeUnmount(() => window.removeEventListener("keydown", onKey));
</script>

<template>
  <div class="fig-pane pointer-events-auto">
    <!-- Diagram container: toolbar + diagram area -->
    <figure class="fig-shell">
      <header class="fig-toolbar">
        <div class="fig-toolbar-left">
          <span class="fig-label">{{ figureLabel }}</span>
          <span class="fig-name">{{ title }}</span>
        </div>
        <button
          class="fig-fs-btn"
          type="button"
          title="Expand to full screen"
          aria-label="Expand to full screen"
          @click="openFullscreen"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
               stroke="currentColor" stroke-width="1.4" stroke-linecap="round">
            <path d="M1 5V1h4M13 5V1H9M1 9v4h4M13 9v4H9" />
          </svg>
        </button>
      </header>

      <!-- Diagram area (placeholder until real artwork lands) -->
      <div class="fig-area">
        <div class="fig-placeholder">
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

    <!-- Fullscreen overlay -->
    <Teleport to="body">
      <div v-if="isFullscreen" class="fs-overlay" @click.self="closeFullscreen">
        <div class="fs-inner">
          <header class="fig-toolbar fs-toolbar">
            <div class="fig-toolbar-left">
              <span class="fig-label">{{ figureLabel }}</span>
              <span class="fig-name">{{ title }}</span>
            </div>
            <button
              class="fig-fs-btn"
              type="button"
              title="Exit full screen (Esc)"
              aria-label="Exit full screen"
              @click="closeFullscreen"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
                   stroke="currentColor" stroke-width="1.4" stroke-linecap="round">
                <path d="M5 1v4H1M9 1v4h4M5 13V9H1M9 13V9h4" />
              </svg>
            </button>
          </header>
          <div class="fig-area fs-area">
            <div class="fig-placeholder">
              <span class="fig-type-chip">
                <span aria-hidden="true">{{ type.glyph }}</span> {{ type.label }}
              </span>
              <span class="fig-glyph fs-glyph" aria-hidden="true">{{ type.glyph }}</span>
              <p class="fig-title fs-title">{{ title }}</p>
              <p v-if="caption" class="fig-caption">{{ caption }}</p>
              <p class="fig-status">Artwork pending</p>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
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

/* Toolbar */
.fig-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.2rem;
  padding: 1rem 1.4rem;
  border-bottom: 1px solid rgb(var(--color-line));
  flex-shrink: 0;
}
.fig-toolbar-left {
  display: flex;
  align-items: baseline;
  gap: 1rem;
  min-width: 0;
}
.fig-label {
  font-size: 1.05rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: rgb(var(--color-mute));
  flex-shrink: 0;
}
.fig-name {
  font-size: 1.15rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgb(var(--color-ink));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.fig-fs-btn {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border: 1px solid rgb(var(--color-line));
  border-radius: 6px;
  background: transparent;
  color: rgb(var(--color-ink));
  cursor: pointer;
  flex-shrink: 0;
  transition: border-color 0.12s ease, background 0.12s ease;
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
  padding: 2rem;
}
.fig-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 1rem;
  max-width: 420px;
}
.fig-type-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.05rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: rgb(var(--color-accent));
  border: 1px solid rgb(var(--color-accent) / 0.5);
  border-radius: 999px;
  padding: 0.3rem 0.9rem;
}
.fig-glyph {
  font-size: 5rem;
  line-height: 1;
  color: rgb(var(--color-mute) / 0.5);
  margin-top: 0.6rem;
}
.fig-title {
  font-family: var(--font-body);
  font-size: 2rem;
  font-weight: 500;
  line-height: 1.2;
  letter-spacing: -0.01em;
  color: rgb(var(--color-ink));
  margin: 0;
}
.fig-caption {
  font-family: var(--font-body);
  font-size: 1.4rem;
  line-height: 1.45;
  color: rgb(var(--color-mute));
  margin: 0;
}
.fig-status {
  font-size: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: rgb(var(--color-mute) / 0.8);
  margin: 0.2rem 0 0;
}
.fig-note {
  font-size: 1.1rem;
  line-height: 1.5;
  color: rgb(var(--color-mute));
  margin: 1rem 0 0;
  max-width: 360px;
}
.note-tag {
  font-size: 0.95rem;
  letter-spacing: 0.12em;
  color: rgb(var(--color-complete));
  margin-right: 0.4rem;
}

/* Fullscreen overlay */
.fs-overlay {
  position: fixed;
  inset: 0;
  z-index: 400;
  background: rgb(var(--color-bg) / 0.96);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3vw;
}
.fs-inner {
  width: 100%;
  height: 100%;
  max-width: 1200px;
  display: flex;
  flex-direction: column;
  border: 1px solid rgb(var(--color-line));
  border-radius: 8px;
  background: rgb(var(--color-paper));
  overflow: hidden;
}
.fs-glyph {
  font-size: 8rem;
}
.fs-title {
  font-size: 3rem;
}
</style>
