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
 * breakpoint the stage comes first, as the home cover's art does.
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
import { useChapterCatalog } from "@/composables/useChapterCatalog";
import { reducedMotionK } from "@/helper/motion";
import { RAMP_NAMES } from "@/helper/chapterTheme";
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
const focusId = ref(null); // area the stage's label is on
const selection = ref(null); // { kind: "chapter", slug } | { kind: "area", id }
const resumeTourOnClose = ref(false);

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
const focusArea = computed(() => areaById(focusId.value));
const focusChapter = computed(() => chapterOf(focusId.value));

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
  if (selectedChapter.value)
    return `${selectedChapter.value.title} selected. Its card is under the title.`;
  if (selectedArea.value)
    return `${selectedArea.value.name} selected. Its card is under the title.`;
  return "";
});
const loadingCopy = computed(() =>
  progress.value == null
    ? "Loading the brain…"
    : `Loading the brain… ${Math.round(progress.value * 100)}%`
);

function partNames(chapter) {
  return chapter.areas.map((id) => areaById(id)?.name).join(" · ");
}
function chapterEyebrow(chapter) {
  const lead = chapter.number
    ? `Chapter ${chapter.number}`
    : loaded.value
      ? "In preparation"
      : "Chapter";
  return `${lead} · ${RAMP_NAMES[chapter.ramp]}`;
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
/* The card sits under the contents: bring it into view once it renders. */
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
      focus: (id) => (focusId.value = id),
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
          >Drag to turn the brain{{
            playing ? "; let go and it drifts back to the tour" : ""
          }}.</template
        >
      </p>
      <p class="sr-only" aria-live="polite">{{ announcement }}</p>

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

      <!-- The chosen chapter or area. It sits under the contents so the
           rows do not move under the pointer when it opens. -->
      <article
        v-if="selectedChapter"
        class="card"
        :style="{ '--area': rampHex(selectedChapter.ramp) }"
      >
        <p class="card__eyebrow">
          <span class="dot" aria-hidden="true" />
          {{ chapterEyebrow(selectedChapter) }}
        </p>
        <h2 class="card__title">{{ selectedChapter.title }}</h2>
        <p class="card__blurb">{{ selectedChapter.why }}</p>
        <ul class="card__parts">
          <li v-for="id in selectedChapter.areas" :key="id">
            <span class="card__part">{{ areaById(id)?.name }}</span>
            <span class="card__where">{{ areaById(id)?.where }}</span>
          </li>
        </ul>
        <router-link
          v-if="selectedChapter.to"
          :to="selectedChapter.to"
          class="card__cta"
        >
          Read the chapter →
        </router-link>
        <p v-else-if="loaded" class="card__soon">
          This chapter is in preparation.
        </p>
        <button type="button" class="card__close" @click="closeCard">
          {{ resumeTourOnClose ? "Back to the tour" : "Close" }}
        </button>
      </article>
      <article
        v-else-if="selectedArea"
        class="card"
        :style="{ '--area': areaHex(selectedArea.id, chapters) }"
      >
        <p class="card__eyebrow">
          <span class="dot" aria-hidden="true" />
          Not in the book yet · {{ RAMP_NAMES[selectedArea.system] }}
        </p>
        <h2 class="card__title">{{ selectedArea.name }}</h2>
        <p class="card__where">{{ selectedArea.where }}</p>
        <p class="card__blurb">{{ selectedArea.blurb }}</p>
        <p class="card__soon">
          No chapter covers this part yet; it belongs with
          {{ RAMP_NAMES[selectedArea.system] }}.
        </p>
        <button type="button" class="card__close" @click="closeCard">
          {{ resumeTourOnClose ? "Back to the tour" : "Close" }}
        </button>
      </article>

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
          '--area': focusArea ? areaHex(focusArea.id, chapters) : null,
        }"
      >
        <template v-if="focusArea">
          <span class="atlas__label-name">{{
            focusChapter ? focusChapter.title : focusArea.name
          }}</span>
          <span class="atlas__label-sub">{{
            focusChapter ? focusArea.name : "Not in the book yet"
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
.atlas__head,
.card__eyebrow {
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
.dot {
  flex: none;
  width: 0.625rem;
  height: 0.625rem;
  border-radius: 999px;
  background: var(--area);
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
.ctl:focus-visible,
.card__close:focus-visible,
.card__cta:focus-visible {
  outline: 2px solid rgb(var(--color-chapter));
  outline-offset: 3px;
}

/* ── Card: the chosen chapter or area ── */
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
  font-size: var(--type-subhead-size);
  line-height: 1.15;
  font-weight: 450;
}
.card__blurb {
  margin: 0;
  max-width: 34rem;
  font-size: var(--type-body-sm-size);
  line-height: 1.6;
  color: rgb(255 255 255 / 0.82);
}
.card__parts {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.25rem;
}
.card__parts li {
  display: grid;
  gap: 0.125rem;
}
.card__part {
  font-size: var(--ui-size-15);
}
.card__where {
  margin: 0;
  font-size: var(--ui-size-13);
  line-height: 1.45;
  color: rgb(255 255 255 / 0.65);
}
.card__cta {
  justify-self: start;
  padding: 0.75rem 1.125rem;
  border: 1px solid #fff;
  border-radius: var(--radius-control);
  background: #fff;
  color: rgb(var(--color-dark-surface));
  font-family: var(--font-mono);
  font-size: var(--ui-size-12);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  text-decoration: none;
  transition:
    background-color 0.15s,
    color 0.15s;
}
.card__cta:hover {
  background: transparent;
  color: #fff;
}
.card__soon {
  margin: 0;
  font-size: var(--ui-size-15);
  color: rgb(255 255 255 / 0.75);
}
.card__close {
  justify-self: start;
  /* A full-height tap target without changing the look. */
  padding: 0.75rem 0;
  margin: -0.5rem 0;
  border: 0;
  background: none;
  color: rgb(255 255 255 / 0.75);
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
  .ctl,
  .card__cta {
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
