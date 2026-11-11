<script setup>
/*
 * Chapter opener: the contents with a picture per section (OPENBRAIN-174,
 * Figma Yv7WvZSoabK2t5fNtsChvf "TOC" 3258:31335, its first row).
 *
 * From the reader's two-column width the block is one screen: the section's
 * picture on the left half, the list on the dark surface on the right.
 * Pointing at a section (or tabbing to it) makes it the active one: its
 * picture fades in over the last, the other rows dim, and once the pointer
 * rests there its parts open under it and the last section's close. A click
 * goes to the section through readerJump, as the plain contents do.
 *
 * Touch has no rollover: a tap on a section with parts opens it, a second
 * tap (or a tap on a part) goes there. Below the two-column width the
 * picture sits above the list.
 *
 * The list is anchored at its top, as in every frame of the Figma: only the
 * rows below the open section move (OPENBRAIN-182; the first version moved
 * the whole list to keep the pointed row under the pointer, and the moves
 * added up until the last rows left the screen). What keeps it calm:
 * - Parts open only once the pointer has stayed on a section (REST_MS), so
 *   sweeping down the list changes pictures, not the layout.
 * - Only the pointer moving points at a section. When a section above
 *   closes, the rows under a resting pointer move up and another row ends
 *   up beneath it; the browser reports that as a move with the same
 *   coordinates, which is ignored, so one change never sets off the next.
 * - The block is exactly one screen and never changes height, because
 *   ChapterOpener publishes that height to the reader and every change
 *   re-measures the figures' scroll positions. So that the tallest state
 *   (the section with the most parts open) still fits, the gaps between
 *   rows and between parts tighten with the room there is (`fit`,
 *   helper/tocFit.js); on a window too short even for that, the list
 *   scrolls inside its column.
 *
 * A chapter with no section art keeps OpenerToc (ChapterOpener decides).
 */
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import { jumpToElement, reducedMotionPreferred } from "@/helper/readerJump";
import { READER_WIDE_QUERY } from "@/helper/readerLayout";
import { sectionArtFor } from "@/helper/sectionArt";
import { listFit, listFits } from "@/helper/tocFit";

const props = defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: "" },
  /* From useChapterOutline.buildOutline(). */
  outline: { type: Array, default: () => [] },
  /* The module's slug: which chapter's art (helper/sectionArt.js). */
  chapterSlug: { type: String, default: "" },
  /* Element id so the hero's arrow can scroll here. */
  id: { type: String, default: "chapter-toc" },
});

/** How long the pointer stays on a section before its parts open. */
const REST_MS = 140;
/** px kept spare when fitting the list to its column. */
const ROOM_SLACK = 4;

/* The pictures, one per distinct file, and which one each section shows: its
   own, or the first for a section that has none. */
const pictures = computed(() => {
  const list = [];
  for (const entry of props.outline) {
    const art = sectionArtFor(props.chapterSlug, entry);
    if (art && !list.some((p) => p.src === art.src)) list.push(art);
  }
  return list;
});
const pictureOf = (entry) => {
  const art = sectionArtFor(props.chapterSlug, entry);
  const i = art ? pictures.value.findIndex((p) => p.src === art.src) : -1;
  return i < 0 ? 0 : i;
};

const active = ref(0); // the section pointed at: full strength, its picture
const open = ref(0); // the section whose parts show
const under = ref(-1); // the picture the new one fades in over
const fit = ref(1); // what every gap is multiplied by, so the list fits
const scrolls = ref(false); // too short even so: the list scrolls in itself
const armed = ref(false); // the other pictures may load
const still = ref(false); // reduced motion

const shown = computed(() => pictureOf(props.outline[active.value] || {}));
watch(shown, (now, before) => {
  under.value = before;
});

const rootEl = ref(null);
const listEl = ref(null);
const navEl = ref(null);
const partsEls = new Map(); // section index → its parts' inner list

function setParts(i, el) {
  if (el) partsEls.set(i, el);
  else partsEls.delete(i);
}

const heights = (els) => els.reduce((sum, el) => sum + el.offsetHeight, 0);
const rowGap = (el) => parseFloat(getComputedStyle(el).rowGap) || 0;

/* How much the gaps must give for the tallest state to fit the column
   (helper/tocFit.js). The gaps are read as drawn: what is on the page now,
   over the factor it was drawn with. Below the two-column width the block
   takes the height it needs, so nothing gives. */
function measure() {
  const list = listEl.value;
  const nav = navEl.value;
  if (!list || !nav) return;
  if (!window.matchMedia?.(READER_WIDE_QUERY).matches) {
    fit.value = 1;
    scrolls.value = false;
    return;
  }
  const drawn = fit.value || 1;
  const rows = [...list.querySelectorAll(".otoc__row")];
  const measured = {
    // A few px in hand: heights are whole numbers, the layout's are not.
    room: nav.clientHeight - ROOM_SLACK,
    rows: heights(rows),
    gaps: (rowGap(list) / drawn) * Math.max(0, rows.length - 1),
    parts: [...partsEls.values()].map((partsList) => {
      const links = [...partsList.querySelectorAll(".otoc__part")];
      // One gap above the first part, one between each two.
      return {
        text: heights(links),
        gaps: (rowGap(partsList) / drawn) * links.length,
      };
    }),
  };
  const next = listFit(measured);
  // A hair's difference is not worth another layout (and another measure).
  if (Math.abs(next - fit.value) > 0.004) fit.value = next;
  scrolls.value = !listFits(measured, next);
}

let restTimer = null;
function openSection(i) {
  clearTimeout(restTimer);
  restTimer = null;
  open.value = i;
}

/* Point at section `i`: its picture at once, its parts once the pointer
   has stayed REST_MS (also under reduced motion: the wait is what keeps a
   sweep down the list from opening everything on the way). */
function point(i) {
  if (i === active.value && (i === open.value || restTimer)) return;
  active.value = i;
  clearTimeout(restTimer);
  restTimer =
    i === open.value ? null : setTimeout(() => openSection(i), REST_MS);
}

/* Where the pointer last was. Rows that move under a resting pointer make
   the browser report a move to the same spot; only a move to a new spot is
   the reader's. */
let spot = null;
function onMove(event) {
  if (event.pointerType === "touch") return;
  const { clientX: x, clientY: y } = event;
  if (spot && spot.x === x && spot.y === y) return;
  spot = { x, y };
  // On a row or its parts; the gaps between sections belong to no one.
  const section = event.target.closest?.(".otoc__section");
  if (section) point(Number(section.dataset.index));
}
function onLeave(event) {
  if (event.pointerType === "touch") return;
  spot = null;
  // The pointer has gone: bring what it settled on up to date.
  openSection(active.value);
}

/* A press focuses the row before its click arrives (after its pointerup,
   for a tap); that focus must not open the section, or a tap would open it
   and go at once. The press is forgotten at its click, or a little after
   it ends without one. */
let press = null;
let pressTimer = null;
function forgetPress(after) {
  clearTimeout(pressTimer);
  pressTimer = setTimeout(() => (press = null), after);
}
function onPress(event) {
  press = event.pointerType || "mouse";
  forgetPress(1500);
}
function onPressEnd() {
  if (press) forgetPress(700);
}
function onFocus(i) {
  if (press) return;
  active.value = i;
  openSection(i);
}

function go(anchor, event) {
  // Section ids are UUIDs that can start with a digit, which is not a valid
  // CSS selector: resolve by id, never with querySelector.
  const el = document.getElementById(anchor.replace(/^#/, ""));
  if (!el) return; // fall back to the default hash navigation
  event.preventDefault();
  jumpToElement(el, { align: "top" });
}
function onRow(i, entry, event) {
  // detail 0 is a click from the keyboard, whatever was pressed before it.
  const touch = event.detail !== 0 && (press === "touch" || press === "pen");
  clearTimeout(pressTimer);
  press = null;
  if (touch && entry.subsections.length && open.value !== i) {
    // First tap: open it. The second goes there.
    event.preventDefault();
    active.value = i;
    openSection(i);
    return;
  }
  active.value = i;
  go(entry.anchor, event);
}

let observer = null;
let resizer = null;
onMounted(() => {
  still.value = reducedMotionPreferred();
  measure();
  // The column's room changes with the window, the rows' heights with the
  // width and the fonts arriving.
  if (typeof ResizeObserver === "function" && listEl.value && navEl.value) {
    resizer = new ResizeObserver(measure);
    resizer.observe(listEl.value);
    resizer.observe(navEl.value);
  }
  // The other pictures load once the contents are on screen, not with the
  // hero above them.
  if (typeof IntersectionObserver === "function" && rootEl.value) {
    observer = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      armed.value = true;
      observer?.disconnect();
      observer = null;
    });
    observer.observe(rootEl.value);
  } else {
    armed.value = true;
  }
});
onBeforeUnmount(() => {
  clearTimeout(restTimer);
  clearTimeout(pressTimer);
  observer?.disconnect();
  resizer?.disconnect();
});
// The outline arrives after the module; start again from its first section.
watch(
  () => props.outline,
  async () => {
    active.value = 0;
    openSection(0);
    await nextTick();
    measure();
  }
);

defineExpose({ active, open, fit, scrolls, measure });
</script>

<template>
  <section
    :id="id"
    ref="rootEl"
    class="otoc"
    :class="{ 'otoc--still': still, 'otoc--scrolls': scrolls }"
    :style="{ '--otoc-fit': fit }"
    aria-labelledby="opener-toc-title"
  >
    <!-- The pictures repeat what the list says, so they are not announced. -->
    <div class="otoc__art" aria-hidden="true">
      <img
        v-for="(picture, i) in pictures"
        :key="picture.src"
        class="otoc__pic"
        :class="{ 'is-on': i === shown, 'is-under': i === under }"
        :src="armed || i === shown ? picture.src : undefined"
        alt=""
        decoding="async"
        draggable="false"
      />
    </div>

    <div class="otoc__column" @pointerleave="onLeave">
      <h1 id="opener-toc-title" class="otoc__title">
        <span class="otoc__lead">{{ title }}</span>
        <span v-if="subtitle" class="otoc__sub">{{ subtitle }}</span>
      </h1>

      <nav ref="navEl" class="otoc__nav" aria-label="Chapter contents">
        <ol ref="listEl" class="otoc__sections" @pointermove="onMove">
          <li
            v-for="(entry, i) in outline"
            :key="entry.id"
            class="otoc__section"
            :class="{
              'is-active': i === active,
              'is-open': i === open,
              [`otoc__section--${entry.kind}`]: true,
            }"
            :data-index="i"
          >
            <a
              class="otoc__row"
              :href="entry.anchor"
              :aria-expanded="
                entry.subsections.length ? String(i === open) : undefined
              "
              :aria-controls="
                entry.subsections.length ? `${id}-parts-${i}` : undefined
              "
              @pointerdown="onPress"
              @pointerup="onPressEnd"
              @pointercancel="onPressEnd"
              @focus="onFocus(i)"
              @click="onRow(i, entry, $event)"
            >
              <!-- The number is part of the accessible name ("1. Where is
                   my mind?") so repeated titles stay distinguishable. -->
              <span class="otoc__num">{{ entry.label }}.</span>
              <span class="otoc__label"
                >{{ entry.title
                }}<svg
                  v-if="entry.subsections.length"
                  class="otoc__chevron"
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path
                    d="M4 6l4 4 4-4"
                    stroke="currentColor"
                    stroke-width="1.4"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  /></svg
              ></span>
            </a>
            <div
              v-if="entry.subsections.length"
              :id="`${id}-parts-${i}`"
              class="otoc__parts"
              :inert="i === open ? null : ''"
            >
              <ol :ref="(el) => setParts(i, el)" class="otoc__parts-list">
                <li v-for="part in entry.subsections" :key="part.id">
                  <a
                    class="otoc__part"
                    :href="part.anchor"
                    @focus="onFocus(i)"
                    @click="go(part.anchor, $event)"
                    >{{ part.title }}</a
                  >
                </li>
              </ol>
            </div>
          </li>
        </ol>
      </nav>
    </div>
  </section>
</template>

<style scoped>
/* Figma: a 1440 × 960 frame, picture 720 wide, list 720 wide with 180 above
   it, rows 22/30 medium with 34 between them, 36 from the divide; parts
   16/20 regular, 18 apart, 62 from the divide; the rows not pointed at are
   at half strength. Sizes follow the window between a floor and the
   Figma's own size (a little more on a wide screen). */
.otoc {
  --otoc-row: clamp(1.125rem, 1.528vw, 1.625rem);
  --otoc-part: clamp(0.9375rem, 1.111vw, 1.125rem);
  --otoc-gap: clamp(1.25rem, 2.36vw, 2.125rem);
  --otoc-inset: clamp(1.25rem, 2.5vw, 2.25rem);
  --otoc-ease: cubic-bezier(0.22, 0.61, 0.36, 1);
  --otoc-ms: 280ms;
  /* The parts' gap as drawn; like the rows' it is multiplied by --otoc-fit
     (the component sets it: 1, or less on a window the list would not
     otherwise fit). */
  --otoc-part-gap: 1.125rem;
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: minmax(0, 1fr);
  /* One screen, exactly: nothing the list does may change it. */
  height: 100vh;
  min-height: 0;
  /* The reader pads every <section> (index.css); this one is its own
     screen, edge to edge. */
  padding: 0;
  background: rgb(var(--color-dark-surface));
  color: #fff;
  font-family: var(--font-ui);
  letter-spacing: 0.1px;
}

.otoc__art {
  position: relative;
  overflow: hidden;
  background: rgb(var(--color-chapter));
}
.otoc__pic {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  user-select: none;
}
/* The picture before stays put underneath while the new one fades in over
   it, so the change never dips to the ground between them. */
.otoc__pic.is-under {
  opacity: 1;
  z-index: 1;
}
.otoc__pic.is-on {
  opacity: 1;
  z-index: 2;
  animation: otoc-pic-in 520ms var(--otoc-ease) both;
}
@keyframes otoc-pic-in {
  from {
    opacity: 0;
    transform: scale(1.025);
  }
}

.otoc__column {
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  padding: clamp(5.5rem, 11vh, 7rem) 0 clamp(2.5rem, 6vh, 4rem);
  overflow: hidden;
}
/* The room the list has: what is left of the column under the title. */
.otoc__nav {
  flex: 1 1 auto;
  min-height: 0;
}
/* A window too short for the list even with its gaps at their tightest:
   the list scrolls here, in its column. Only then, so that a list that
   fits never takes the wheel from the page. */
.otoc--scrolls .otoc__nav {
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgb(255 255 255 / 0.3) transparent;
}

/* The chapter's name, small: the list is the page here, and the hero above
   it carries no words. */
.otoc__title {
  margin: 0 0 clamp(1.75rem, 6.5vh, 3.5rem);
  padding: 0 3.75rem 0 var(--otoc-inset);
  font-weight: 400;
}
.otoc__lead {
  display: block;
  font-family: var(--font-mono);
  font-size: var(--ui-size-12);
  font-weight: 500;
  line-height: 1.4;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgb(var(--color-chapter-soft));
}
.otoc__sub {
  display: block;
  margin-top: 0.375rem;
  max-width: 28rem;
  font-size: var(--ui-size-14);
  line-height: 1.45;
  color: rgb(255 255 255 / 0.72);
  text-wrap: balance;
}

.otoc__sections,
.otoc__parts-list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.otoc__sections {
  display: flex;
  flex-direction: column;
  gap: calc(var(--otoc-gap) * var(--otoc-fit, 1));
  /* The reader hyphenates prose; titles in the contents break at words. */
  hyphens: manual;
}
.otoc__section {
  opacity: 0.5;
  transition: opacity 200ms linear;
}
.otoc__section.is-active {
  opacity: 1;
}

.otoc__row {
  display: flex;
  align-items: baseline;
  gap: 0.375rem;
  padding: 0 3.75rem 0 var(--otoc-inset);
  color: inherit;
  text-decoration: none;
  font-size: var(--otoc-row);
  font-weight: 500;
  line-height: 1.364;
}
/* A set width, so every title, and the parts under it, start on one line. */
.otoc__num {
  flex: none;
  width: 0.9em;
  font-variant-numeric: tabular-nums;
}
.otoc__label {
  min-width: 0;
  text-wrap: pretty;
}
.otoc__chevron {
  display: inline-block;
  margin-left: 0.375rem;
  vertical-align: 0.02em;
  transition: transform var(--otoc-ms) var(--otoc-ease);
}
.otoc__section.is-open .otoc__chevron {
  transform: rotate(180deg);
}

/* Opening is a row growing from nothing (0fr to 1fr). */
.otoc__parts {
  display: grid;
  grid-template-rows: 0fr;
  visibility: hidden;
  transition:
    grid-template-rows var(--otoc-ms) var(--otoc-ease),
    visibility 0s linear var(--otoc-ms);
}
.otoc__section.is-open .otoc__parts {
  grid-template-rows: 1fr;
  visibility: visible;
  transition:
    grid-template-rows var(--otoc-ms) var(--otoc-ease),
    visibility 0s;
}
.otoc__parts-list {
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: calc(var(--otoc-part-gap) * var(--otoc-fit, 1));
  /* Under the title, past the number and its gap (62 from the divide in
     Figma). */
  padding: 0 3.75rem 0
    calc(var(--otoc-inset) + 0.9 * var(--otoc-row) + 0.375rem);
}
/* The same gap again between the row and its first part. */
.otoc__parts-list > li:first-child {
  padding-top: calc(var(--otoc-part-gap) * var(--otoc-fit, 1));
}
.otoc__part {
  display: block;
  color: #fff;
  text-decoration: none;
  font-size: var(--otoc-part);
  font-weight: 400;
  line-height: 1.25;
  opacity: 0;
  transform: translateY(-0.25rem);
  transition:
    opacity 180ms linear,
    transform var(--otoc-ms) var(--otoc-ease);
}
.otoc__section.is-open .otoc__part {
  opacity: 1;
  transform: none;
  transition-delay: 90ms;
}

.otoc__row:hover .otoc__label,
.otoc__part:hover {
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 0.22em;
}
.otoc__row:focus-visible,
.otoc__part:focus-visible {
  outline: 2px solid #fff;
  outline-offset: 2px;
}

/* Reduced motion: the states, without the movement between them. */
.otoc--still .otoc__pic.is-on {
  animation: none;
}
.otoc--still .otoc__section,
.otoc--still .otoc__chevron,
.otoc--still .otoc__parts,
.otoc--still .otoc__section.is-open .otoc__parts,
.otoc--still .otoc__part {
  transition: none;
}
@media (prefers-reduced-motion: reduce) {
  .otoc__pic.is-on {
    animation: none;
  }
  .otoc__section,
  .otoc__chevron,
  .otoc__parts,
  .otoc__section.is-open .otoc__parts,
  .otoc__part {
    transition: none;
  }
}

/* Below the two-column reader: the picture above the list, and the block
   takes the height it needs (a tap opens a section; nothing has to fit). */
@media (max-width: 1023px) {
  .otoc {
    --otoc-row: 1.125rem;
    --otoc-part: 0.9375rem;
    --otoc-gap: 1.375rem;
    --otoc-inset: 1.25rem;
    grid-template-columns: 1fr;
    grid-template-rows: none;
    height: auto;
  }
  .otoc__art {
    aspect-ratio: 4 / 3;
    max-height: 60vh;
  }
  .otoc__pic {
    object-position: center 30%;
  }
  .otoc__column {
    padding: 2rem 0 2.5rem;
  }
  .otoc__title {
    margin-bottom: 1.75rem;
    padding-right: 1.25rem;
  }
  .otoc__row,
  .otoc__parts-list {
    padding-right: 1.25rem;
  }
}
</style>
