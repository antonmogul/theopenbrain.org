<script setup>
/*
 * Chapter opener: the contents with a picture per section (OPENBRAIN-174,
 * Figma Yv7WvZSoabK2t5fNtsChvf "TOC" 3258:31335, its first row).
 *
 * From the reader's two-column width the block is one screen: the section's
 * picture on the left half, the list on the dark surface on the right.
 * Pointing at a section (or tabbing to it) makes it the active one: its
 * picture fades in over the last and the other rows dim. A click goes to
 * the section through readerJump, as the plain contents do. Below the
 * two-column width the picture sits above the list, and a tap goes there.
 *
 * The list is the sections' titles and nothing else (OPENBRAIN-193; Stuart,
 * 11 and 14 Nov: "I don't think we need any of these expanding down-arrow
 * sub-headings … just the heading titles", "remove all the expand/contract
 * subsections"). It used to open a section's parts (its subsections and
 * breakout boxes) under the row the pointer rested on; the outline still
 * carries them for the nav drawer and the timeline.
 *
 * The list is anchored at its top, as in every frame of the Figma, and
 * nothing in it moves (OPENBRAIN-182). The block is exactly one screen and
 * never changes height, because ChapterOpener publishes that height to the
 * reader and every change re-measures the figures' scroll positions. On a
 * window too short for the rows as drawn, the gaps between them tighten
 * with the room there is (`fit`, helper/tocFit.js); on one too short even
 * for that, the list scrolls inside its column.
 *
 * Only the pointer moving points at a section: when the page scrolls under
 * a resting pointer the browser reports a move with the same coordinates,
 * which is ignored, so scrolling past the contents does not flick through
 * the pictures.
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

const heights = (els) => els.reduce((sum, el) => sum + el.offsetHeight, 0);
const rowGap = (el) => parseFloat(getComputedStyle(el).rowGap) || 0;

/* How much the gaps must give for the list to fit the column
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
  };
  const next = listFit(measured);
  // A hair's difference is not worth another layout (and another measure).
  if (Math.abs(next - fit.value) > 0.004) fit.value = next;
  scrolls.value = !listFits(measured, next);
}

/* Where the pointer last was: only a move to a new spot is the reader's
   (see the note at the top). */
let spot = null;
function onMove(event) {
  if (event.pointerType === "touch") return;
  const { clientX: x, clientY: y } = event;
  if (spot && spot.x === x && spot.y === y) return;
  spot = { x, y };
  // On a row; the gaps between sections belong to no one.
  const section = event.target.closest?.(".otoc__section");
  if (section) active.value = Number(section.dataset.index);
}
function onLeave() {
  spot = null;
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
  observer?.disconnect();
  resizer?.disconnect();
});
// The outline arrives after the module; start again from its first section.
watch(
  () => props.outline,
  async () => {
    active.value = 0;
    await nextTick();
    measure();
  }
);

defineExpose({ active, fit, scrolls, measure });
</script>

<template>
  <section
    :id="id"
    ref="rootEl"
    class="otoc"
    :class="{
      'otoc--still': still,
      'otoc--scrolls': scrolls,
      'otoc--long-numbers': outline.some(
        (entry) => String(entry.label).length > 1
      ),
    }"
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
        :style="
          picture.position ? { objectPosition: picture.position } : undefined
        "
        :src="armed || i === shown ? picture.src : undefined"
        alt=""
        decoding="async"
        draggable="false"
      />
    </div>

    <span v-if="pictures[shown]?.placeholder" class="otoc__placeholder"
      >Placeholder image</span
    >

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
              [`otoc__section--${entry.kind}`]: true,
            }"
            :data-index="i"
          >
            <a
              class="otoc__row"
              :href="entry.anchor"
              @focus="active = i"
              @click="onRow(i, entry, $event)"
            >
              <!-- The number is part of the accessible name ("1. Where is
                   my mind?") so repeated titles stay distinguishable. -->
              <span class="otoc__num">{{ entry.label }}.</span>
              <span class="otoc__label">{{ entry.title }}</span>
            </a>
          </li>
        </ol>
      </nav>
    </div>
  </section>
</template>

<style scoped>
/* Figma: a 1440 × 960 frame, picture 720 wide, list 720 wide with 180 above
   it, rows 22/30 medium with 34 between them, 36 from the divide; the rows
   not pointed at are at half strength. Sizes follow the window between a
   floor and the Figma's own size (a little more on a wide screen). */
.otoc {
  --otoc-row: clamp(1.125rem, 1.528vw, 1.625rem);
  --otoc-gap: clamp(1.25rem, 2.36vw, 2.125rem);
  --otoc-inset: clamp(1.25rem, 2.5vw, 2.25rem);
  --otoc-ease: cubic-bezier(0.22, 0.61, 0.36, 1);
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
.otoc__placeholder {
  position: absolute;
  top: calc(var(--reader-topbar-h, 4rem) + 1rem);
  left: 1rem;
  z-index: 3;
  padding: 0.375rem 0.625rem;
  background: rgb(var(--color-dark-surface));
  color: #fff;
  font-family: var(--font-mono);
  font-size: var(--ui-size-11);
  line-height: 1.4;
  letter-spacing: 0.02em;
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

.otoc__sections {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  /* The gap as drawn, times --otoc-fit (the component sets it: 1, or less
     on a window the list would not otherwise fit). */
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
/* A set width, so every title starts on one line. */
.otoc__num {
  flex: none;
  width: 0.9em;
  font-variant-numeric: tabular-nums;
}
.otoc--long-numbers .otoc__num {
  width: 1.7em;
}
.otoc__label {
  min-width: 0;
  text-wrap: pretty;
}
.otoc__row:hover .otoc__label {
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 0.22em;
}
.otoc__row:focus-visible {
  outline: 2px solid #fff;
  outline-offset: 2px;
}

/* Reduced motion: the states, without the movement between them. */
.otoc--still .otoc__pic.is-on {
  animation: none;
}
.otoc--still .otoc__section {
  transition: none;
}
@media (prefers-reduced-motion: reduce) {
  :root:not([data-reduce-motion="0"]) .otoc__pic.is-on {
    animation: none;
  }
  :root:not([data-reduce-motion="0"]) .otoc__section {
    transition: none;
  }
}

/* Below the two-column reader: the picture above the list, and the block
   takes the height it needs (nothing has to fit). */
@media (max-width: 1023px) {
  .otoc {
    --otoc-row: 1.125rem;
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
  .otoc__row {
    padding-right: 1.25rem;
  }
}
</style>
