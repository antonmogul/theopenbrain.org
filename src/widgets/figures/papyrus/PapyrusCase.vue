<script setup>
/*
 * Case 20 of the Edwin Smith papyrus (OPENBRAIN-87): History Figure 4, after
 * Figma's layout (Open-Brain-Chapters 2045:21322). A tab per part of the
 * case (title, examination, diagnosis, treatment); each shows the part's
 * hieroglyphs with the translation under them.
 *
 * The tabs follow the WAI-ARIA tabs pattern: arrow keys, Home and End move
 * between them, and the panel is labelled by its tab.
 *
 * Self-contained: its surfaces are its own, the accent is the host's
 * --widget-accent (the chapter ramp), its words come in as `content`.
 */
import { computed, nextTick, ref, useId } from "vue";
/* eslint-disable import/no-unresolved -- Vite ?raw suffix is valid but not resolvable by ESLint */
import titleArt from "./art/title.svg?raw";
import examinationArt from "./art/examination.svg?raw";
import diagnosisArt from "./art/diagnosis.svg?raw";
import treatmentArt from "./art/treatment.svg?raw";
/* eslint-enable import/no-unresolved */

const props = defineProps({
  /** figureContent(schema, record): title, tabs, lines, translations, caption. */
  content: { type: Object, required: true },
  /** This figure's schema. */
  schema: { type: Object, required: true },
  /** Passed by the host to every figure widget; this one has no Lottie. */
  lottieUrl: { type: String, default: "" },
});

const ART = {
  title: titleArt,
  examination: examinationArt,
  diagnosis: diagnosisArt,
  treatment: treatmentArt,
};
/**
 * An SVG's viewBox size. The four parts are drawn at one scale, so a glyph
 * is the same size on every tab (the examination is simply longer).
 */
function viewBox(svg) {
  const m = /viewBox="[\d.]+ [\d.]+ ([\d.]+) ([\d.]+)"/.exec(svg);
  return m ? { w: Number(m[1]), h: Number(m[2]) } : { w: 400, h: 200 };
}

const uid = useId();
const current = ref(0);
const tabEls = ref([]);
const part = computed(() => props.schema.parts[current.value]);
const art = computed(() => ART[part.value]);
const artSize = computed(() => viewBox(art.value));

function select(i) {
  current.value = i;
}
async function onKey(e) {
  const n = props.schema.parts.length;
  const next = {
    ArrowRight: (current.value + 1) % n,
    ArrowLeft: (current.value - 1 + n) % n,
    Home: 0,
    End: n - 1,
  }[e.key];
  if (next === undefined) return;
  e.preventDefault();
  current.value = next;
  await nextTick();
  tabEls.value[next]?.focus();
}
</script>

<template>
  <div class="pc">
    <h4 class="pc-title">{{ content.title }}</h4>

    <div
      class="pc-tabs"
      role="tablist"
      :aria-label="content.title"
      @keydown="onKey"
    >
      <button
        v-for="(label, i) in content.tabs"
        :id="`${uid}-tab-${i}`"
        :key="i"
        ref="tabEls"
        type="button"
        role="tab"
        class="pc-tab"
        :class="{ 'is-on': current === i }"
        :aria-selected="current === i"
        :aria-controls="`${uid}-panel`"
        :tabindex="current === i ? 0 : -1"
        @click="select(i)"
      >
        {{ label }}
      </button>
    </div>

    <div
      :id="`${uid}-panel`"
      class="pc-panel"
      role="tabpanel"
      :aria-labelledby="`${uid}-tab-${current}`"
      tabindex="0"
    >
      <p v-if="content.lines[current]" class="pc-line">
        {{ content.lines[current] }}
      </p>
      <div class="pc-fit" aria-hidden="true">
        <!-- The figure's own SVG files (./art), not content from the page. -->
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div
          :key="part"
          class="pc-glyphs"
          :style="{ '--w': artSize.w, '--h': artSize.h }"
          v-html="art"
        />
      </div>
      <p class="pc-translation">{{ content.translations[current] }}</p>
    </div>

    <p class="pc-legend">{{ content.caption }}</p>
  </div>
</template>

<style scoped>
/* Figma's dark ground; the accent is the chapter's. Translations use the
   ramp's soft tone, which keeps contrast on the dark ground. */
.pc {
  --pc-bg: #333333;
  --pc-ink: #ffffff;
  --pc-ink-soft: rgb(255 255 255 / 0.72);
  --pc-line: rgb(255 255 255 / 0.85);
  --pc-accent: var(--widget-accent, rgb(var(--color-chapter)));
  --pc-accent-soft: var(--widget-accent-soft, rgb(var(--color-chapter-soft)));
  --pc-sans: "IBM Plex Sans", system-ui, sans-serif;
  --pc-mono: "IBM Plex Mono", ui-monospace, monospace;
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow: hidden;
  padding: 1.375rem 0 1.5rem;
  background: var(--pc-bg);
  color: var(--pc-ink);
  font-family: var(--pc-sans);
}
.pc .pc-title {
  margin: 0;
  padding: 0 3.75rem;
  font-family: var(--pc-sans);
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1.55;
  user-select: none;
}

.pc-tabs {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 1fr;
  flex: none;
  margin-top: 1.5rem;
  border-top: 1px solid var(--pc-line);
  border-bottom: 1px solid var(--pc-line);
}
.pc-tab {
  min-height: 3.375rem;
  padding: 0.5rem;
  border: 0;
  border-left: 1px solid var(--pc-line);
  background: transparent;
  color: var(--pc-ink);
  font: 1rem/1.3 var(--pc-mono);
  letter-spacing: 0.02em;
  text-transform: uppercase;
  cursor: pointer;
  transition: background-color 0.15s;
}
.pc-tab:first-child {
  border-left: 0;
}
.pc-tab:hover {
  background: rgb(255 255 255 / 0.08);
}
.pc-tab.is-on {
  background: var(--pc-accent);
  color: #fff;
}
.pc-tab:focus-visible,
.pc-panel:focus-visible {
  outline: 2px solid #fff;
  outline-offset: -4px;
}

.pc-panel {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  /* Short parts sit in the middle; a long one starts at the top and scrolls. */
  justify-content: safe center;
  gap: 1.25rem;
  padding: 2rem 3.75rem 1rem;
  overflow-y: auto;
}
.pc-panel p {
  margin: 0;
}
.pc-line {
  color: var(--pc-accent-soft);
  font: 0.8125rem/1 var(--pc-mono);
  letter-spacing: 0.08em;
}
/* One scale for every part (1.6 × Figma's), narrowed only when the panel
   is narrower than the part; a long part scrolls. */
.pc-fit {
  flex: none;
  width: 100%;
  display: grid;
  place-items: center;
}
.pc-glyphs {
  width: min(100%, calc(var(--w) * 1.6px));
  aspect-ratio: var(--w) / var(--h);
  color: var(--pc-accent);
}
.pc-glyphs :deep(svg) {
  display: block;
  width: 100%;
  height: 100%;
}
.pc-translation {
  flex: none;
  max-width: 40rem;
  color: var(--pc-accent-soft);
  font: italic 1.0625rem/1.67 var(--pc-sans);
  letter-spacing: 0.005em;
  text-align: center;
}

.pc-legend {
  flex: none;
  margin: 0;
  padding: 0.75rem 3.75rem 0;
  color: var(--pc-ink-soft);
  font: italic 0.8125rem/1.5 var(--pc-sans);
}

@container figure (max-width: 760px) {
  .pc .pc-title,
  .pc-legend {
    padding-left: 1rem;
    padding-right: 1rem;
  }
  .pc-tab {
    min-height: 2.75rem;
    font-size: 0.75rem;
  }
  .pc-panel {
    padding: 1.25rem 1rem 0.5rem;
  }
  .pc-translation {
    font-size: 0.9375rem;
  }
}
</style>
