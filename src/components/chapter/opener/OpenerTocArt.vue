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
 * Two things keep the list still under the pointer:
 * - Parts open only once the pointer rests on a row (REST_MS), so sweeping
 *   down the list changes pictures, not the layout.
 * - Closing a section above the pointer would pull the row out from under
 *   it, so the list is shifted down by what closed (`shift`, a transform
 *   with the same timing as the close) and let back when the pointer leaves.
 *   The shift stops where the list would leave its column.
 * The block's height never changes with any of this (the list reserves the
 * tallest set of parts), because ChapterOpener publishes that height to the
 * reader and every change re-measures the figures' scroll positions.
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
import { sectionArtFor } from "@/helper/sectionArt";

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

/** How long the pointer rests on a row before its parts open. */
const REST_MS = 140;
/** Room kept under the list when it is shifted, px. */
const SHIFT_FOOT = 40;

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
const shift = ref(0); // px the list is moved down, see above
const closed = ref(0); // px the list is tall with nothing open
const reserve = ref(0); // px kept under it for the tallest set of parts
const armed = ref(false); // the other pictures may load
const still = ref(false); // reduced motion

const shown = computed(() => pictureOf(props.outline[active.value] || {}));
watch(shown, (now, before) => {
  under.value = before;
});

const rootEl = ref(null);
const listEl = ref(null);
const columnEl = ref(null);
const partsEls = new Map(); // section index → its parts' inner list

function setParts(i, el) {
  if (el) partsEls.set(i, el);
  else partsEls.delete(i);
}
const partsHeight = (i) => partsEls.get(i)?.scrollHeight || 0;

/* The list's height with nothing open, and the tallest set of parts: the
   list keeps room for both, so opening a section never makes the block
   taller. */
function measure() {
  const list = listEl.value;
  if (!list) return;
  const rows = [...list.querySelectorAll(".otoc__row")];
  const gap = parseFloat(getComputedStyle(list).rowGap) || 0;
  closed.value =
    rows.reduce((sum, row) => sum + row.offsetHeight, 0) +
    gap * Math.max(0, rows.length - 1);
  let tallest = 0;
  for (const i of partsEls.keys()) tallest = Math.max(tallest, partsHeight(i));
  reserve.value = tallest;
}

/* How far the list may be shifted with section `i` open before it would
   leave its column. */
function shiftLimit(i) {
  const column = columnEl.value;
  const list = listEl.value;
  if (!column || !list) return 0;
  return Math.max(
    0,
    column.clientHeight -
      list.offsetTop -
      closed.value -
      partsHeight(i) -
      SHIFT_FOOT
  );
}

let restTimer = null;
function openSection(i, { hold = false } = {}) {
  clearTimeout(restTimer);
  if (i === open.value) return;
  // The section closing is above the pointer: keep the pointed row where it
  // is by moving the list down by what closes.
  const closing = hold && open.value < i ? partsHeight(open.value) : 0;
  // Never past the column's foot, whichever way the pointer came.
  shift.value = Math.min(shift.value + closing, shiftLimit(i));
  open.value = i;
}

function onEnter(i, event) {
  if (event.pointerType === "touch") return;
  active.value = i;
  clearTimeout(restTimer);
  // Also under reduced motion: the wait is what keeps the list still.
  restTimer = setTimeout(() => openSection(i, { hold: true }), REST_MS);
}
function onLeave(event) {
  if (event.pointerType === "touch") return;
  clearTimeout(restTimer);
  // The pointer has gone: bring what it settled on up to date and let the
  // list back to its place.
  open.value = active.value;
  shift.value = 0;
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
  shift.value = 0;
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
    shift.value = 0;
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
  if (typeof ResizeObserver === "function" && listEl.value) {
    resizer = new ResizeObserver(measure);
    resizer.observe(listEl.value);
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
    open.value = 0;
    shift.value = 0;
    await nextTick();
    measure();
  }
);

defineExpose({ active, open, shift });
</script>

<template>
  <section
    :id="id"
    ref="rootEl"
    class="otoc"
    :class="{ 'otoc--still': still }"
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

    <div ref="columnEl" class="otoc__column" @pointerleave="onLeave">
      <h1 id="opener-toc-title" class="otoc__title">
        <span class="otoc__lead">{{ title }}</span>
        <span v-if="subtitle" class="otoc__sub">{{ subtitle }}</span>
      </h1>

      <nav aria-label="Chapter contents">
        <ol
          ref="listEl"
          class="otoc__sections"
          :style="{
            '--otoc-shift': `${shift}px`,
            '--otoc-room': `${closed + reserve}px`,
          }"
        >
          <li
            v-for="(entry, i) in outline"
            :key="entry.id"
            class="otoc__section"
            :class="{
              'is-active': i === active,
              'is-open': i === open,
              [`otoc__section--${entry.kind}`]: true,
            }"
            @pointerenter="onEnter(i, $event)"
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
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1fr;
  min-height: 100vh;
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
  padding: clamp(5.5rem, 11vh, 7rem) 0 clamp(2.5rem, 6vh, 4rem);
  overflow: hidden;
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
  gap: var(--otoc-gap);
  /* Room for the tallest set of parts, so the block keeps its height. */
  min-height: var(--otoc-room, 0px);
  transform: translateY(var(--otoc-shift, 0px));
  transition: transform var(--otoc-ms) var(--otoc-ease);
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

/* Opening is a row growing from nothing (0fr to 1fr), which runs in step
   with the list's shift: same time, same curve. */
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
  gap: 1.125rem;
  /* Under the title, past the number and its gap (62 from the divide in
     Figma). */
  padding: 0 3.75rem 0
    calc(var(--otoc-inset) + 0.9 * var(--otoc-row) + 0.375rem);
}
.otoc__parts-list > li:first-child {
  padding-top: 1.125rem;
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
.otoc--still .otoc__sections,
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
  .otoc__sections,
  .otoc__section,
  .otoc__chevron,
  .otoc__parts,
  .otoc__section.is-open .otoc__parts,
  .otoc__part {
    transition: none;
  }
}

/* Below the two-column reader: the picture above the list, which takes the
   height it needs (nothing is reserved or shifted: a tap opens a section). */
@media (max-width: 1023px) {
  .otoc {
    --otoc-row: 1.125rem;
    --otoc-part: 0.9375rem;
    --otoc-gap: 1.375rem;
    --otoc-inset: 1.25rem;
    grid-template-columns: 1fr;
    min-height: 0;
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
  .otoc__sections {
    min-height: 0;
    transform: none;
  }
}
</style>
