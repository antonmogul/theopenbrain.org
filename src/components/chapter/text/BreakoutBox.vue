<script setup>
/* Breakouts occupy the reader width and keep their artwork inside their
 * own stage. Short boxes read as one viewport-sized panel; long manuscript
 * text remains in normal vertical flow until horizontal paging is designed.
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
import { computed, inject } from "vue";
import FullBleed from "@/components/chapter/FullBleed.vue";
import {
  DARK_BOX_TREATMENTS,
  boxTreatmentFor,
  normalizeBoxTreatment,
} from "@/helper/breakoutTreatment";

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
});

const chapterSlug = inject("chapterSlug", null);
const treatment = computed(
  () =>
    normalizeBoxTreatment(props.treatment) ||
    boxTreatmentFor(props.section, chapterSlug?.value ?? chapterSlug)
);
/* The panels share one layout (centred heading, no badge, full bleed on
   phones); only their palette differs. The two dark plates also share the
   Explore card on the plate (bx--dark). */
const panel = computed(() => treatment.value !== "pale");
const dark = computed(() => DARK_BOX_TREATMENTS.includes(treatment.value));

const titleId = computed(() => `box-title-${props.section.id}`);
</script>

<template>
  <FullBleed
    v-slot="{ floating }"
    :stage-attrs="{ 'data-breakout-box': section.id }"
  >
    <div
      class="bx-pause"
      :class="{ 'bx-pause--on': floating, 'bx-pause--panel': panel }"
      :data-treatment="treatment"
    >
      <aside
        :id="section.id"
        :data-section-slug="section.slug"
        :data-treatment="treatment"
        class="bx"
        :class="{
          'bx--floating': floating,
          'bx--paired': pairedExplores,
          'bx--panel': panel,
          'bx--dark': dark,
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
        <div class="bx-body">
          <slot />
        </div>
      </aside>
      <div v-if="floating" class="bx-pause-room" aria-hidden="true"></div>
    </div>
  </FullBleed>
</template>

<style scoped>
/* The palette, one set per treatment, on the frame so the pause room and
   the box read the same properties. Pale: the chapter's palest ramp tone
   sets the box apart from the reading page (white), in every chapter's own
   colour, with ink text and hairlines. */
.bx-pause {
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
.bx-pause[data-treatment="dark"] {
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
.bx-pause[data-treatment="plate"] {
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
.bx-pause[data-treatment="chapter"] {
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
  min-height: calc(100dvh - var(--reader-topbar-h, 4rem));
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
}
@media (prefers-reduced-motion: reduce) {
  :root:not([data-reduce-motion="0"]) .bx-pause-room {
    display: none;
  }
  :root:not([data-reduce-motion="0"]) .bx-pause--on > .bx {
    position: relative;
  }
}

/* The box covers the divider, so its paragraphs' figure marks (index.css)
   have no line to sit on. */
.bx--floating :deep(.animationTrigger[id]::before) {
  display: none;
}
</style>
