<script setup>
/*
 * RailPart — one part of a breakout box read sideways (OPENBRAIN-163, 187,
 * 194; the format is helper/exploreRail.js's, which cuts a box into parts).
 *
 * A part is its pictures first, then its text in columns as tall as the
 * track. Each picture shows once, at the start (Stuart, 12 Nov: "just show
 * the image … once, first, and then not at the end"): the paragraphs'
 * figures are drawn here, never again in the text (SectionComp leaves them
 * out of a rail's paragraphs). An Explore part's own picture
 * (content.explore.image) leads too, unless a figure already shows that
 * file (the rete mirabile's card image is Figure C's).
 *
 * A picture here is just the picture (Stuart, 14 Nov; OPENBRAIN-194): its
 * label and title, the image as large as the track allows, and a button
 * that opens it full screen, where its legend is. No legend and no Legend
 * control on the track; a figure of two or three images shows them all,
 * with no thumbnails, play/pause or view-all (RailFigure, for the figures
 * helper/railFigure.js can draw as plates). Anything else, a video or a
 * larger set, is still the figure shell's (IllustrationInline), with its
 * Legend control left out.
 *
 * Two layouts, by the box's mode (BreakoutBox provides it as exploreRail):
 * on the pinned "track" a picture is a column of its own beside the text,
 * and picture and text are each centred in the track's height; on the
 * phone's "swipe" track every picture and every column of text is a page
 * as wide as the track, and the track snaps from page to page.
 */
import { computed, inject, unref } from "vue";
import IllustrationInline from "@/components/chapter/Illus/IllustrationInline.vue";
import RailFigure from "./RailFigure.vue";
import { imageUrl } from "@/editor/media.mjs";
import { useFigureRecords } from "@/composables/useFigureSources";
import { figureImages } from "@/helper/figureCycle";
import { railFigureLabel, railPlatesOf } from "@/helper/railFigure";

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

/* Each figure as the track draws it: plates (RailFigure) for an image
   figure of up to three stills, else the figure shell. */
const records = useFigureRecords(() => props.figures);
const drawn = computed(() =>
  props.figures.map((id, i) => {
    const record = records.value[i] || null;
    const plates = railPlatesOf(record);
    return plates
      ? {
          id,
          plates,
          label: railFigureLabel(record),
          title: record.title || "",
          caption: record.caption || record.description || "",
        }
      : { id, plates: null };
  })
);
/* The Explore picture, unless one of the figures is that same file. */
const picture = computed(() => {
  const src = props.image?.src ? imageUrl(props.image.src) : "";
  if (!src) return null;
  const shown = records.value.some((record) =>
    figureImages(record).some((image) => imageUrl(image.src) === src)
  );
  return shown
    ? null
    : [{ src, alt: props.image.alt || "", caption: props.legend }];
});
const pictures = computed(() => props.figures.length + (picture.value ? 1 : 0));
/* Every image the part shows. Two or more want the room: the text beside
   them is then one column wide, not two. */
const plates = computed(
  () =>
    (picture.value ? 1 : 0) +
    drawn.value.reduce((sum, fig) => sum + (fig.plates?.length || 1), 0)
);

const titleId = computed(() => `rail-part-title-${props.part.id}`);
const label = computed(() =>
  props.part.title ? undefined : `Part ${props.index + 1} of ${props.count}`
);
</script>

<template>
  <!-- A div, not a <section>: the reader gives every section in
       .chapter-reader a full screen's height (index.css). -->
  <div
    class="rp"
    :class="[
      `rp--${mode}`,
      {
        'rp--explore': part.explore,
        'rp--no-picture': !pictures,
        'rp--pictures': plates > 1,
      },
    ]"
    :style="{ '--rail-figures': pictures }"
    data-rail-part
    :data-explore="part.explore ? part.id : undefined"
    role="group"
    :aria-labelledby="part.title ? titleId : undefined"
    :aria-label="label"
  >
    <RailFigure
      v-if="picture"
      class="rp-figure rp-picture"
      data-rail-figure
      :images="picture"
      :name="part.title"
    />
    <template v-for="fig in drawn" :key="fig.id">
      <RailFigure
        v-if="fig.plates"
        class="rp-figure"
        data-rail-figure
        :data-rail-figure-id="fig.id"
        :label="fig.label"
        :title="fig.title"
        :images="fig.plates"
        :caption="fig.caption"
      />
      <div
        v-else
        class="rp-figure rp-figure--shell"
        data-rail-figure
        :data-rail-figure-id="fig.id"
      >
        <IllustrationInline :animation-id="fig.id" />
      </div>
    </template>
    <div class="rp-text" data-rail-columns>
      <h3 v-if="part.title" :id="titleId" class="rp-title">
        {{ part.title }}
      </h3>
      <slot />
    </div>
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
   is some 33 characters wide), three on a very wide screen; one beside two
   or more images, which want the room (.rp--pictures). Lengths in cq* and
   the @container rules are the track's (a size container). */
.rp {
  --rail-fit: 1;
  /* A picture's column until the track has sized it to its image
     (fitRailFigures: --rp-figure-w), and a shell figure's always. */
  --rail-figure: clamp(15rem, 22cqw, 26rem);
  --rail-col-gap: 3rem;
  --rail-lead: 0px; /* a later part's divider and the room after it */
  /* The least a column of text beside a picture is left with: about 28
     characters of the box's text. */
  --rail-col-floor: 19rem;
  /* The most a picture may be wide: what the view has once --rail-fit
     columns of that least width are beside the part's pictures. */
  --rail-figure-max: clamp(
    15rem,
    calc(
      (
          var(--rail-view, 100cqw) - var(--rail-lead) - var(--rail-fit) *
            (var(--rail-col-floor) + var(--rail-col-gap)) + var(--rail-col-gap)
        ) /
        max(1, var(--rail-figures, 1)) - var(--rail-col-gap)
    ),
    52rem
  );
  /* The pictures and the gaps after them (none: minus the one gap). The
     track measures the real thing once the pictures are sized. */
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
  .rp:not(.rp--pictures) {
    --rail-fit: 2;
  }
}
@container (min-width: 2050px) {
  .rp:not(.rp--pictures) {
    --rail-fit: 3;
  }
}
.rp-figure {
  flex: none;
  width: var(--rp-figure-w, var(--rail-figure));
  max-width: var(--rail-figure-max);
  height: 100%;
  min-height: 0;
  margin: 0;
  /* clip, not hidden: a clipped box is not a scroll container, so the
     label of a set of plates can stay in view on the phone's track. */
  overflow: hidden;
  overflow: clip;
}
/* A labelled picture is never narrower than its label needs. */
.rp-figure:not(.rp-picture) {
  min-width: min(13rem, var(--rail-figure-max));
}

/* A figure the shell draws (a video, a larger set). Inline it normally
   bleeds to the phone's viewport and leaves room above and below it in the
   prose; here it is the part's column, centred in the track's height. Its
   images fit the track under the toolbar. */
.rp-figure--shell {
  display: flex;
  flex-direction: column;
  justify-content: center;
}
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
/* No Legend control on the track: the legend is in the full-screen view
   (Stuart, 14 Nov). It stays in the document, folded as the shell folds
   it, so a screen reader still reads it with the figure. */
.rp-figure :deep(.fig-legend-row) {
  padding: 0;
}
.rp-figure :deep(.fig-legend-row .fig-legend-btn) {
  display: none;
}
/* What gives in a shell figure taller than the track: a single image, or
   a gallery's stage box (its image fits inside it). Fitted by
   fitRailFigures (--rp-img-max); until then, a guess at the toolbar. The
   extra .rp outranks FigureImages' own flow rules whichever loads last. */
.rp .rp-figure :deep(.figimg-stage:not(.figimg-stage--gallery) .figimg-img) {
  width: 100%;
  max-height: var(--rp-img-max, calc(100cqh - 6rem));
  object-fit: contain;
  object-position: center;
}
.rp .rp-figure :deep(.figimg-stage--gallery) {
  max-height: var(--rp-img-max, calc(100cqh - 12rem));
}
/* A video on its own (a YouTube poster) sizes from its frame here: the
   flow stage has no height of its own to lay the player over. */
.rp .rp-figure :deep(.figimg-stage:not(.figimg-stage--gallery) .figimg-player) {
  position: relative;
  inset: auto;
  height: auto;
}

/* As wide as the columns the view fits, the text balanced across them (a
   short extract becomes two even columns, not one and a blank); a longer
   one fills them and carries on to the right. The track then makes the
   block as tall as its text (fitRailColumns), and it is centred here: the
   balanced columns are shorter than the track, and hung from its top they
   looked unfinished (Stuart, 14 Nov). */
.rp-text {
  flex: none;
  align-self: center;
  width: calc(
    var(--rail-fit) * (var(--rail-col) + var(--rail-col-gap)) -
      var(--rail-col-gap)
  );
  height: 100%;
  column-width: var(--rail-col);
  column-gap: var(--rail-col-gap);
  column-fill: balance;
  /* No column starts or ends on a paragraph's single line. */
  orphans: 2;
  widows: 2;
}
/* Text short enough for one column stays one column (fitRailColumns). */
.rp-text[data-rail-fill="auto"] {
  column-fill: auto;
}
/* A short paragraph is not broken over two columns (fitRailColumns). */
.rp-text :deep([data-rail-whole]) {
  break-inside: avoid;
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
   (BreakoutBox, one per page) fall on every one of them. A figure of
   plates is a page for each image (RailFigure sizes itself). */
.rp--swipe {
  --rp-gutter: var(--reader-gutter-l, 1.25rem);
  gap: 0;
}
.rp--swipe .rp-figure {
  min-width: 0;
  max-width: none;
}
.rp--swipe .rp-figure--shell {
  box-sizing: border-box;
  width: 100cqw;
  padding: 0 var(--rp-gutter);
}
/* The pages of text are the track's height less the room the track took
   to merge a part's stray last page (--rail-extra, BreakoutBox), plus this
   part's own share of it (--rp-extra): only a part with a remainder grows
   (fitRailColumns), so the others' pages break where they did. */
.rp--swipe .rp-text {
  box-sizing: content-box;
  align-self: flex-start;
  width: calc(100cqw - 2 * var(--rp-gutter));
  height: calc(100% - var(--rail-extra, 0px) + var(--rp-extra, 0px));
  padding: 0 var(--rp-gutter);
  column-width: calc(100cqw - 2 * var(--rp-gutter));
  column-gap: calc(2 * var(--rp-gutter));
  column-fill: auto;
}
.rp--swipe .rp-title {
  font-size: 1.35rem;
}

/* On paper there is no sideways: the pictures, then the text in two
   columns as long as it needs (the sizes script set for the screen are
   overridden). */
@media print {
  .rp {
    display: block;
    height: auto;
  }
  .rp-figure {
    width: auto !important;
    max-width: 24rem;
    height: auto;
    margin-bottom: 1rem;
  }
  .rp-text {
    width: auto !important;
    height: auto !important;
    padding: 0;
    column-width: auto;
    column-count: 2;
  }
}
</style>
