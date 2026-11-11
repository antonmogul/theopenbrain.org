<script setup>
/*
 * Section cards (OPENBRAIN-174): what the figure pane shows while the reader
 * crosses from one section into the next, and the small entrance each
 * section heading makes. Before this the crossing was an empty dark pane
 * beside a long white gap, which read as broken (Anton, 11 Nov).
 *
 * The card. A layer the size of the figure pane, straight after it in the
 * page, so everything that covers the pane (the opener, full-width bands)
 * covers this too. It shows a section's card (SectionCard: the section's
 * picture, number and title) while helper/sectionCard.js says the reader is
 * between the last section's text and this section's first figure, and only
 * while the pane itself is empty: a figure still holding wins, and the card
 * leaves over the first figure as it fades in. Only chapters with section
 * art have cards (helper/sectionArt.js), only at the two-column width.
 *
 * The heading. Each section's number and title come in as they enter the
 * screen (the number grows into place, the title rises), once. The page is
 * marked up for this only when it will run: without IntersectionObserver or
 * under reduced motion the headings are simply there, as they are for
 * anyone who lands on one.
 *
 * Everything is read from the reader's own DOM (section ids, the figure
 * triggers the pane binds), so nothing in the text needs to know about it.
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useGeneral } from "@/stores";
import { useMediaQuery } from "@/composables/useMediaQuery";
import { buildOutline } from "@/composables/useChapterOutline";
import { READER_WIDE_QUERY } from "@/helper/readerLayout";
import { reducedMotionPreferred } from "@/helper/readerJump";
import { hasSectionCard, sectionArtFor } from "@/helper/sectionArt";
import { FIGURE_LINE, cardState, titleShare } from "@/helper/sectionCard";
import SectionCard from "./SectionCard.vue";

const props = defineProps({
  /* The module row (its slug says which chapter's art). */
  module: { type: Object, default: null },
  /* The transformed chapter the reader holds ({ intro, sections }). */
  text: { type: Object, default: null },
});

/* What ends a card inside its section: the first figure the pane will
   show, or the first full-width band (which covers the pane). */
const ENDS =
  ".animationTrigger[id], .fb-slot:not(.fb-slot--column), .wb, [data-breakout-box]";
/* Where the two-column reader stops (TextComp's #chapter-back,
   OPENBRAIN-179): the close and the references run the full width from
   there, so nothing in it has a card or an entrance, and no card is left
   up once it reaches the figure line. */
const READER_END = "[data-reader-end]";
/** A section this many screens below gets its picture fetched. */
const PRELOAD_SCREENS = 3;

const store = useGeneral();
const wide = useMediaQuery(READER_WIDE_QUERY);
const still = ref(false);

const slug = computed(() => props.module?.slug || "");
const cards = computed(() =>
  buildOutline(props.text)
    .filter((entry) => hasSectionCard(slug.value, entry))
    .map((entry) => ({
      id: entry.id,
      label: entry.label,
      title: entry.title,
      art: sectionArtFor(slug.value, entry),
    }))
);

const rootEl = ref(null);
const showing = ref(null); // { card, progress, title } while one is due
// A figure in the pane wins; the card waits its turn.
const current = computed(() =>
  showing.value && wide.value && !store.animationActive ? showing.value : null
);

const reader = () => rootEl.value?.closest(".chapter-reader") || document;

/* Where each card's section sits: the section, the one before it, and what
   ends the card. Rebuilt when the text moves; the positions themselves are
   read fresh on every scroll. */
let places = [];
let readerEnd = null;
let stale = true;
function place() {
  stale = false;
  readerEnd = reader().querySelector(READER_END);
  const sections = [...reader().querySelectorAll("section.reader-section")];
  places = cards.value.flatMap((card) => {
    const el = document.getElementById(card.id);
    const at = sections.indexOf(el);
    if (at < 0 || el.closest(READER_END)) return [];
    const before = sections[at - 1] || null;
    const end =
      [...el.querySelectorAll(ENDS)].find(
        (node) =>
          !node.classList.contains("animationTrigger") ||
          (/^trigger/i.test(node.id) && !node.closest("[data-breakout-box]"))
      ) || null;
    return [{ card, el, before, end }];
  });
}

const padBottom = (el) => parseFloat(getComputedStyle(el).paddingBottom) || 0;
const preloaded = new Set();

function update() {
  if (!cards.value.length || !wide.value) {
    showing.value = null;
    return;
  }
  if (stale || places.some((p) => !p.el.isConnected)) place();
  const screen = window.innerHeight;
  let next = null;
  for (const { card, el, before, end } of places) {
    const box = el.getBoundingClientRect();
    if (box.top < screen * PRELOAD_SCREENS && !preloaded.has(card.art.src)) {
      preloaded.add(card.art.src);
      new Image().src = card.art.src;
    }
    const state = cardState(
      {
        // The section before stops where its text does: its gap is padding.
        gapStart: before
          ? before.getBoundingClientRect().bottom - padBottom(before)
          : box.top,
        top: box.top,
        end: end ? end.getBoundingClientRect().top : box.bottom - padBottom(el),
      },
      screen
    );
    if (state.on)
      next = {
        card,
        progress: state.progress,
        title: titleShare(box.top, screen),
      };
  }
  if (
    next &&
    readerEnd?.isConnected &&
    readerEnd.getBoundingClientRect().top <= screen * FIGURE_LINE
  )
    next = null;
  showing.value = next;
}

let frame = 0;
function onScroll() {
  if (frame) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    update();
  });
}
function onLayout() {
  stale = true;
  onScroll();
}

/* The headings' entrance. A section whose heading is still below the screen
   is marked to wait; when it comes in it plays once and the mark is taken
   off, so nothing else that styles a heading is ever overridden for long. */
let entrance = null;
const waiting = new Set();
function clearEntrance() {
  entrance?.disconnect();
  entrance = null;
  for (const el of waiting) el.removeAttribute("data-section-enter");
  waiting.clear();
}
function armEntrance() {
  clearEntrance();
  if (
    still.value ||
    !cards.value.length ||
    typeof IntersectionObserver !== "function"
  )
    return;
  entrance = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const section = entry.target.closest("section.reader-section");
        entrance?.unobserve(entry.target);
        if (!section || !waiting.has(section)) continue;
        section.setAttribute("data-section-enter", "in");
        setTimeout(() => {
          section.removeAttribute("data-section-enter");
          waiting.delete(section);
        }, 1000);
      }
    },
    // A little inside the screen's foot, so the entrance is seen.
    { rootMargin: "0px 0px -10% 0px" }
  );
  for (const section of reader().querySelectorAll(
    "section.reader-section[data-section-slug]"
  )) {
    // The section's own title, not one inside a box further down.
    const heading = [...section.children].find((el) =>
      el.matches("h2.subChapter")
    );
    if (!heading || section.closest(READER_END)) continue;
    if (heading.getBoundingClientRect().top < window.innerHeight * 0.9)
      continue;
    section.setAttribute("data-section-enter", "wait");
    waiting.add(section);
    entrance.observe(heading);
  }
}

let resizer = null;
let armTimer = null;
/* The text renders a moment after its data arrives: look for it a few
   times rather than assume it is there. */
function attach(triesLeft = 12) {
  const content = reader().querySelector("#container");
  if (!content || !content.querySelector("section.reader-section")) {
    if (triesLeft > 0) armTimer = setTimeout(() => attach(triesLeft - 1), 300);
    return;
  }
  if (typeof ResizeObserver === "function") {
    resizer = new ResizeObserver(onLayout);
    resizer.observe(content);
  }
  onLayout();
  armEntrance();
}
function start() {
  stop();
  if (!cards.value.length) return;
  still.value = reducedMotionPreferred();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onLayout);
  attach();
}
function stop() {
  window.removeEventListener("scroll", onScroll);
  window.removeEventListener("resize", onLayout);
  resizer?.disconnect();
  resizer = null;
  clearTimeout(armTimer);
  cancelAnimationFrame(frame);
  frame = 0;
  clearEntrance();
  places = [];
  stale = true;
  showing.value = null;
}

onMounted(start);
onBeforeUnmount(stop);
watch(() => cards.value.map((c) => c.id).join("|"), start, { flush: "post" });
watch(wide, onLayout);

defineExpose({ update, current });
</script>

<template>
  <!-- The figure pane's own box (IllustrationsComp), and like it gone while
       the reader's scroll is being driven. -->
  <div
    v-if="cards.length && !store.isScrolling"
    ref="rootEl"
    class="section-cards hidden reader:block reader:fixed reader:left-0 reader:w-illus reader:z-30 pointer-events-none reader:top-[var(--reader-topbar-h)] reader:h-[calc(100vh-var(--reader-topbar-h)-var(--reader-timeline-h,0px))]"
    :class="{ 'section-cards--still': still }"
  >
    <transition name="section-card">
      <SectionCard
        v-if="current"
        :key="current.card.id"
        :art="current.card.art"
        :label="current.card.label"
        :title="current.card.title"
        :progress="current.progress"
        :title-share="current.title"
        :still="still"
      />
    </transition>
  </div>
</template>

<!-- Not scoped: the transition classes land on SectionCard's root, and the
     heading rules reach into the reader's text. -->
<style>
.section-cards {
  overflow: hidden;
}
.section-card-enter-active {
  transition: opacity 420ms ease-out;
}
/* Leaves late and slowly: the first figure fades in underneath (0.2 s wait,
   0.3 s fade) and the card comes off it. */
.section-card-leave-active {
  transition: opacity 360ms ease-in 160ms;
}
.section-card-enter-from,
.section-card-leave-to {
  opacity: 0;
}
.section-cards--still .section-card-enter-active,
.section-cards--still .section-card-leave-active {
  transition: none;
}

/* The heading's entrance. `scale` and `translate` are their own properties,
   so the number's place (a transform) is left alone; `backwards` holds the
   start only until the entrance begins, and nothing after it ends. */
.chapter-reader section.reader-section[data-section-enter="wait"] > h2 {
  opacity: 0;
}
.chapter-reader section.reader-section[data-section-enter="in"] > h2.TN {
  animation: section-number-in 560ms cubic-bezier(0.3, 1.35, 0.5, 1) backwards;
}
.chapter-reader
  section.reader-section[data-section-enter="in"]
  > h2.subChapter {
  animation: section-title-in 620ms cubic-bezier(0.22, 0.61, 0.36, 1) 110ms
    backwards;
}
@keyframes section-number-in {
  from {
    opacity: 0;
    scale: 0.55;
  }
}
@keyframes section-title-in {
  from {
    opacity: 0;
    translate: 0 0.45em;
  }
}
@media (prefers-reduced-motion: reduce) {
  .section-card-enter-active,
  .section-card-leave-active {
    transition: none;
  }
  .chapter-reader section.reader-section[data-section-enter] > h2 {
    opacity: 1;
    animation: none;
  }
}
:root[data-reduce-motion="1"]
  .chapter-reader
  section.reader-section[data-section-enter]
  > h2 {
  opacity: 1;
  animation: none;
}
</style>
