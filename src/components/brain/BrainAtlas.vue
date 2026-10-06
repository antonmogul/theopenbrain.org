<script setup>
/*
 * BrainAtlas — the book's contents as a brain you can turn (OPENBRAIN-127).
 *
 * Every chapter is a part of the brain (helper/brain/areas.js says which):
 * the brain wears each chapter's colour on its part, pointing at a part
 * names the chapter, and choosing it opens the chapter's card with a link to
 * read it. Parts no chapter covers yet say so. It follows Tyler's prototype:
 * the hemispheres open like a book, and a Dopeframe timeline
 * (helper/brain/dopeframe.js) tours the chapters' parts while the reader can
 * drag the brain at any time; it drifts back onto the path when they let go.
 *
 * Laid out like the home cover: the dark title block on the left (the
 * contents and the card live there, as DOM text so they can be read,
 * selected and reached by keyboard; the canvas is decorative), the stage on
 * the right, the chapter-colour rule between them. Below the reader
 * breakpoint the stage comes first, as the home cover's art does, and the
 * card moves up under the title, next to the brain it describes.
 *
 * The three.js work lives in helper/brain/brainStage.js; this file wires its
 * callbacks to Vue state.
 */
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  useId,
  watch,
} from "vue";
import { useGeneral } from "@/stores/index";
import { useMediaQuery } from "@/composables/useMediaQuery";
import { useChapterCatalog } from "@/composables/useChapterCatalog";
import { reducedMotionK } from "@/helper/motion";
import { READER_WIDE_QUERY } from "@/helper/readerLayout";
import {
  AREAS,
  SURFACE,
  areaById,
  areaHex,
  bookChapters,
  chapterForArea,
  rampHex,
  unclaimedAreas,
  viewForAreas,
} from "@/helper/brain/areas";
import { ATLAS_DOPEFRAME } from "@/helper/brain/dopeframe";
import { BRAIN_MODEL_URL, createBrainStage } from "@/helper/brain/brainStage";
import BrainAtlasCard from "./BrainAtlasCard.vue";

const props = defineProps({
  /** Start the tour on load (always off under reduced motion). */
  autoplay: { type: Boolean, default: true },
  /** The atlas model; override only to point a story at a fixture. */
  modelUrl: { type: String, default: BRAIN_MODEL_URL },
});

// Resting tint of a chapter's part: full once its chapter is published,
// fainter while it is in preparation, in between until the catalog answers.
const TINT = { published: 0.5, preparing: 0.25, unknown: 0.4 };

const uid = useId();
const store = useGeneral();
const { fetchCatalog, modules, loaded } = useChapterCatalog();

const panelEl = ref(null);
const canvasEl = ref(null);
const labelEl = ref(null);
const stage = shallowRef(null);

const status = ref("loading"); // loading | ready | error
const errorKind = ref("");
const progress = ref(null);
const reducedMotion = reducedMotionK() < 1;
const playing = ref(props.autoplay && !reducedMotion);
const bookOpen = ref(false);
const hoveredId = ref(null); // area under the pointer or legend focus
// The area the stage's label names. It keeps the last one when the label
// hides, so the label fades out with its text and colour still on it.
const labelId = ref(null);
const selection = ref(null); // { kind: "chapter", slug } | { kind: "area", id }
const resumeTourOnClose = ref(false);
// Wide: the card goes after the contents, so the rows do not move under the
// pointer when it opens. Narrow: under the title, close to the stage above.
const wide = useMediaQuery(READER_WIDE_QUERY);

const chapters = computed(() => bookChapters(modules.value));
const unclaimed = computed(() => unclaimedAreas(chapters.value));
const chapterOf = (areaId) => chapterForArea(chapters.value, areaId);

const selectedChapter = computed(() =>
  selection.value?.kind === "chapter"
    ? chapters.value.find((c) => c.slug === selection.value.slug) || null
    : null
);
const selectedArea = computed(() =>
  selection.value?.kind === "area" ? areaById(selection.value.id) : null
);
const hoveredChapter = computed(() => chapterOf(hoveredId.value));
const labelArea = computed(() => areaById(labelId.value));
const labelChapter = computed(() => chapterOf(labelId.value));

const areaStyles = computed(() =>
  Object.fromEntries(
    AREAS.map((area) => {
      const chapter = chapterOf(area.id);
      let base = 0;
      if (chapter && !loaded.value) base = TINT.unknown;
      else if (chapter) base = chapter.to ? TINT.published : TINT.preparing;
      return [area.id, { hex: areaHex(area.id, chapters.value), base }];
    })
  )
);

const announcement = computed(() => {
  const name = selectedChapter.value?.title || selectedArea.value?.name;
  if (!name) return "";
  return `${name} selected. Its card is ${wide.value ? "after the contents" : "under the title"}.`;
});
const loadingCopy = computed(() =>
  progress.value == null
    ? "Loading the brain…"
    : `Loading the brain… ${Math.round(progress.value * 100)}%`
);

function partNames(chapter) {
  return chapter.areas.map((id) => areaById(id)?.name).join(" · ");
}
const pickKey = (sel) =>
  sel ? (sel.kind === "chapter" ? sel.slug : sel.id) : "";

function choose(next) {
  if (!next && !selection.value) return;
  if (next && !selection.value) resumeTourOnClose.value = playing.value;
  selection.value = next;
  if (next) {
    playing.value = false;
  } else if (resumeTourOnClose.value) {
    resumeTourOnClose.value = false;
    playing.value = true;
  }
}
/* Bring the card into view once it renders. */
function revealCard() {
  nextTick(() =>
    panelEl.value?.querySelector(".card")?.scrollIntoView({
      block: "nearest",
      behavior: reducedMotion ? "auto" : "smooth",
    })
  );
}
/* Chosen in the contents: turn the brain to show it (book open for the
   medial parts, closed for the lateral ones), then show its card. */
function toggle(next) {
  if (pickKey(selection.value) === pickKey(next)) return choose(null);
  choose(next);
  const ids =
    next.kind === "chapter"
      ? chapters.value.find((c) => c.slug === next.slug)?.areas || []
      : [next.id];
  stage.value?.setOpen(viewForAreas(ids) === "open");
  revealCard();
}
/* A part of the brain chosen on the canvas: its chapter, or the bare area.
   It is already in view, so the camera stays put. */
function chooseArea(areaId) {
  const chapter = chapterOf(areaId);
  if (chapter) choose({ kind: "chapter", slug: chapter.slug });
  else choose(areaId ? { kind: "area", id: areaId } : null);
  if (areaId) revealCard();
}
/* Close the card and give focus back to the entry that opened it. */
function closeCard() {
  const key = pickKey(selection.value);
  choose(null);
  nextTick(() => panelEl.value?.querySelector(`[data-pick="${key}"]`)?.focus());
}

function togglePlaying() {
  playing.value = !playing.value;
  resumeTourOnClose.value = false;
  if (playing.value) selection.value = null;
}
function toggleBook() {
  playing.value = false;
  bookOpen.value = !bookOpen.value;
  stage.value?.setOpen(bookOpen.value);
}
function preview(areaId) {
  stage.value?.setHover(areaId);
}

function onKeydown(e) {
  if (e.key === "Escape" && selection.value) closeCard();
}

watch(playing, (value) => {
  stage.value?.setPlaying(value);
  if (value) stage.value?.setOpen(null);
});
watch(selection, () => {
  const ids = selectedChapter.value
    ? selectedChapter.value.areas
    : selectedArea.value
      ? [selectedArea.value.id]
      : [];
  stage.value?.setSelected(ids);
});
watch(areaStyles, (styles) => stage.value?.setAreaStyles(styles));
watch(
  () => store.activeMenu,
  (open) => stage.value?.setSuspended(open)
);

onMounted(() => {
  window.addEventListener("keydown", onKeydown);
  fetchCatalog();
  stage.value = createBrainStage({
    canvas: canvasEl.value,
    label: labelEl.value,
    url: props.modelUrl,
    dopeframe: ATLAS_DOPEFRAME,
    areaStyles: areaStyles.value,
    groupFor: (areaId) => chapterOf(areaId)?.areas || [areaId],
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
      select: chooseArea,
      focus: (id) => {
        if (id) labelId.value = id;
      },
      open: (isOpen) => (bookOpen.value = isOpen),
    },
  });
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", onKeydown);
  stage.value?.dispose();
});
</script>

<template>
  <section class="atlas" aria-label="The book as a brain">
    <div ref="panelEl" class="atlas__panel">
      <p class="atlas__eyebrow">The Open Brain · Contents</p>
      <h1 class="atlas__title">
        <span class="atlas__title-lead">The brain,</span>
        opened like a book
      </h1>

      <p class="atlas__strap">
        Every chapter of the book is a part of the brain. Point at a part to see
        its chapter, and choose it to start reading.
        <template v-if="status !== 'error'"
          >Drag to turn the brain; while the tour plays, it drifts back when you
          let go.</template
        >
      </p>
      <p class="sr-only" aria-live="polite">{{ announcement }}</p>

      <BrainAtlasCard
        v-if="!wide"
        :chapter="selectedChapter"
        :area="selectedArea"
        :chapters="chapters"
        :loaded="loaded"
        :back-to-tour="resumeTourOnClose"
        @close="closeCard"
      />

      <nav class="contents" :aria-labelledby="`${uid}-contents`">
        <p :id="`${uid}-contents`" class="atlas__head">Contents</p>
        <ol class="contents__list">
          <li v-for="chapter in chapters" :key="chapter.slug">
            <button
              type="button"
              class="contents__chapter"
              :class="{
                'is-hovered': hoveredChapter?.slug === chapter.slug,
                'is-selected': selectedChapter?.slug === chapter.slug,
              }"
              :style="{ '--area': rampHex(chapter.ramp) }"
              :aria-pressed="selectedChapter?.slug === chapter.slug"
              :data-pick="chapter.slug"
              @mouseenter="preview(chapter.areas[0])"
              @mouseleave="preview(null)"
              @focus="preview(chapter.areas[0])"
              @blur="preview(null)"
              @click="toggle({ kind: 'chapter', slug: chapter.slug })"
            >
              <span
                class="contents__num"
                :class="{ 'is-unnumbered': !chapter.number }"
                aria-hidden="true"
                >{{ chapter.number }}</span
              >
              <span class="contents__main">
                <span class="contents__title"
                  ><span v-if="chapter.number" class="sr-only"
                    >Chapter {{ chapter.number }}: </span
                  >{{ chapter.title }}</span
                >
                <span class="contents__parts">{{ partNames(chapter) }}</span>
              </span>
              <span v-if="loaded && !chapter.to" class="contents__tag"
                >In preparation</span
              >
            </button>
          </li>
        </ol>

        <div
          v-if="unclaimed.length"
          class="unclaimed"
          role="group"
          :aria-labelledby="`${uid}-unclaimed`"
        >
          <p :id="`${uid}-unclaimed`" class="atlas__head">
            Not in the book yet
          </p>
          <ul class="unclaimed__list">
            <li v-for="area in unclaimed" :key="area.id">
              <button
                type="button"
                class="unclaimed__area"
                :class="{
                  'is-hovered': hoveredId === area.id,
                  'is-selected': selectedArea?.id === area.id,
                }"
                :style="{ '--area': areaHex(area.id, chapters) }"
                :aria-pressed="selectedArea?.id === area.id"
                :data-pick="area.id"
                @mouseenter="preview(area.id)"
                @mouseleave="preview(null)"
                @focus="preview(area.id)"
                @blur="preview(null)"
                @click="toggle({ kind: 'area', id: area.id })"
              >
                {{ area.name }}
              </button>
            </li>
          </ul>
        </div>
      </nav>

      <BrainAtlasCard
        v-if="wide"
        :chapter="selectedChapter"
        :area="selectedArea"
        :chapters="chapters"
        :loaded="loaded"
        :back-to-tour="resumeTourOnClose"
        @close="closeCard"
      />

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
        :style="{
          '--area': labelArea ? areaHex(labelArea.id, chapters) : null,
        }"
      >
        <template v-if="labelArea">
          <span class="atlas__label-name">{{
            labelChapter ? labelChapter.title : labelArea.name
          }}</span>
          <span class="atlas__label-sub">{{
            labelChapter ? labelArea.name : "Not in the book yet"
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
        The chapters are listed beside it.
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
          :class="{ 'is-on': playing }"
          @click="togglePlaying"
        >
          {{ playing ? "Pause tour" : "Play tour" }}
        </button>
        <button type="button" class="ctl" @click="toggleBook">
          {{ bookOpen ? "Close book" : "Open book" }}
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.atlas {
  position: relative;
  display: grid;
  /* As the home cover: an even split, the panel capped on wide screens. */
  grid-template-columns: minmax(20rem, 1fr) minmax(0, 1fr);
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
.atlas__head {
  margin: 0;
  font-family: var(--font-mono);
  font-size: var(--ui-size-11);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgb(255 255 255 / 0.6);
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

/* ── Contents: the chapters as parts of the brain ── */
.contents {
  display: grid;
  gap: 1.5rem;
}
.contents__list {
  list-style: none;
  margin: 0.5rem 0 0;
  padding: 0;
}
.contents__chapter {
  display: grid;
  grid-template-columns: 2rem minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.875rem;
  width: 100%;
  padding: 0.75rem 0.5rem 0.75rem 0;
  border: 0;
  border-top: 1px solid var(--area);
  background: transparent;
  color: #fff;
  font-family: var(--font-body);
  text-align: left;
  cursor: pointer;
  transition: background-color 0.15s;
}
.contents__chapter:hover,
.contents__chapter.is-hovered {
  background: rgb(255 255 255 / 0.06);
}
.contents__chapter.is-selected {
  background: rgb(255 255 255 / 0.1);
  box-shadow: inset 3px 0 0 var(--area);
}
.contents__num {
  display: grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  border-radius: 999px;
  background: var(--area);
  color: rgb(var(--color-dark-surface));
  font-size: var(--ui-size-15);
  font-weight: 500;
}
.contents__num.is-unnumbered {
  background: transparent;
  box-shadow: inset 0 0 0 2px var(--area);
}
.contents__main {
  display: grid;
  gap: 0.125rem;
  min-width: 0;
}
.contents__title {
  font-size: var(--ui-size-18);
  line-height: 1.3;
}
.contents__parts {
  font-size: var(--ui-size-13);
  color: rgb(255 255 255 / 0.65);
}
.contents__tag {
  font-family: var(--font-mono);
  font-size: var(--ui-size-10);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgb(255 255 255 / 0.6);
}
.unclaimed__list {
  list-style: none;
  margin: 0.5rem 0 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}
.unclaimed__area {
  padding: 0.4375rem 0.75rem;
  border: 1px solid rgb(255 255 255 / 0.22);
  border-radius: var(--radius-control);
  background: transparent;
  color: rgb(255 255 255 / 0.82);
  font-family: var(--font-ui);
  font-size: var(--ui-size-14);
  line-height: 1.2;
  cursor: pointer;
  transition:
    background-color 0.15s,
    border-color 0.15s;
}
.unclaimed__area:hover,
.unclaimed__area.is-hovered {
  border-color: var(--area);
  background: rgb(255 255 255 / 0.06);
}
.unclaimed__area.is-selected {
  border-color: var(--area);
  background: rgb(255 255 255 / 0.12);
  box-shadow: inset 0 0 0 1px var(--area);
  color: #fff;
}
.contents__chapter:focus-visible,
.unclaimed__area:focus-visible,
.ctl:focus-visible {
  outline: 2px solid rgb(var(--color-chapter));
  outline-offset: 3px;
}

.atlas__credit {
  margin: auto 0 0;
  max-width: 34rem;
  font-size: var(--ui-size-12);
  line-height: 1.5;
  color: rgb(255 255 255 / 0.5);
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
.atlas__label-sub {
  font-family: var(--font-mono);
  font-size: var(--ui-size-10);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgb(255 255 255 / 0.65);
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
  /* Equal widths, so the row does not shift when a label changes. */
  min-width: 7.5rem;
  text-align: center;
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
.ctl.is-on {
  background: #fff;
  color: rgb(var(--color-dark-surface));
}

@media (prefers-reduced-motion: reduce) {
  .atlas__label,
  .contents__chapter,
  .unclaimed__area,
  .ctl {
    transition: none;
  }
}

@media (min-width: 1280px) {
  .atlas {
    grid-template-columns: minmax(20rem, 36rem) minmax(0, 1fr);
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
