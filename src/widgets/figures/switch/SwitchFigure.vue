<script setup>
/*
 * Switch figures (OPENBRAIN-82): center-surround receptive fields,
 * direction selectivity, object motion sensitivity, and rod vs. cone
 * circuits, matched to theopenbrain.org (v0.2.3). They live in the reader's
 * figure panel: a title, a pause button, a switch between versions of the
 * drawing (one looping Lottie each), and a legend that opens below.
 *
 * One component, one schema per figure: the schema holds the Lottie of each
 * switch (`variants`) and the legend's symbols (`legendArt`); `content`
 * holds the words. It sits on the reader's own ground; the accent (the
 * host's --widget-accent, the chapter ramp) marks the chosen switch.
 */
import { computed, onBeforeUnmount, onMounted, ref, useId } from "vue";
import { versionedUrl } from "../content.js";
import { prefersReducedMotion } from "../shared/motion.js";
import { useFigureLottie } from "../shared/useFigureLottie.js";

const props = defineProps({
  /** figureContent(schema, record): title, switches, legend. */
  content: { type: Object, required: true },
  /** The figure's schema: variants, legendArt, lottieVersion. */
  schema: { type: Object, required: true },
  /** Passed by the host to every figure widget; this one plays `variants`. */
  lottieUrl: { type: String, default: "" },
});

const root = ref(null);
const active = ref(0);
const paused = ref(false);
const legendOpen = ref(false);
const stages = ref([]);
// Unique per instance: the same figure can be on the page twice.
const legendId = `${props.schema.id}-legend-${useId()}`;
let observer = null;
let visible = true;
// One loader per version of the drawing; each keeps its own stage.
const loaders = props.schema.variants.map((_, i) =>
  useFigureLottie(
    {
      get value() {
        return stages.value[i] || null;
      },
    },
    `${props.schema.id} #${i + 1}`
  )
);
const reducedMotion = prefersReducedMotion();

/** Only the version on show can say it didn't load. */
const failed = computed(() => loaders[active.value]?.failed.value);

/**
 * Play only the chosen version, from its start; hold the rest. Held still
 * (reduced motion, or paused), a version shows its still frame: the drawing
 * with its signals in, where frame 0 has only the outlines.
 */
function show(i) {
  loaders.forEach((l, j) => {
    const a = l.anim;
    if (!a) return;
    if (j !== i) a.pause();
    else if (reducedMotion || paused.value)
      a.goToAndStop(props.schema.variants[i].stillFrame ?? 0, true);
    else {
      a.goToAndPlay(0, true);
      if (!visible) a.pause();
    }
  });
}

function choose(i) {
  if (i === active.value) return;
  active.value = i;
  show(i);
}

function togglePause() {
  paused.value = !paused.value;
  const a = loaders[active.value].anim;
  if (!a) return;
  if (paused.value) a.pause();
  else a.play();
}

onMounted(async () => {
  // Only animate while on screen (the phone's inline figures all mount).
  if (typeof IntersectionObserver !== "undefined" && root.value) {
    observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      const a = loaders[active.value].anim;
      if (!a || reducedMotion || paused.value) return;
      if (visible) a.play();
      else a.pause();
    });
    observer.observe(root.value);
  }
  await Promise.all(
    props.schema.variants.map((v, i) =>
      loaders[i].mount(versionedUrl(v.file, props.schema.lottieVersion), {
        loop: true,
      })
    )
  );
  // Some play slower than recorded (ON & OFF runs at half speed).
  if (props.schema.speed)
    loaders.forEach((l) => l.anim?.setSpeed(props.schema.speed));
  show(active.value);
});
onBeforeUnmount(() => {
  observer?.disconnect();
  loaders.forEach((l) => l.destroy());
});
</script>

<template>
  <div ref="root" class="sf">
    <div class="sf-controls">
      <h4 class="sf-title">{{ content.title }}</h4>

      <div class="sf-switch" role="group" :aria-label="content.title">
        <button
          v-for="(label, i) in content.switches"
          :key="i"
          type="button"
          class="sf-option"
          :class="{ 'is-on': active === i }"
          :aria-pressed="active === i"
          @click="choose(i)"
        >
          {{ label }}
        </button>
      </div>

      <button
        type="button"
        class="sf-legend-toggle"
        :aria-expanded="legendOpen"
        :aria-controls="legendId"
        @click="legendOpen = !legendOpen"
      >
        <span class="sf-round" :class="{ 'is-open': legendOpen }">
          <svg viewBox="0 0 32 32" aria-hidden="true">
            <path d="M16 8v16M8 16h16" />
          </svg>
        </span>
        Legend
      </button>
      <ul v-show="legendOpen" :id="legendId" class="sf-legend">
        <li v-for="(label, i) in content.legend" :key="i">
          <img :src="schema.legendArt[i]?.icon" alt="" loading="lazy" />
          <span>{{ label }}</span>
        </li>
      </ul>
    </div>

    <button
      v-if="!reducedMotion"
      type="button"
      class="sf-round sf-pause"
      :aria-label="paused ? 'Play the animation' : 'Pause the animation'"
      @click="togglePause"
    >
      <svg v-if="paused" viewBox="0 0 32 32" aria-hidden="true">
        <path d="M12 9l12 7-12 7z" class="fill" />
      </svg>
      <svg v-else viewBox="0 0 32 32" aria-hidden="true">
        <path d="M13 10v12M19 10v12" />
      </svg>
    </button>

    <div class="sf-drawing" :class="{ 'is-narrow': legendOpen }">
      <div
        v-for="(v, i) in schema.variants"
        v-show="active === i"
        :key="i"
        :ref="(el) => (stages[i] = el)"
        class="sf-stage"
        aria-hidden="true"
      />
      <p v-if="failed" class="sf-failed" role="alert">
        The animation didn't load. Reload the page to try again.
      </p>
    </div>
  </div>
</template>

<style scoped>
/* On the reader's own ground, as v0.2.3's panel sat on its page. */
.sf {
  --sf-accent: var(--widget-accent, rgb(var(--color-chapter)));
  --sf-accent-deep: var(--widget-accent-deep, rgb(var(--color-chapter-deep)));
  --sf-ink: #000;
  --sf-sans: "IBM Plex Sans", system-ui, sans-serif;
  --sf-mono: "IBM Plex Mono", ui-monospace, monospace;
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  color: var(--sf-ink);
  font-family: var(--sf-mono);
}

.sf-controls {
  position: absolute;
  z-index: 3;
  top: 1.25rem;
  left: 3.625rem;
  right: 5rem;
  display: grid;
  justify-items: start;
  gap: 0;
  /* A long legend scrolls on short screens instead of running off. */
  max-height: calc(100% - 2.5rem);
  overflow-y: auto;
  overscroll-behavior: contain;
}
.sf .sf-title {
  margin: 0 0 2.25rem;
  font-family: var(--sf-sans);
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1.55;
  user-select: none;
}

.sf-switch {
  display: grid;
  gap: 0.875rem;
  width: 10rem;
}
.sf-option {
  min-height: 2rem;
  padding: 0.375rem 0.75rem;
  border: 1px solid var(--sf-ink);
  background: transparent;
  color: var(--sf-ink);
  font: 0.8125rem/1.3 var(--sf-mono);
  text-align: center;
  cursor: pointer;
  transition:
    background-color 0.1s,
    border-color 0.1s,
    color 0.1s;
}
.sf-option:hover {
  border-color: var(--sf-accent);
  color: var(--sf-accent-deep);
}
.sf-option.is-on {
  background: var(--sf-accent);
  border-color: var(--sf-accent);
  color: #000;
  font-weight: 600;
  pointer-events: none;
}

.sf-round {
  display: grid;
  place-items: center;
  flex: none;
  width: 2rem;
  height: 2rem;
  padding: 0;
  border: 1px solid #000;
  border-radius: 50%;
  background: #fff;
  color: #000;
  cursor: pointer;
}
.sf-round svg {
  width: 1.25rem;
  height: 1.25rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  transition: transform 0.3s;
}
.sf-round svg .fill {
  fill: currentColor;
  stroke: none;
}
.sf-round.is-open svg {
  transform: rotate(45deg);
}

.sf-legend-toggle {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 1rem;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: 0.8125rem/1.3 var(--sf-mono);
  cursor: pointer;
}
.sf-legend {
  display: grid;
  gap: 0.625rem;
  margin: 1rem 0 0;
  padding: 0;
  list-style: none;
  font-size: 0.8125rem;
}
.sf-legend li {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  white-space: nowrap;
}
.sf-legend img {
  width: 3rem;
  height: 1.875rem;
  object-fit: contain;
}
.sf :deep(sup) {
  padding: 0 1px;
  font-size: 0.6em;
  line-height: 0;
  vertical-align: super;
}

.sf-pause {
  position: absolute;
  z-index: 3;
  top: 1.25rem;
  right: 1.5rem;
}
.sf-option:focus-visible,
.sf-legend-toggle:focus-visible,
.sf-round:focus-visible {
  outline: 2px solid var(--sf-accent);
  outline-offset: 2px;
}

/* The drawing fills the panel, beside the controls; it gives way to the
   open legend as the original's did (80% width). */
.sf-drawing {
  position: absolute;
  inset: 0 0 0 auto;
  width: 100%;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  /* The original's panel padding; the drawing scales with the width and
     sits in the middle of the panel's height. */
  padding: 1.25rem 1.875rem 1.25rem 6.25rem;
  transition: width 0.3s;
}
.sf-drawing.is-narrow {
  width: 80%;
}
.sf-stage {
  width: 100%;
  height: auto;
  max-height: 100%;
}
.sf-failed {
  position: absolute;
  right: 2rem;
  bottom: 2rem;
  max-width: 22rem;
  margin: 0;
  padding: 0.5rem 0.75rem;
  background: #fff;
  border: 1px solid #000;
  font: 0.875rem/1.4 var(--sf-sans);
}

/* Narrow screens (the figure inline in the text): controls above. */
@container figure (max-width: 560px) {
  .sf {
    display: flex;
    flex-direction: column;
  }
  .sf-controls {
    position: relative;
    inset: auto;
    flex: 0 1 auto;
    min-height: 0;
    max-height: 55%;
    padding: 1rem;
  }
  .sf .sf-title {
    margin-bottom: 1rem;
    padding-right: 3rem;
  }
  .sf-switch {
    grid-auto-flow: column;
    width: auto;
  }
  .sf-drawing,
  .sf-drawing.is-narrow {
    position: relative;
    inset: auto;
    flex: 1 0 45%;
    width: 100%;
    min-height: 0;
    padding: 0 1rem 1rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .sf-option,
  .sf-round svg,
  .sf-drawing {
    transition: none;
  }
}
</style>
