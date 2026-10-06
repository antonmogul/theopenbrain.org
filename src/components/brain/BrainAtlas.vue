<script setup>
/*
 * BrainAtlas — the 3D brain as a way into the book (OPENBRAIN-127).
 *
 * A cortex you can turn, whose areas are coloured by the book's subject
 * ramps and lead to the chapters that cover them. It follows Tyler's
 * prototype: the hemispheres open like a book, hovering names an area, and a
 * Dopeframe timeline (helper/brain/dopeframe.js) drives the camera, the book
 * and the highlights, while the reader can drag the brain at any time and it
 * drifts back onto the path when they let go.
 *
 * Laid out like the home cover: the dark title block on the left (the
 * legend and the area card live there, as DOM text so they can be read,
 * selected and reached by keyboard; the canvas is decorative), the stage on
 * the right, the chapter-colour rule between them. Below the reader
 * breakpoint the stage comes first.
 *
 * The three.js work lives in helper/brain/brainStage.js; this file only
 * wires its callbacks to Vue state.
 */
import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  watch,
} from "vue";
import { useGeneral } from "@/stores/index";
import { useChapterCatalog } from "@/composables/useChapterCatalog";
import { reducedMotionK } from "@/helper/motion";
import { RAMP_NAMES } from "@/helper/chapterTheme";
import {
  SURFACE,
  areaById,
  areaHex,
  chapterLinks,
  systemsWithAreas,
} from "@/helper/brain/areas";
import { ATLAS_DOPEFRAME } from "@/helper/brain/dopeframe";
import { BRAIN_MODEL_URL, createBrainStage } from "@/helper/brain/brainStage";

const props = defineProps({
  /** Start the tour on load (always off under reduced motion). */
  autoplay: { type: Boolean, default: true },
  /** The atlas model; override only to point a story at a fixture. */
  modelUrl: { type: String, default: BRAIN_MODEL_URL },
});

const store = useGeneral();
const { fetchCatalog, findBySlug } = useChapterCatalog();

const canvasEl = ref(null);
const labelEl = ref(null);
const stage = shallowRef(null);

const status = ref("loading"); // loading | ready | error
const errorKind = ref("");
const progress = ref(null);
const reducedMotion = reducedMotionK() < 1;
const playing = ref(props.autoplay && !reducedMotion);
const bookOpen = ref(false);
const showAll = ref(false);
const hoveredId = ref(null);
const selectedId = ref(null);
const focusId = ref(null);
let resumeTourOnClose = false;

const systems = systemsWithAreas();
const selectedArea = computed(() => areaById(selectedId.value));
const focusArea = computed(() => areaById(focusId.value));
// findBySlug reads the catalog's ref, so this updates when it arrives.
const links = computed(() => chapterLinks(selectedArea.value, findBySlug));
const loadingCopy = computed(() =>
  progress.value == null
    ? "Loading the brain…"
    : `Loading the brain… ${Math.round(progress.value * 100)}%`
);

function select(id) {
  if (id && !selectedId.value) resumeTourOnClose = playing.value;
  selectedId.value = id || null;
  if (id) {
    playing.value = false;
  } else if (resumeTourOnClose) {
    resumeTourOnClose = false;
    playing.value = true;
  }
}

function togglePlaying() {
  playing.value = !playing.value;
  if (playing.value) selectedId.value = null;
}

function toggleBook() {
  playing.value = false;
  bookOpen.value = !bookOpen.value;
  stage.value?.setOpen(bookOpen.value);
}

function previewArea(id) {
  stage.value?.setHover(id);
}

function onKeydown(e) {
  if (e.key === "Escape" && selectedId.value) select(null);
}

watch(playing, (value) => {
  stage.value?.setPlaying(value);
  if (value) stage.value?.setOpen(null);
});
watch(selectedId, (id) => stage.value?.setSelected(id));
watch(showAll, (value) => stage.value?.setShowAll(value));
watch(
  () => store.activeMenu,
  (open) => stage.value?.setSuspended(open)
);

onMounted(() => {
  fetchCatalog();
  stage.value = createBrainStage({
    canvas: canvasEl.value,
    label: labelEl.value,
    url: props.modelUrl,
    dopeframe: ATLAS_DOPEFRAME,
    areaHex: (id) => {
      const area = areaById(id);
      return area ? areaHex(area) : null;
    },
    surface: SURFACE,
    playing: playing.value,
    reducedMotion,
    on: {
      progress: (p) => (progress.value = p),
      ready: () => (status.value = "ready"),
      error: (kind) => {
        status.value = "error";
        errorKind.value = kind;
      },
      hover: (id) => (hoveredId.value = id),
      select,
      focus: (id) => (focusId.value = id),
      open: (isOpen) => (bookOpen.value = isOpen),
    },
  });
});

onBeforeUnmount(() => stage.value?.dispose());
</script>

<template>
  <section class="atlas" aria-label="Brain atlas" @keydown="onKeydown">
    <div class="atlas__panel">
      <p class="atlas__eyebrow">The Open Brain · Atlas</p>
      <h1 class="atlas__title">
        <span class="atlas__title-lead">The brain,</span>
        opened like a book
      </h1>

      <!-- The chosen area takes the strapline's place, near the top, so it
           is in view without scrolling past the legend. -->
      <article
        v-if="selectedArea"
        class="card"
        :style="{ '--area': areaHex(selectedArea) }"
        aria-live="polite"
      >
        <p class="card__eyebrow">
          <span class="legend__dot" aria-hidden="true" />
          {{ RAMP_NAMES[selectedArea.system] }}
        </p>
        <h2 class="card__title">{{ selectedArea.name }}</h2>
        <p class="card__where">{{ selectedArea.where }}</p>
        <p class="card__blurb">{{ selectedArea.blurb }}</p>
        <div class="card__book">
          <p class="card__label">In the book</p>
          <ul v-if="links.length" class="card__links">
            <li v-for="link in links" :key="link.slug">
              <router-link v-if="link.to" :to="link.to" class="card__link">
                {{ link.title }} →
              </router-link>
              <span v-else class="card__soon">
                {{ link.title }} <em>in preparation</em>
              </span>
            </li>
          </ul>
          <p v-else class="card__soon">No chapter covers this area yet.</p>
        </div>
        <button type="button" class="card__close" @click="select(null)">
          Back to the tour
        </button>
      </article>
      <p v-else class="atlas__strap">
        Point at the cortex to name its areas, and choose one to find the
        chapters that cover it. Drag to turn the brain; let go and it drifts
        back to the tour.
      </p>

      <nav class="legend" aria-label="Areas of the cortex">
        <div
          v-for="system in systems"
          :key="system.ramp"
          class="legend__system"
        >
          <p class="legend__head">
            <span
              class="legend__dot"
              :style="{ background: system.hex }"
              aria-hidden="true"
            />
            {{ system.name }}
          </p>
          <ul class="legend__list">
            <li v-for="area in system.areas" :key="area.id">
              <button
                type="button"
                class="legend__area"
                :class="{
                  'is-hovered': hoveredId === area.id,
                  'is-selected': selectedId === area.id,
                }"
                :style="{ '--area': areaHex(area) }"
                :aria-pressed="selectedId === area.id"
                @mouseenter="previewArea(area.id)"
                @mouseleave="previewArea(null)"
                @focus="previewArea(area.id)"
                @blur="previewArea(null)"
                @click="select(selectedId === area.id ? null : area.id)"
              >
                {{ area.name }}
              </button>
            </li>
          </ul>
        </div>
      </nav>

      <p class="atlas__credit">
        Cortex: FreeSurfer fsaverage pial surface, areas from the Destrieux
        atlas, grouped. The cerebellum, brainstem and deep structures such as
        the hippocampus and amygdala are not modelled yet.
      </p>
    </div>

    <div class="atlas__stage" :data-status="status">
      <canvas ref="canvasEl" class="atlas__canvas" aria-hidden="true" />
      <div
        ref="labelEl"
        class="atlas__label"
        aria-hidden="true"
        :style="focusArea ? { '--area': areaHex(focusArea) } : null"
      >
        <template v-if="focusArea">
          <span class="atlas__label-name">{{ focusArea.name }}</span>
          <span class="atlas__label-system">{{
            RAMP_NAMES[focusArea.system]
          }}</span>
        </template>
      </div>

      <p v-if="status === 'loading'" class="atlas__status" role="status">
        {{ loadingCopy }}
      </p>
      <p v-else-if="status === 'error'" class="atlas__status" role="status">
        {{
          errorKind === "webgl"
            ? "This browser can't show the 3D brain (WebGL is off or unavailable)."
            : "The 3D brain couldn't be loaded."
        }}
        The areas are listed beside it.
      </p>

      <div
        v-if="status === 'ready'"
        class="atlas__controls"
        role="group"
        aria-label="Brain controls"
      >
        <button
          type="button"
          class="ctl"
          :aria-pressed="playing"
          @click="togglePlaying"
        >
          {{ playing ? "Pause tour" : "Play tour" }}
        </button>
        <button type="button" class="ctl" @click="toggleBook">
          {{ bookOpen ? "Close book" : "Open book" }}
        </button>
        <button
          type="button"
          class="ctl"
          :aria-pressed="showAll"
          @click="showAll = !showAll"
        >
          Colour all
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.atlas {
  position: relative;
  display: grid;
  grid-template-columns: minmax(20rem, 36rem) minmax(0, 1fr);
  min-height: 100svh;
  background: rgb(var(--color-dark-surface));
  color: #fff;
  font-family: var(--font-body);
}

/* ── Panel: the cover's title block ── */
.atlas__panel {
  display: flex;
  flex-direction: column;
  gap: clamp(1.25rem, 2.2vw, 2rem);
  padding: clamp(3rem, 7vw, 6rem) clamp(1.25rem, 3.47vw, 3.75rem);
  border-right: 1px solid rgb(var(--color-chapter));
}
.atlas__eyebrow,
.legend__head,
.card__eyebrow,
.card__label {
  margin: 0;
  font-family: var(--font-mono);
  font-size: var(--ui-size-11);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgb(255 255 255 / 0.55);
}
.atlas__title {
  margin: 0;
  padding: 0;
  font-size: clamp(var(--type-subhead-size), 3.2vw, 3.5rem);
  line-height: 1.2;
  font-weight: 450;
  text-wrap: balance;
}
.atlas__title-lead {
  display: block;
  color: rgb(var(--color-chapter));
}
.atlas__strap {
  margin: 0;
  max-width: 34rem;
  font-size: var(--type-body-size);
  line-height: 1.55;
  color: rgb(255 255 255 / 0.78);
}

/* ── Legend: the areas, grouped by the book's subjects ── */
.legend {
  display: grid;
  gap: 1.25rem;
}
.legend__head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.375rem;
}
.legend__dot {
  flex: none;
  width: 0.625rem;
  height: 0.625rem;
  border-radius: 999px;
  background: var(--area);
}
.legend__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}
.legend__area {
  padding: 0.4375rem 0.75rem;
  border: 1px solid rgb(255 255 255 / 0.22);
  border-radius: var(--radius-control);
  background: transparent;
  color: rgb(255 255 255 / 0.88);
  font-family: var(--font-ui);
  font-size: var(--ui-size-14);
  line-height: 1.2;
  cursor: pointer;
  transition:
    background-color 0.15s,
    border-color 0.15s,
    color 0.15s;
}
.legend__area:hover,
.legend__area.is-hovered {
  border-color: var(--area);
  background: rgb(255 255 255 / 0.06);
}
.legend__area.is-selected {
  border-color: var(--area);
  background: var(--area);
  color: rgb(var(--color-dark-surface));
}
.legend__area:focus-visible,
.ctl:focus-visible,
.card__close:focus-visible,
.card__link:focus-visible {
  outline: 2px solid rgb(var(--color-chapter));
  outline-offset: 3px;
}

/* ── Card: the selected area ── */
.card {
  display: grid;
  gap: 0.75rem;
  padding-top: 1.25rem;
  border-top: 2px solid var(--area);
}
.card__eyebrow {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.card__title {
  margin: 0;
  padding: 0;
  font-size: clamp(1.75rem, 2.4vw, 2.25rem);
  line-height: 1.15;
  font-weight: 450;
}
.card__where {
  margin: -0.375rem 0 0;
  font-size: var(--ui-size-14);
  color: rgb(255 255 255 / 0.6);
}
.card__blurb {
  margin: 0;
  max-width: 34rem;
  font-size: var(--type-body-sm-size);
  line-height: 1.6;
  color: rgb(255 255 255 / 0.82);
}
.card__book {
  display: grid;
  gap: 0.375rem;
}
.card__links {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.25rem;
}
.card__link {
  color: #fff;
  font-size: var(--ui-size-16);
  text-decoration: underline;
  text-decoration-color: var(--area);
  text-underline-offset: 0.25em;
}
.card__link:hover {
  color: var(--area);
}
.card__soon {
  margin: 0;
  font-size: var(--ui-size-15);
  color: rgb(255 255 255 / 0.7);
}
.card__soon em {
  margin-left: 0.375rem;
  font-style: normal;
  font-family: var(--font-mono);
  font-size: var(--ui-size-11);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgb(255 255 255 / 0.5);
}
.card__close {
  justify-self: start;
  padding: 0;
  border: 0;
  background: none;
  color: rgb(255 255 255 / 0.7);
  font-family: var(--font-mono);
  font-size: var(--ui-size-11);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  text-decoration: underline;
  text-underline-offset: 0.25em;
  cursor: pointer;
}
.card__close:hover {
  color: #fff;
}
.atlas__credit {
  margin: auto 0 0;
  max-width: 34rem;
  font-size: var(--ui-size-12);
  line-height: 1.5;
  color: rgb(255 255 255 / 0.45);
}

/* ── Stage ── */
.atlas__stage {
  position: sticky;
  top: 0;
  height: 100svh;
  min-width: 0;
  overflow: hidden;
  background: radial-gradient(
    ellipse at 50% 45%,
    rgb(255 255 255 / 0.06),
    transparent 65%
  );
}
/* index.css pins every canvas (position: fixed) for the legacy reader. */
.atlas__canvas {
  position: absolute;
  inset: 0;
  z-index: 0;
  display: block;
  width: 100%;
  height: 100%;
}
.atlas__label {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1;
  display: grid;
  gap: 0.125rem;
  padding: 0.5rem 0.75rem;
  border-left: 3px solid var(--area, #fff);
  background: rgb(var(--color-dark-surface) / 0.88);
  pointer-events: none;
  white-space: nowrap;
  opacity: 0;
  transition: opacity 0.2s;
}
.atlas__label[data-visible="true"] {
  opacity: 1;
}
.atlas__label-name {
  font-size: var(--ui-size-15);
  line-height: 1.2;
}
.atlas__label-system {
  font-family: var(--font-mono);
  font-size: var(--ui-size-10);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgb(255 255 255 / 0.6);
}
.atlas__status {
  position: absolute;
  inset: 50% 1.5rem auto;
  z-index: 1;
  margin: 0;
  transform: translateY(-50%);
  text-align: center;
  font-family: var(--font-mono);
  font-size: var(--ui-size-12);
  letter-spacing: 0.06em;
  color: rgb(255 255 255 / 0.7);
}
.atlas__controls {
  position: absolute;
  left: 50%;
  bottom: clamp(1rem, 3vh, 2rem);
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.5rem;
  width: max-content;
  max-width: calc(100% - 2rem);
  transform: translateX(-50%);
}
.ctl {
  padding: 0.625rem 0.875rem;
  border: 1px solid rgb(255 255 255 / 0.6);
  border-radius: var(--radius-control);
  background: rgb(var(--color-dark-surface) / 0.6);
  color: #fff;
  font-family: var(--font-mono);
  font-size: var(--ui-size-11);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
  transition:
    background-color 0.15s,
    color 0.15s;
}
.ctl:hover {
  background: rgb(255 255 255 / 0.12);
}
.ctl[aria-pressed="true"] {
  background: #fff;
  color: rgb(var(--color-dark-surface));
}

@media (prefers-reduced-motion: reduce) {
  .atlas__label,
  .legend__area,
  .ctl {
    transition: none;
  }
}

/* ── Below the two-column reader: stage above, panel below ── */
@media (max-width: 1023px) {
  .atlas {
    grid-template-columns: minmax(0, 1fr);
    min-height: 0;
  }
  .atlas__stage {
    position: relative;
    order: -1;
    height: 62svh;
    min-height: 22rem;
    border-bottom: 1px solid rgb(var(--color-chapter));
  }
  .atlas__panel {
    border-right: 0;
    padding-top: clamp(2rem, 6vw, 3rem);
  }
}
</style>
