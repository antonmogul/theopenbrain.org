<script setup>
/*
 * RailPart — one part of a breakout box read sideways (OPENBRAIN-163, 187;
 * the format is helper/exploreRail.js's, which cuts a box into parts).
 *
 * A part is its pictures first, then its text in columns as tall as the
 * track. Each picture shows once, at the start, as the figure itself, with
 * its label, legend and expand button (Stuart, 12 Nov: "just show the image
 * with legend and expandable button once, first, and then not at the
 * end"): the paragraphs' figures are drawn here, never again in the text
 * (SectionComp leaves them out of a rail's paragraphs). An Explore part's
 * own picture (content.explore.image) leads too, unless a figure already
 * shows that file (the rete mirabile's card image is Figure C's); it is a
 * figure of the same shape, with its legend and the same expand button.
 *
 * Two layouts, by the box's mode (BreakoutBox provides it as exploreRail):
 * on the pinned "track" a picture is a column of its own beside the text;
 * on the phone's "swipe" track every picture and every column of text is
 * a page as wide as the track, and the track snaps from page to page.
 */
import { computed, inject, ref, unref } from "vue";
import IllustrationInline from "@/components/chapter/Illus/IllustrationInline.vue";
import DemoModal from "@/components/chapter/demos/DemoModal.vue";
import { imageUrl } from "@/editor/media.mjs";
import { shownBy, useFigureSources } from "@/composables/useFigureSources";

const props = defineProps({
  /** { id, title, explore } from railLayoutOf (title: an Explore part's). */
  part: { type: Object, required: true },
  /** The animation ids of the figures to draw, in reading order. */
  figures: { type: Array, default: () => [] },
  /** An Explore part's own picture: { src, alt }. */
  image: { type: Object, default: null },
  /** That picture's legend. */
  legend: { type: String, default: "" },
  /** Its place in the box, for an unnamed part's accessible name. */
  index: { type: Number, default: 0 },
  count: { type: Number, default: 1 },
});

const boxRail = inject("exploreRail", null);
const mode = computed(() => unref(boxRail) || "track");

const sources = useFigureSources(() => props.figures);
/* The Explore picture, unless one of the figures is that same file. */
const picture = computed(() =>
  props.image?.src && !shownBy(sources.value, props.image.src)
    ? props.image
    : null
);
const pictures = computed(() => props.figures.length + (picture.value ? 1 : 0));

const titleId = computed(() => `rail-part-title-${props.part.id}`);
const label = computed(() =>
  props.part.title ? undefined : `Part ${props.index + 1} of ${props.count}`
);

const expanded = ref(false);
</script>

<template>
  <!-- A div, not a <section>: the reader gives every section in
       .chapter-reader a full screen's height (index.css). -->
  <div
    class="rp"
    :class="[
      `rp--${mode}`,
      { 'rp--explore': part.explore, 'rp--no-picture': !pictures },
    ]"
    :style="{ '--rail-figures': pictures }"
    data-rail-part
    :data-explore="part.explore ? part.id : undefined"
    role="group"
    :aria-labelledby="part.title ? titleId : undefined"
    :aria-label="label"
  >
    <figure v-if="picture" class="rp-figure rp-picture" data-rail-figure>
      <div class="rp-picture-bar">
        <button
          class="rp-expand"
          type="button"
          title="Expand to full screen"
          aria-label="Expand to full screen"
          @click="expanded = true"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            stroke="currentColor"
            stroke-width="1.4"
            stroke-linecap="round"
            aria-hidden="true"
          >
            <path d="M1 5V1h4M13 5V1H9M1 9v4h4M13 9v4H9" />
          </svg>
        </button>
      </div>
      <img
        class="rp-img"
        :src="imageUrl(picture.src)"
        :alt="picture.alt || ''"
        decoding="async"
      />
      <figcaption v-if="legend" class="rp-legend">{{ legend }}</figcaption>
    </figure>
    <div
      v-for="id in figures"
      :key="id"
      class="rp-figure"
      data-rail-figure
      :data-rail-figure-id="id"
    >
      <IllustrationInline :animation-id="id" />
    </div>
    <div class="rp-text" data-rail-columns>
      <h3 v-if="part.title" :id="titleId" class="rp-title">
        {{ part.title }}
      </h3>
      <slot />
    </div>
    <DemoModal
      v-if="picture"
      :show="expanded"
      :title="part.title || picture.alt || ''"
      wide
      ground="dark"
      @close="expanded = false"
    >
      <figure class="rp-full">
        <img
          class="rp-full-img"
          :src="imageUrl(picture.src)"
          :alt="picture.alt || ''"
        />
        <figcaption v-if="legend" class="rp-full-legend">
          {{ legend }}
        </figcaption>
      </figure>
    </DemoModal>
  </div>
</template>

<style scoped>
/* ── On the pinned track (from the two-column breakpoint) ────────────────
   The columns are sized so a whole number of them shows beside the
   pictures when the part is at the left: --rail-fit of them fill the
   track's view (--rail-view: its width less the gutters and the next
   part's peek, set by BreakoutBox, like the gutter and the peek
   themselves), so the first screen of a part never ends in half a column.
   One column on a narrow track, two from a laptop (about 1200px, where each
   is some 33 characters wide), three on a very wide screen. Lengths in cq*
   and the @container rules are the track's (a size container). */
.rp {
  --rail-fit: 1;
  --rail-figure: clamp(15rem, 22cqw, 26rem);
  --rail-col-gap: 3rem;
  --rail-lead: 0px; /* a later part's divider and the room after it */
  /* The pictures and the gaps after them (none: minus the one gap). */
  --rail-figures-w: calc(
    var(--rail-figures, 0) * (var(--rail-figure) + var(--rail-col-gap)) -
      var(--rail-col-gap)
  );
  /* Never wider than a comfortable line (36rem is about 58 characters of
     the box's text); where one column would be, a second one shows in
     part instead. */
  --rail-col: max(
    14rem,
    min(
      36rem,
      calc(
        (var(--rail-view, 100cqw) - var(--rail-lead) - var(--rail-figures-w)) /
          var(--rail-fit) - var(--rail-col-gap)
      )
    )
  );
  display: flex;
  gap: var(--rail-col-gap);
  height: 100%;
  margin: 0;
  padding: 0;
  color: inherit;
}
@container (min-width: 1150px) {
  .rp {
    --rail-fit: 2;
  }
}
@container (min-width: 2050px) {
  .rp {
    --rail-fit: 3;
  }
}
.rp-figure {
  flex: none;
  width: var(--rail-figure);
  height: 100%;
  min-height: 0;
  margin: 0;
  overflow: hidden;
}
/* The figure shell inline normally bleeds to the phone's viewport and
   leaves room above and below it in the prose; here it is the part's
   column. Its images fit the track under the toolbar and the legend. */
.rp-figure :deep(.illu-inline) {
  margin: 0;
}
.rp-figure :deep(.fig-shell--inline) {
  width: 100%;
  min-width: 0;
  margin-inline: 0;
}
.rp-figure :deep(.fig-shell--inline .fig-toolbar) {
  padding-inline: 0;
}
/* What gives in a figure taller than the track: a single image, or a
   gallery's stage box (its image fits inside it). Fitted by fitRailFigures
   (--rp-img-max); until then, a guess at the toolbar and the legend. The
   extra .rp outranks FigureImages' own flow rules whichever loads last. */
.rp .rp-figure :deep(.figimg-stage:not(.figimg-stage--gallery) .figimg-img) {
  width: 100%;
  max-height: var(--rp-img-max, calc(100cqh - 10rem));
  object-fit: contain;
  object-position: left top;
}
.rp .rp-figure :deep(.figimg-stage--gallery) {
  max-height: var(--rp-img-max, calc(100cqh - 14rem));
}
/* A video on its own (a YouTube poster) sizes from its frame here: the
   flow stage has no height of its own to lay the player over. */
.rp .rp-figure :deep(.figimg-stage:not(.figimg-stage--gallery) .figimg-player) {
  position: relative;
  inset: auto;
  height: auto;
}
.rp-picture {
  display: flex;
  flex-direction: column;
}
.rp-picture-bar {
  display: flex;
  justify-content: flex-end;
  padding-bottom: 0.5rem;
}
.rp-expand {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border: 1px solid var(--bx-hairline, rgb(var(--color-line)));
  border-radius: 0;
  background: transparent;
  color: var(--bx-ink, rgb(var(--color-ink)));
  cursor: pointer;
}
.rp-expand:hover {
  border-color: var(--bx-ink, rgb(var(--color-ink)));
  background: var(--bx-wash, rgb(var(--color-ink) / 0.06));
}
.rp-expand:focus-visible {
  outline: 2px solid var(--bx-ink, rgb(var(--color-accent)));
  outline-offset: 2px;
}
.rp-img {
  display: block;
  flex: none;
  width: 100%;
  height: auto;
  /* The bar above and the legend's lines below fit with it. */
  max-height: var(--rp-img-max, calc(100cqh - 10rem));
  object-fit: contain;
  object-position: left top;
}
.rp-legend {
  margin: 0;
  padding: 0.6rem 0 0;
  font: 400 var(--ui-size-11) / 1.4 var(--font-mono);
  color: var(--bx-ink-soft, rgb(var(--color-ink) / 0.7));
}
/* As wide as the columns the view fits, the text balanced across them (a
   short extract becomes two even columns, not one and a blank); a longer
   one fills them and carries on to the right (fitRailColumns). */
.rp-text {
  flex: none;
  width: calc(
    var(--rail-fit) * (var(--rail-col) + var(--rail-col-gap)) -
      var(--rail-col-gap)
  );
  height: 100%;
  column-width: var(--rail-col);
  column-gap: var(--rail-col-gap);
  column-fill: balance;
}
.rp-title {
  margin: -0.2em 0 1rem; /* its cap height level with the picture's top */
  padding: 0; /* the global h3 rule adds some */
  font-family: var(--font-body);
  font-size: clamp(1.35rem, 1.8vw, 1.75rem);
  font-weight: 500;
  line-height: 1.25;
  text-wrap: balance;
  break-after: avoid;
}
/* A subsection starts a column of its own. */
.rp-text :deep(.subT),
.rp-text :deep(.subChapter) {
  break-before: column;
}
/* An extract in a column: no narrower than the column, ragged right
   (justified lines this short open rivers), and kept whole, so its rule
   is never a stripe broken over two columns. */
.rp-text :deep(blockquote) {
  max-width: none;
  margin-inline: 0;
  text-align: left;
  break-inside: avoid;
}
/* An Explore part that is one long extract (Hippocrates) is set as the
   text: no rule at all, since it has to break over columns. */
.rp--explore .rp-text :deep(blockquote) {
  margin: 0;
  padding: 0;
  border: 0;
  font-size: inherit;
  line-height: inherit;
  color: inherit;
  break-inside: auto;
}
/* Anything else that draws a picture in the text stays whole in its
   column, no taller than it. */
.rp-text :deep(img) {
  max-width: 100%;
  max-height: 60cqh;
  object-fit: contain;
  break-inside: avoid;
}

/* ── On the phone's swipe track ───────────────────────────────────────────
   Every picture and every column of text is a page exactly the track's
   width, with the page's own gutters inside it, so the track's snap points
   (BreakoutBox, one per page) fall on every one of them. */
.rp--swipe {
  --rp-gutter: var(--reader-gutter-l, 1.25rem);
  gap: 0;
}
.rp--swipe .rp-figure {
  box-sizing: border-box;
  width: 100cqw;
  padding: 0 var(--rp-gutter);
}
.rp--swipe .rp-img,
.rp.rp--swipe .rp-figure :deep(.figimg-img) {
  object-position: center top;
}
.rp--swipe .rp-text {
  box-sizing: content-box;
  width: calc(100cqw - 2 * var(--rp-gutter));
  padding: 0 var(--rp-gutter);
  column-width: calc(100cqw - 2 * var(--rp-gutter));
  column-gap: calc(2 * var(--rp-gutter));
  column-fill: auto;
}
.rp--swipe .rp-title {
  font-size: 1.35rem;
}

/* The picture opened full screen. */
.rp-full {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  height: 100%;
  margin: 0;
}
.rp-full-img {
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  object-fit: contain;
}
.rp-full-legend {
  flex: none;
  margin: 0;
  font: 400 var(--ui-size-12) / 1.45 var(--font-mono);
  color: rgb(255 255 255 / 0.75);
}

/* On paper there is no sideways: the pictures, then the text in two
   columns as long as it needs (the width script set for the screen is
   overridden). */
@media print {
  .rp {
    display: block;
    height: auto;
  }
  .rp-figure {
    width: auto;
    height: auto;
    margin-bottom: 1rem;
  }
  .rp-picture-bar {
    display: none;
  }
  .rp-text {
    width: auto !important;
    height: auto;
    padding: 0;
    column-width: auto;
    column-count: 2;
  }
}
</style>
