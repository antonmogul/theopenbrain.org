<script setup>
// Typed figure/diagram placeholder for the left illustration column.
//
// Used by chapters whose figures or breakout boxes have no artwork yet (e.g. the
// "Foundations of Neuroscience" history chapter). Driven entirely by the animation
// row's `config` JSONB — no asset fetch — so it can never render a broken image.
//
// Expected props on `animation` (spread from animations.config in useAnimations.js):
//   placeholder: true        — routes IllustrationsComp here
//   figureNumber: 3          — shown as the "FIGURE 03" eyebrow (number | letter)
//   diagramType: "photo"     — one of the DIAGRAM_TYPES keys below; renders a chip
//   title: "Edwin Smith papyrus"  — the animation row's title
//   description / caption    — optional supporting line
//   note                     — optional production note for the team (what art to source)
import { computed } from "vue";

const props = defineProps({
  animation: { type: Object, required: true },
});

// Diagram taxonomy — the "different types of diagrams" the placeholders represent.
// label = chip text; icon = a single glyph hint. Extend as new types appear.
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

// Figure number can be numeric (1, 2, 3) or a box letter (A, B). Zero-pad numbers
// to two digits to match the chapter's mono "CH 02" / "FIGURE 03" eyebrow style.
const figureLabel = computed(() => {
  const n = props.animation.figureNumber;
  if (n === undefined || n === null || n === "") return "FIGURE";
  const isNumeric = typeof n === "number" || /^\d+$/.test(String(n));
  return `FIGURE ${isNumeric ? String(n).padStart(2, "0") : n}`;
});

const caption = computed(
  () => props.animation.caption || props.animation.description || ""
);
</script>

<template>
  <div class="placeholder-wrap pointer-events-auto">
    <div class="placeholder-frame">
      <header class="placeholder-head">
        <span class="eyebrow">{{ figureLabel }}</span>
        <span class="type-chip">
          <span class="type-glyph" aria-hidden="true">{{ type.glyph }}</span>
          {{ type.label }}
        </span>
      </header>

      <div class="placeholder-body">
        <span class="placeholder-glyph" aria-hidden="true">{{ type.glyph }}</span>
        <p class="placeholder-title">{{ animation.title || "Untitled figure" }}</p>
        <p v-if="caption" class="placeholder-caption">{{ caption }}</p>
        <p class="placeholder-status">Artwork pending</p>
      </div>

      <footer v-if="animation.note" class="placeholder-note">
        <span class="note-tag">NOTE</span> {{ animation.note }}
      </footer>
    </div>
  </div>
</template>

<style scoped>
.placeholder-wrap {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3rem 2.5rem;
  font-family: var(--font-mono);
}

.placeholder-frame {
  width: 100%;
  max-width: 460px;
  display: flex;
  flex-direction: column;
  gap: 1.6rem;
  padding: 2rem;
  border: 1px dashed rgb(var(--color-mute) / 0.55);
  border-radius: 4px;
  background: rgb(var(--color-paper));
}

.placeholder-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}
.eyebrow {
  font-size: 1.1rem;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: rgb(var(--color-mute));
}
.type-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.05rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: rgb(var(--color-accent));
  border: 1px solid rgb(var(--color-accent) / 0.5);
  border-radius: 999px;
  padding: 0.3rem 0.8rem;
}
.type-glyph {
  font-size: 1.2rem;
  line-height: 1;
}

.placeholder-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.9rem;
  padding: 2.4rem 1rem;
  border-top: 1px solid rgb(var(--color-line));
  border-bottom: 1px solid rgb(var(--color-line));
}
.placeholder-glyph {
  font-size: 4.2rem;
  line-height: 1;
  color: rgb(var(--color-mute) / 0.6);
}
.placeholder-title {
  font-family: var(--font-body);
  font-size: 1.9rem;
  font-weight: 500;
  line-height: 1.25;
  letter-spacing: -0.01em;
  color: rgb(var(--color-ink));
  margin: 0;
}
.placeholder-caption {
  font-family: var(--font-body);
  font-size: 1.4rem;
  line-height: 1.45;
  color: rgb(var(--color-mute));
  margin: 0;
}
.placeholder-status {
  font-size: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: rgb(var(--color-mute) / 0.8);
  margin: 0.4rem 0 0;
}

.placeholder-note {
  font-size: 1.15rem;
  line-height: 1.5;
  color: rgb(var(--color-mute));
}
.note-tag {
  font-size: 0.95rem;
  letter-spacing: 0.12em;
  color: rgb(var(--color-complete));
  margin-right: 0.4rem;
}
</style>
