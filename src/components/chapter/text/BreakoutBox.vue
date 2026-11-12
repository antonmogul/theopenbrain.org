<script setup>
/* Breakouts occupy the reader width and keep their artwork inside their
 * own stage. Short boxes read as one viewport-sized panel; long manuscript
 * text remains in normal vertical flow. A listed box can instead be read
 * sideways: the rail (OPENBRAIN-163, 187, helper/exploreRail.js; the script
 * and styles for it are marked below). From the two-column breakpoint the
 * box pins and the page's scroll moves its track; below it the track is a
 * native swipe with two cues, "Explore more" and "Keep going", and the
 * page's scroll is never taken over.
 *
 * The pause (Stuart, 24 Sep and 13 Oct: "pause in the vertical scroll when
 * we enter a breakout box"). From the two-column breakpoint up, once the
 * box reaches the top bar it stays put, heading and opening text together,
 * for a short scroll (BX_PAUSE) before the page moves on: the box is a
 * different space, and the reader notices arriving in it. It is the whole
 * box that holds, never a title card on its own (the 7 Oct review), and
 * reduced motion turns it off.
 *
 * Treatment (OPENBRAIN-153, 157). The History redesign draws a box as a
 * colour panel with white text and a centred heading; the creator picks one
 * per box in the chapter editor (sections.box_treatment), the map in
 * helper/breakoutTreatment.js answers for a chapter, and the pale card
 * stays the default where both are silent. Every colour the box paints
 * goes through the --bx-* custom properties set per treatment on the frame,
 * so the four looks are one set of rules, and the pause's room (also
 * painted in the box's colour) follows along. */
import { computed, inject, onBeforeUnmount, provide, ref, watch } from "vue";
import FullBleed from "@/components/chapter/FullBleed.vue";
import {
  DARK_BOX_TREATMENTS,
  boxTreatmentFor,
  normalizeBoxTreatment,
} from "@/helper/breakoutTreatment";
import {
  RAIL_MIN_HEIGHT_QUERY,
  boxIsRail,
  railLayoutOf,
} from "@/helper/exploreRail";
import { useExploreRail } from "@/composables/useExploreRail";
import { useMediaQuery } from "@/composables/useMediaQuery";
import { readerTopInset, scrollToY } from "@/helper/readerJump";

const props = defineProps({
  /** The box section (kind "box"): id, slug and title. */
  section: { type: Object, required: true },
  /** Its letter ("A", "B", …). */
  label: { type: String, default: "" },
  pairedExplores: { type: Boolean, default: false },
  /** "pale" | "dark" | "plate" | "chapter" (or the older "violet"); unset
   *  resolves from the section and the chapter (TextComp provides
   *  chapterSlug). Stories set it directly. */
  treatment: { type: String, default: "" },
  /** Read sideways (helper/exploreRail.js). Unset resolves from the
   *  section and the chapter; stories and tests set it directly. */
  rail: { type: Boolean, default: undefined },
});

const chapterSlug = inject("chapterSlug", null);
const slugOfChapter = () => chapterSlug?.value ?? chapterSlug;
const treatment = computed(
  () =>
    normalizeBoxTreatment(props.treatment) ||
    boxTreatmentFor(props.section, slugOfChapter())
);
/* The panels share one layout (centred heading, no badge, full bleed on
   phones); only their palette differs. The two dark plates also share the
   Explore card on the plate (bx--dark). */
const panel = computed(() => treatment.value !== "pale");
const dark = computed(() => DARK_BOX_TREATMENTS.includes(treatment.value));

const titleId = computed(() => `box-title-${props.section.id}`);

/* The rail (OPENBRAIN-163, 187): a box read sideways, in one of two modes.
   "track" where the box floats full width (from the two-column breakpoint,
   in the reader) on a screen tall enough for a track: pinned while the
   page's scroll moves it. "swipe" where the box is in the column (phones,
   tablets, and Storybook, which has no stage layer): a native swipe with
   scroll snapping, never pinned. A box that floats on a short screen runs
   down the page. The text it frames reads the same mode (provide), so box
   and parts switch together. */
const fullBleed = ref(null);
const pauseEl = ref(null);
const boxEl = ref(null);
const trackEl = ref(null);
const navEl = ref(null);
const layout = computed(() => railLayoutOf(props.section));
const wantsRail = computed(
  () =>
    !!layout.value && (props.rail ?? boxIsRail(props.section, slugOfChapter()))
);
const tallEnough = useMediaQuery(RAIL_MIN_HEIGHT_QUERY);
const mode = computed(() => {
  if (!wantsRail.value) return null;
  if (fullBleed.value?.floating) return tallEnough.value ? "track" : null;
  return "swipe";
});
const railOn = computed(() => mode.value === "track");
const swipeOn = computed(() => mode.value === "swipe");
provide("exploreRail", mode);
const parts = computed(() =>
  mode.value
    ? layout.value.parts.map((part) => ({ id: part.id, title: part.title }))
    : []
);
/* Named parts (a box of Explore paragraphs) are listed by name; any other
   box's track says how far along it is. */
const named = computed(() => !!layout.value?.named);
const hasTail = computed(() => !!mode.value && !!layout.value?.tail.length);
const {
  pinned,
  room,
  lead,
  stickyTop,
  active,
  atStart,
  atEnd,
  stop,
  stopCount,
  next,
  prev,
  goToPart,
} = useExploreRail({
  mode,
  pauseEl,
  boxEl,
  scrollerEl: trackEl,
});
// The track's half of the contract in helper/exploreRail.js.
const trackAttrs = computed(() =>
  mode.value
    ? {
        tabindex: 0,
        role: "group",
        "aria-label": `${props.section.title}: ${parts.value.length} ${
          parts.value.length === 1 ? "part" : "parts"
        }, side by side`,
        "data-rail-scroller": "",
        "data-rail-mode": mode.value,
        "data-rail-pinned": pinned.value ? "1" : "0",
        "data-rail-lead": lead.value,
        "data-rail-top": stickyTop.value,
      }
    : {}
);
const pad2 = (n) => String(n).padStart(2, "0");

/* "Keep going ↓": on down the chapter, past the box (and the widget that
   follows its track): the next thing lands below the top bar. */
function keepGoing() {
  const el = pauseEl.value;
  if (!el) return;
  scrollToY(
    () =>
      el.getBoundingClientRect().bottom +
      (window.scrollY || window.pageYOffset || 0) -
      readerTopInset()
  );
}

/* The cues pulse once, the first time the reader reaches them (CSS; off
   under reduced motion). Nothing loops. */
const arrived = ref(false);
let arrival = null;
watch(
  navEl,
  (el) => {
    arrival?.disconnect();
    arrival = null;
    if (!el || arrived.value || typeof IntersectionObserver !== "function")
      return;
    arrival = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        arrived.value = true;
        arrival?.disconnect();
        arrival = null;
      },
      { threshold: 0.9 }
    );
    arrival.observe(el);
  },
  { flush: "post" }
);
onBeforeUnmount(() => arrival?.disconnect());
</script>

<template>
  <FullBleed
    ref="fullBleed"
    v-slot="{ floating }"
    :stage-attrs="{ 'data-breakout-box': section.id }"
  >
    <div
      ref="pauseEl"
      class="bx-pause"
      :class="{
        'bx-pause--on': floating,
        'bx-pause--panel': panel,
        'bx-pause--rail': railOn,
      }"
      :data-treatment="treatment"
      :data-rail-pause="mode ? '' : undefined"
    >
      <aside
        :id="section.id"
        ref="boxEl"
        :data-section-slug="section.slug"
        :data-treatment="treatment"
        class="bx"
        :class="{
          'bx--floating': floating,
          'bx--paired': pairedExplores,
          'bx--panel': panel,
          'bx--dark': dark,
          'bx--rail': railOn,
          'bx--swipe': swipeOn,
          'bx--tailed': hasTail,
        }"
        :aria-labelledby="titleId"
      >
        <div class="bx-hold">
          <header class="bx-intro">
            <!-- The panels carry the letter in the kicker alone, as the
                 Figma does; the card keeps its round badge. -->
            <span v-if="label && !panel" class="bx-badge" aria-hidden="true">{{
              label
            }}</span>
            <p class="bx-kicker">Breakout box{{ label ? ` ${label}` : "" }}</p>
            <h2 :id="titleId" class="bx-title">{{ section.title }}</h2>
          </header>
        </div>
        <!-- In a rail this is the track: a horizontal scroll container the
             page's scroll moves while the box is pinned, or the reader
             swipes, a page at a time. -->
        <div ref="trackEl" class="bx-body" v-bind="trackAttrs">
          <slot />
          <!-- A swipe track's snap points, one per page (a column of text
               cannot be a snap target itself). -->
          <template v-if="swipeOn && stopCount > 1">
            <span
              v-for="i in stopCount"
              :key="i"
              class="bx-snap"
              :style="{ left: `${(i - 1) * 100}%` }"
              aria-hidden="true"
            ></span>
          </template>
        </div>
        <!-- The rail's way around: the parts by name (or how far along),
             and Previous / Next (a page at a time inside a part wider than
             the screen). -->
        <nav v-if="railOn" class="bx-rail-nav" aria-label="Parts of this box">
          <span class="bx-rail-progress" aria-hidden="true"></span>
          <p v-if="!named" class="bx-rail-where">
            <span class="bx-rail-count">{{ pad2(stop + 1) }}</span>
            <span class="bx-rail-of"> / {{ pad2(stopCount) }}</span>
            <span class="sr-only"> of this box</span>
          </p>
          <ol v-if="named" class="bx-rail-parts">
            <li v-for="(part, i) in parts" :key="part.id">
              <button
                type="button"
                class="bx-rail-part"
                :aria-current="i === active ? 'true' : undefined"
                @click="goToPart(i)"
              >
                <span class="bx-rail-count" aria-hidden="true">{{
                  String(i + 1).padStart(2, "0")
                }}</span>
                {{ part.title }}
              </button>
            </li>
          </ol>
          <div class="bx-rail-arrows">
            <button
              type="button"
              class="bx-rail-arrow"
              aria-label="Previous"
              title="Previous"
              :disabled="atStart"
              @click="prev"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                stroke-width="1.4"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M13 8H3m4-4L3 8l4 4" />
              </svg>
            </button>
            <button
              type="button"
              class="bx-rail-arrow"
              aria-label="Next"
              title="Next"
              :disabled="atEnd"
              @click="next"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                stroke-width="1.4"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M3 8h10M9 4l4 4-4 4" />
              </svg>
            </button>
          </div>
        </nav>
        <!-- On a phone: the reader decides. "Explore more" turns the
             track's page (a swipe does too); "Keep going" carries on down
             the chapter. -->
        <nav
          v-if="swipeOn && stopCount > 1"
          ref="navEl"
          class="bx-swipe-nav"
          :class="{ 'bx-swipe-nav--arrived': arrived }"
          aria-label="This box"
        >
          <span class="bx-rail-progress" aria-hidden="true"></span>
          <div class="bx-swipe-where">
            <button
              type="button"
              class="bx-rail-arrow bx-swipe-back"
              aria-label="Previous"
              title="Previous"
              :disabled="atStart"
              @click="prev"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                stroke-width="1.4"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M13 8H3m4-4L3 8l4 4" />
              </svg>
            </button>
            <p class="bx-rail-where">
              <span class="bx-rail-count">{{ pad2(stop + 1) }}</span>
              <span class="bx-rail-of"> / {{ pad2(stopCount) }}</span>
            </p>
          </div>
          <div class="bx-swipe-cues">
            <button
              type="button"
              class="bx-cue bx-cue--more"
              :disabled="atEnd"
              @click="next"
            >
              <span>Explore more</span>
              <svg
                class="bx-cue-icon"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                stroke-width="1.4"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M3 8h10M9 4l4 4-4 4" />
              </svg>
            </button>
            <button type="button" class="bx-cue bx-cue--on" @click="keepGoing">
              <span>Keep going</span>
              <svg
                class="bx-cue-icon"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                stroke-width="1.4"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M8 3v10M4 9l4 4 4-4" />
              </svg>
            </button>
          </div>
        </nav>
      </aside>
      <div
        v-if="floating"
        class="bx-pause-room"
        :style="room ? { height: `${room}px` } : undefined"
        aria-hidden="true"
      ></div>
    </div>
    <!-- What follows a sideways box's track (a widget that ends the box:
         the Penfield binder's band), as it followed the box's text. -->
    <div
      v-if="hasTail"
      class="bx-after"
      :class="{ 'bx-after--panel': panel, 'bx-after--floating': floating }"
      :data-treatment="treatment"
    >
      <slot name="after" />
    </div>
  </FullBleed>
</template>

<style scoped>
/* The palette, one set per treatment, on the frame so the pause room and
   the box read the same properties. Pale: the chapter's palest ramp tone
   sets the box apart from the reading page (white), in every chapter's own
   colour, with ink text and hairlines. */
.bx-pause,
.bx-after {
  --bx-bg: rgb(var(--color-chapter-pale, var(--color-paper)));
  --bx-ink: rgb(var(--color-ink));
  --bx-ink-soft: rgb(var(--color-ink) / 0.7);
  --bx-kicker: rgb(var(--color-ink) / 0.7);
  --bx-rule: rgb(var(--color-ink));
  --bx-hairline: rgb(var(--color-line));
  --bx-fig-label: rgb(var(--color-mute));
  --bx-quote-rule: rgb(var(--color-chapter, var(--color-ink)));
  --bx-wash: rgb(var(--color-ink) / 0.06);
}
/* Dark (Figma 2730:8031, 2730:8111): --color-dark-surface, white text
   (17.0:1), the kicker in the chapter's colour (#8D4CF6 on #1C1C1C is
   3.65:1, the Figma's own pairing; it is 10.5px mono, so this is the one
   place the panel is below AA's 4.5 for small text), figure labels in
   amber (8.4:1). No rules: the panel's edge is its colour. */
.bx-pause[data-treatment="dark"],
.bx-after[data-treatment="dark"] {
  --bx-bg: rgb(var(--color-dark-surface));
  --bx-ink: #fff;
  --bx-ink-soft: rgb(255 255 255 / 0.7);
  --bx-kicker: rgb(var(--color-chapter));
  --bx-rule: transparent;
  --bx-hairline: rgb(255 255 255 / 0.22);
  --bx-fig-label: rgb(var(--color-warn));
  --bx-quote-rule: rgb(var(--color-chapter));
  --bx-wash: rgb(255 255 255 / 0.08);
}
/* Plate (OPENBRAIN-157): the lighter dark, --color-dark-surface-2, the
   rest as dark. White is 14.35:1 on it, amber 7.1:1; the kicker in the
   chapter's colour is 3.1:1 at its tightest (fund) and 8.2:1 at its widest
   (deve), the label's 3:1 on every ramp. */
.bx-pause[data-treatment="plate"],
.bx-after[data-treatment="plate"] {
  --bx-bg: rgb(var(--color-dark-surface-2));
  --bx-ink: #fff;
  --bx-ink-soft: rgb(255 255 255 / 0.7);
  --bx-kicker: rgb(var(--color-chapter));
  --bx-rule: transparent;
  --bx-hairline: rgb(255 255 255 / 0.22);
  --bx-fig-label: rgb(var(--color-warn));
  --bx-quote-rule: rgb(var(--color-chapter));
  --bx-wash: rgb(255 255 255 / 0.08);
}
/* Chapter (the Figma's violet, 2730:8059, on every ramp): the chapter's
   colour as ground, --color-chapter-ground (main, or deep for move, whose
   main is 4.44:1 with white), and everything on it in --color-chapter-on
   (brand.css, OPENBRAIN-157): white on fund 4.67 and move 5.96, the dark
   surface on perc 9.50, lear 4.74 and deve 9.70. Every word is the full
   ink, legends included: white at 0.85 on violet would drop to 3.8. The
   Figma sets the figure label in amber, which is 2.3:1 on violet and 1.1:1
   on yellow, so here it is the ink too. */
.bx-pause[data-treatment="chapter"],
.bx-after[data-treatment="chapter"] {
  --bx-bg: rgb(var(--color-chapter-ground, var(--color-chapter)));
  --bx-ink: rgb(var(--color-chapter-on, 255 255 255));
  --bx-ink-soft: rgb(var(--color-chapter-on, 255 255 255));
  --bx-kicker: rgb(var(--color-chapter-on, 255 255 255));
  --bx-rule: transparent;
  --bx-hairline: rgb(var(--color-chapter-on, 255 255 255) / 0.35);
  --bx-fig-label: rgb(var(--color-chapter-on, 255 255 255));
  --bx-quote-rule: rgb(var(--color-chapter-on, 255 255 255));
  --bx-wash: rgb(var(--color-chapter-on, 255 255 255) / 0.1);
}

.bx {
  position: relative;
  margin: 2.5rem 0;
  border-top: 1px solid var(--bx-rule);
  border-bottom: 1px solid var(--bx-rule);
  background: var(--bx-bg);
  color: var(--bx-ink);
}
.bx-intro {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 1.5rem 1.25rem 0.5rem;
}
.bx-badge {
  display: grid;
  place-items: center;
  width: 3rem;
  height: 3rem;
  border: 1px solid var(--bx-ink);
  border-radius: 50%;
  background: rgb(var(--color-paper));
  font: 1.25rem/1 var(--font-mono);
  letter-spacing: 0.04em;
}
.bx-kicker {
  margin: 0;
  font: 0.75rem/1.3 var(--font-mono);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--bx-kicker);
}
.bx-title {
  margin: 0;
  font-family: var(--font-body);
  font-size: clamp(1.5rem, 2.4vw, 2.25rem);
  font-weight: 500;
  line-height: 1.25;
  text-wrap: balance;
}
.bx-body {
  padding: 0.5rem 1.25rem 2rem;
}

/* A compact heading and body share one screen where the source fits. */
.bx--floating {
  margin: 0;
  min-height: calc(100vh - var(--reader-topbar-h, 4rem));
  /* svh, not dvh: a height that follows the phone's address bar moves the
     page under the reader (OPENBRAIN-185, see FullBleed's .fb-screen). */
  min-height: calc(100svh - var(--reader-topbar-h, 4rem));
  padding: clamp(1.5rem, 4vh, 3rem) 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.bx--floating .bx-intro {
  max-width: calc(var(--reading-measure, 780px) + 4rem);
  margin: 0 auto;
  padding: 0 2rem 1.5rem;
}
.bx--floating .bx-title {
  font-size: clamp(1.75rem, 2.5vw, 2.5rem);
}
.bx--floating .bx-body {
  position: relative;
  width: 100%;
  max-width: calc(var(--reading-measure, 780px) + 4rem);
  margin: 0 auto;
  padding: 0 2rem;
}

.bx--paired .bx-body {
  max-width: 76rem;
}

/* The panels (OPENBRAIN-153). The heading is centred, kicker over title,
   as in every Figma panel; the title keeps the subhead role (36/45 medium
   in the Figma, which the floating clamp reaches at 1440). More air above
   and below than the card: the panel is a page of its own colour. */
.bx--panel .bx-intro {
  align-items: center;
  gap: 0.75rem;
  text-align: center;
}
.bx--panel .bx-kicker {
  letter-spacing: 0.12em;
}
.bx--panel .bx-title {
  width: 100%;
  max-width: 28em;
  line-height: 1.25;
}
.bx--panel:not(.bx--floating) {
  margin: 2.5rem 0;
  padding: 1.5rem 0 1rem;
}
.bx--panel.bx--floating .bx-intro {
  padding-bottom: 2.5rem;
}
/* Below the two-column reader the box is in the prose column, whose
   figures already bleed to the viewport (IllustrationPlaceholder,
   OPENBRAIN-138); a colour panel bleeds the same way, its text kept on the
   prose gutters, so it is a band across the page and not a dark card. */
@media (max-width: 1023px) {
  .bx--panel:not(.bx--floating) {
    width: var(--app-w, 100vw);
    margin-left: calc(50% - var(--app-w, 100vw) / 2);
  }
  .bx--panel:not(.bx--floating) .bx-intro,
  .bx--panel:not(.bx--floating) .bx-body {
    padding-inline: var(--reader-gutter-l, 1.25rem)
      var(--reader-gutter-r, 1.25rem);
  }
}

/* What the box's text brings with it, repainted for the panels. The
   figure heading (IllustrationPlaceholder) and the extract (index.css
   blockquote) carry their own ink and mute, so they are set here through
   the same --bx-* properties; the pale card changes nothing. */
.bx :deep(.fig-label) {
  color: var(--bx-fig-label);
}
.bx--panel :deep(.fig-name) {
  color: var(--bx-ink);
}
.bx--panel :deep(.fig-legend),
.bx--panel :deep(.figimg-caption),
.bx--panel :deep(.figimg-count) {
  color: var(--bx-ink-soft);
}
.bx--panel :deep(.fig-fs-btn) {
  border-color: var(--bx-hairline);
  color: var(--bx-ink);
}
.bx--panel :deep(.fig-fs-btn:hover) {
  border-color: var(--bx-ink);
  background: var(--bx-wash);
}
.bx--panel :deep(blockquote) {
  border-left-color: var(--bx-quote-rule);
  color: var(--bx-ink);
}
/* Citation superscripts are magenta on paper; on violet that is 1.1:1, on
   dark 4.1:1, on the plate 3.4:1 and on the yellow ramp 2.4:1, so in a
   panel they are the panel's ink and keep their weight; their hover
   underline (index.css, magenta) follows. Links in the box's text the same:
   magenta on any of these grounds is lost. */
.bx--panel :deep(.citation-ref),
.bx--panel :deep(.bx-body a) {
  color: var(--bx-ink);
}
.bx--panel :deep(.citation-ref:hover),
.bx--panel :deep(.bx-body a) {
  text-decoration-color: currentColor;
}
/* An Explore card (ExploreCard.vue) on a dark plate (dark, plate) is the
   plate's own colour inside a hairline, its image plain on the dark as the
   Figma lays it (duotoned art comes baked into the asset, OPENBRAIN-153);
   on the chapter colour the card stays paper, which is where the Figma
   puts its images. */
.bx--dark :deep(.xc) {
  border-color: var(--bx-hairline);
  border-left-color: rgb(var(--color-chapter));
  background: transparent;
  color: var(--bx-ink);
}
.bx--dark :deep(.xc-figure) {
  background: transparent;
  border-right-color: var(--bx-hairline);
}
.bx--dark :deep(.xc-legend),
.bx--dark :deep(.xc-kicker) {
  color: var(--bx-ink-soft);
}
.bx--dark :deep(.xc-btn) {
  border-color: var(--bx-ink);
  color: var(--bx-ink);
}
.bx--dark :deep(.xc-btn:hover) {
  background: var(--bx-wash);
}
.bx--dark :deep(.xc-panel) {
  border-top-color: var(--bx-hairline);
}

/* The pause: the box sticks below the top bar while the room after it
   (BX_PAUSE, on the box's own colour, so the box just reads as
   taller) scrolls past, then leaves with it. */
.bx-pause--on {
  border-bottom: 1px solid var(--bx-rule);
  background: var(--bx-bg);
}
.bx-pause-room {
  height: 45vh; /* BX_PAUSE */
}
.bx-pause--on > .bx {
  position: sticky;
  top: var(--reader-topbar-h, 4rem);
  border-bottom: 0;
}
/* Reduced motion: no pause. The reader's own setting decides
   (data-reduce-motion "1" on, "0" off); the OS setting only when unset.
   Plain selectors, never the global() wrapper: scoped CSS keeps only
   what is inside it, so the rule hit :root and hid the whole page. */
:root[data-reduce-motion="1"] .bx-pause-room {
  display: none;
}
:root[data-reduce-motion="1"] .bx-pause--on > .bx {
  position: relative;
  top: auto; /* the sticky offset would shift it over what follows */
}
@media (prefers-reduced-motion: reduce) {
  :root:not([data-reduce-motion="0"]) .bx-pause-room {
    display: none;
  }
  :root:not([data-reduce-motion="0"]) .bx-pause--on > .bx {
    position: relative;
    top: auto;
  }
}

/* ── The rail (OPENBRAIN-163, helper/exploreRail.js) ──────────────────────
   A box of Explore parts read sideways. The box is exactly the screen
   under the top bar, so nothing in it scrolls down: the heading, the track
   (all the room that is left) and the nav above the timeline's strip. The
   pause spacer is as long as the track's travel (useExploreRail sets its
   height), and the page's scroll through it moves the track. */
.bx--floating.bx--rail {
  --rail-gutter: clamp(1.5rem, 4vw, 4rem);
  /* A part leaves this much of the next one showing: the way on. */
  --rail-peek: clamp(3rem, 5vw, 6rem);
  --rail-gap: clamp(2rem, 4vw, 4rem);
  /* What a part has when it is at the left: the track (100cqw is its
     width inside the left gutter) less the right gutter and the peek. */
  --rail-view: calc(100cqw - var(--rail-gutter) - var(--rail-peek));
  height: calc(100vh - var(--reader-topbar-h, 4rem));
  height: calc(100svh - var(--reader-topbar-h, 4rem));
  min-height: 0;
  padding: clamp(1rem, 3.5vh, 2.5rem) 0 var(--reader-timeline-h, 0px);
  justify-content: flex-start;
}
.bx--floating.bx--rail .bx-intro {
  max-width: none;
  padding: 0 var(--rail-gutter) clamp(1rem, 3vh, 2rem);
}
.bx--floating.bx--rail .bx-title {
  font-size: clamp(1.5rem, 2.2vw, 2.25rem);
}
/* The track. Its own scrollbar is hidden (index.css hides them all); the
   nav below says where the reader is. A size container, so the parts can
   size from its box (cqw / cqh) without script. */
.bx--floating.bx--rail .bx-body {
  flex: 1 1 0;
  min-height: 0;
  width: 100%;
  max-width: none;
  margin: 0;
  padding: 0 0 0 var(--rail-gutter);
  overflow-x: auto;
  overflow-y: hidden;
  /* The sideways swipe that reaches the end must not become the browser's
     Back gesture. Only the x axis: a wheel down still scrolls the page
     (OPENBRAIN-39). */
  overscroll-behavior-x: contain;
  container-type: size;
}
.bx--floating.bx--rail .bx-body:focus-visible {
  outline: 2px solid var(--bx-ink);
  outline-offset: -2px;
}
/* SectionComp's wrapper and its row of parts (RailPart), as one row as
   wide as the parts; the right gutter is the row's, so it is part of the
   travel. */
.bx--rail .bx-body > :deep(div) {
  display: flex;
  flex-direction: column;
  width: max-content;
  height: 100%;
}
.bx--rail :deep(.bx-rail-row) {
  display: flex;
  flex: 1 1 0;
  gap: var(--rail-gap);
  width: max-content;
  min-height: 0;
  padding-right: var(--rail-gutter);
}
/* Edit mode's own title field (SectionComp) sits above the row, takes
   its height from it, and stays in view while the track moves. */
.bx--rail .bx-body > :deep(div > .editable-block-wrapper) {
  position: sticky;
  left: 0;
  flex: none;
  width: var(--rail-view);
}
.bx--rail :deep(.bx-rail-row > .rp) {
  flex: none;
  height: 100%;
  /* At least the view; the last part a full screen, so it too can reach
     the left. */
  min-width: var(--rail-view);
}
/* Parts are told apart by a hairline with the gap's room either side,
   not by colour (the chapter colour's rules read as stripes, Anton 9 Nov). */
.bx--rail :deep(.bx-rail-row > .rp:not(:first-child)) {
  --rail-lead: calc(var(--rail-gap) + 1px);
  padding-left: var(--rail-gap);
  border-left: 1px solid var(--bx-hairline);
}
.bx--rail :deep(.bx-rail-row > .rp:last-child) {
  min-width: calc(100cqw - var(--rail-gutter));
}

.bx-rail-nav {
  position: relative;
  display: flex;
  align-items: center;
  gap: 1.5rem;
  margin: clamp(1rem, 3vh, 1.75rem) var(--rail-gutter) 0;
  padding: 0.5rem 0 0.75rem;
  border-top: 1px solid var(--bx-hairline);
}
/* How far along the track, drawn over the nav's hairline. */
.bx-rail-progress {
  position: absolute;
  top: -1px;
  left: 0;
  width: 100%;
  height: 1px;
  background: var(--bx-ink);
  transform: scaleX(var(--rail-progress, 0));
  transform-origin: left center;
}
.bx-rail-parts {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 1.75rem;
  flex: 1;
  min-width: 0;
  margin: 0;
  padding: 0;
  list-style: none;
}
.bx-rail-part {
  display: inline-flex;
  align-items: baseline;
  gap: 0.6rem;
  min-height: 44px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--bx-ink-soft);
  font: 400 var(--ui-size-12) / 1.3 var(--font-mono);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  text-align: left;
  cursor: pointer;
}
.bx-rail-part:hover,
.bx-rail-part[aria-current="true"] {
  color: var(--bx-ink);
}
.bx-rail-part[aria-current="true"] {
  font-weight: 600;
}
.bx-rail-count {
  color: var(--bx-kicker);
}
/* How far along a track of unnamed parts: "02 / 05" (Previous and Next
   stop there). */
.bx-rail-where {
  flex: 1;
  min-width: 0;
  margin: 0;
  font: 400 var(--ui-size-12) / 1.3 var(--font-mono);
  letter-spacing: 0.08em;
  color: var(--bx-ink-soft);
}
.bx-rail-where .bx-rail-count {
  font-weight: 600;
}
.bx-rail-arrows {
  display: flex;
  gap: 0.5rem;
  flex: none;
}
.bx-rail-arrow {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border: 1px solid var(--bx-ink);
  border-radius: 0;
  background: transparent;
  color: var(--bx-ink);
  cursor: pointer;
  transition: background-color 0.15s ease;
}
.bx-rail-arrow:hover:not(:disabled) {
  background: var(--bx-wash);
}
.bx-rail-arrow:disabled {
  border-color: var(--bx-hairline);
  color: var(--bx-ink-soft);
  opacity: 0.5;
  cursor: default;
}
.bx-rail-part:focus-visible,
.bx-rail-arrow:focus-visible {
  outline: 2px solid var(--bx-ink);
  outline-offset: 2px;
}
/* On paper there is no sideways: the parts follow each other down the
   page, each with its columns across it. */
@media print {
  .bx--floating.bx--rail {
    height: auto;
  }
  .bx--floating.bx--rail .bx-body {
    overflow: visible;
    padding-right: var(--rail-gutter);
    container-type: normal;
  }
  .bx--rail .bx-body > :deep(div),
  .bx--rail :deep(.bx-rail-row),
  .bx--swipe .bx-body > :deep(div),
  .bx--swipe :deep(.bx-rail-row) {
    display: block;
    width: auto;
    height: auto;
    padding-right: 0;
  }
  .bx--rail :deep(.bx-rail-row > .rp) {
    min-width: 0;
    height: auto;
    margin-bottom: 2rem;
  }
  .bx.bx--swipe:not(.bx--floating) .bx-body {
    height: auto;
    overflow: visible;
    container-type: normal;
  }
  .bx-rail-nav,
  .bx-swipe-nav,
  .bx-snap {
    display: none;
  }
}

/* ── The swipe track (OPENBRAIN-187: phones, tablets) ─────────────────────
   Below the two-column reader the box stays in the column and the page's
   scroll is never taken over (a pin there is what made the page judder):
   the track is a native horizontal scroller as wide as the box, a page at
   a time, snapping to the points the box draws (.bx-snap). Its height is
   in svh, never dvh: a block in the flow that follows the phone's address
   bar moves the page under the reader (OPENBRAIN-185). A size container,
   so each page sizes from it (100cqw is a page). */
.bx.bx--swipe:not(.bx--floating) .bx-body {
  position: relative;
  height: clamp(22rem, 62vh, 40rem);
  height: clamp(22rem, 62svh, 40rem);
  margin: 0.5rem 0 0;
  padding: 0;
  overflow-x: auto;
  overflow-y: hidden;
  scroll-snap-type: x mandatory;
  /* The swipe that reaches the end must not become the browser's Back
     gesture. Only the x axis: a swipe down still scrolls the page. */
  overscroll-behavior-x: contain;
  container-type: size;
}
.bx.bx--swipe .bx-body:focus-visible {
  outline: 2px solid var(--bx-ink);
  outline-offset: -2px;
}
.bx--swipe .bx-body > :deep(div) {
  display: flex;
  flex-direction: column;
  width: max-content;
  height: 100%;
}
.bx--swipe :deep(.bx-rail-row) {
  display: flex;
  flex: 1 1 0;
  width: max-content;
  min-height: 0;
}
.bx--swipe :deep(.bx-rail-row > .rp) {
  flex: none;
  height: 100%;
}
.bx-snap {
  position: absolute;
  top: 0;
  width: 1px;
  height: 1px;
  scroll-snap-align: start;
  pointer-events: none;
}
.bx-swipe-nav {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin: 1rem var(--reader-gutter-l, 1.25rem) 0 var(--reader-gutter-l, 1.25rem);
  padding-top: 0.5rem;
  border-top: 1px solid var(--bx-hairline);
}
.bx-swipe-where {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.bx-swipe-back {
  width: 40px;
  height: 40px;
}
.bx-swipe-cues {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.bx-cue {
  display: inline-flex;
  flex: 1 1 9rem;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  min-height: 48px;
  padding: 0.5rem 0.9rem;
  border: 1px solid var(--bx-ink);
  border-radius: 0;
  background: transparent;
  color: var(--bx-ink);
  font: 400 var(--ui-size-12) / 1.2 var(--font-mono);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.15s ease;
}
.bx-cue--more {
  background: var(--bx-ink);
  color: var(--bx-bg);
}
@media (hover: hover) {
  .bx-cue:hover:not(:disabled) {
    background: var(--bx-wash);
  }
  .bx-cue--more:hover:not(:disabled) {
    background: var(--bx-ink-soft);
  }
}
.bx-cue:disabled {
  border-color: var(--bx-hairline);
  background: transparent;
  color: var(--bx-ink-soft);
  opacity: 0.6;
  cursor: default;
}
.bx-cue:focus-visible {
  outline: 2px solid var(--bx-ink);
  outline-offset: 2px;
}
.bx-cue-icon {
  flex: none;
}
/* Arriving at the cues: each arrow nudges once the way it goes, the first
   time only. Nothing loops, and under reduced motion nothing moves. */
.bx-swipe-nav--arrived .bx-cue--more:not(:disabled) .bx-cue-icon {
  animation: bx-nudge-x 0.9s ease-in-out 0.2s 1;
}
.bx-swipe-nav--arrived .bx-cue--on .bx-cue-icon {
  animation: bx-nudge-y 0.9s ease-in-out 0.5s 1;
}
@keyframes bx-nudge-x {
  0%,
  100% {
    transform: none;
  }
  40% {
    transform: translateX(5px);
  }
}
@keyframes bx-nudge-y {
  0%,
  100% {
    transform: none;
  }
  40% {
    transform: translateY(4px);
  }
}
/* What follows the track (the Penfield binder), on the box's ground so
   the room above it is the box's and not a strip of page: in the column
   the box's bottom margin moves below it, and a panel's band bleeds to
   the viewport as the panel does. */
.bx-after {
  position: relative;
  display: flow-root;
  background: var(--bx-bg);
}
.bx.bx--tailed:not(.bx--floating) {
  margin-bottom: 0;
}
.bx-after:not(.bx-after--floating) {
  margin-bottom: 2.5rem;
  padding-bottom: 1rem;
}
@media (max-width: 1023px) {
  .bx-after--panel:not(.bx-after--floating) {
    width: var(--app-w, 100vw);
    margin-left: calc(50% - var(--app-w, 100vw) / 2);
  }
}

:root[data-reduce-motion="1"] .bx-rail-arrow,
:root[data-reduce-motion="1"] .bx-cue {
  transition: none;
}
:root[data-reduce-motion="1"] .bx-cue-icon {
  animation: none !important;
}
@media (prefers-reduced-motion: reduce) {
  :root:not([data-reduce-motion="0"]) .bx-rail-arrow,
  :root:not([data-reduce-motion="0"]) .bx-cue {
    transition: none;
  }
  :root:not([data-reduce-motion="0"]) .bx-cue-icon {
    animation: none !important;
  }
}

/* The box covers the divider, so its paragraphs' figure marks (index.css)
   have no line to sit on. */
.bx--floating :deep(.animationTrigger[id]::before) {
  display: none;
}
</style>
