<script setup>
/*
 * RailFigure — a picture on a breakout box's side-scrolling track
 * (OPENBRAIN-194; which figures are drawn this way is helper/railFigure.js).
 *
 * Just the images. Stuart, 14 Nov: "you can get rid of the 'legend' button
 * and legend in the side scrolling breakout boxes, and then can make the
 * images bigger", and of a figure with two photographs, "you see the
 * images, plus their thumbnails, plus the pause/array buttons, then the
 * figure legends. This is too much for just 2 photos." So a figure of one
 * to three stills is its images as plates, then its label and title (when
 * it has them) under them, and nothing else: no legend, no thumbnails, no
 * play/pause, no view-all. Every image has a button that opens it full
 * screen, and the legend is there (the book's ordinary viewer, in the
 * dialog). The legends stay in the document for screen readers.
 *
 * Two layouts, by the box's mode (BreakoutBox provides it as exploreRail):
 * - "track": the plates side by side, as tall as the track allows, the
 *   whole figure centred in the track's height, so a short image (the four
 *   humours' diagram) sits in the middle and not at the top. The track
 *   sizes the figure to its images (fitRailFigures, helper/exploreRail.js:
 *   --rp-figure-w, --rp-plates-h); until it has, the images fit the column
 *   the CSS gives them.
 * - "swipe" (a phone): every plate is a page as wide as the track, its
 *   image as large as the page allows, the label kept in view under them.
 *
 * The label's row is under the picture, where the figure pane has it
 * (Maura, 25 Nov, OPENBRAIN-83: "could we always place them at the bottom,
 * like we do on the regular half-and-half screen?"). A single image with a
 * label has its expand button on that row, where every figure in the book
 * has it; otherwise (an unlabelled picture, or one of several) the button
 * sits on the image's corner.
 */
import { computed, inject, ref, unref } from "vue";
import DemoModal from "@/components/chapter/demos/DemoModal.vue";
import FigureImages from "@/components/chapter/Illus/FigureImages.vue";
import { railFigureLabel } from "@/helper/railFigure";

const props = defineProps({
  /** "FIG E"; empty for a picture with no number. */
  label: { type: String, default: "" },
  /** The figure's title; empty for an Explore part's own picture. */
  title: { type: String, default: "" },
  /** [{ src, alt, caption }], one to three. */
  images: { type: Array, required: true },
  /** The figure's legend, for an image with none of its own. */
  caption: { type: String, default: "" },
  /** The dialog's name when the figure has neither label nor title. */
  name: { type: String, default: "" },
});

const boxRail = inject("exploreRail", null);
const mode = computed(() => unref(boxRail) || "track");

const hasBar = computed(() => !!(props.label || props.title));
/* One image under a label: the button is on the label's row. */
const barExpand = computed(() => hasBar.value && props.images.length === 1);
const figureName = computed(
  () =>
    [props.label, props.title].filter(Boolean).join(": ") ||
    props.name ||
    props.images[0]?.alt ||
    "Figure"
);
/* A plate that is a figure of its own ("FIG E", OPENBRAIN-202) is named
   on its picture; the figure then has no shared label row. */
const plateLabel = (image) => railFigureLabel(image);
const plateName = (image) =>
  [plateLabel(image), image?.title].filter(Boolean).join(": ");
const legendOf = (image) => image?.caption || props.caption || "";
const legends = computed(() => [
  ...new Set(props.images.map(legendOf).filter(Boolean)),
]);
const expandLabel = (i) =>
  props.images.length > 1
    ? `Expand image ${i + 1} of ${props.images.length} to full screen`
    : "Expand to full screen";

/* Each image's width / height, known once it has loaded: the plates are
   sized by it (the CSS here, and the track's fit). */
const ratios = ref({});
function onLoad(i, event) {
  const { naturalWidth: w, naturalHeight: h } = event.target || {};
  if (w > 0 && h > 0) ratios.value = { ...ratios.value, [i]: w / h };
}
const plateStyle = (i) =>
  ratios.value[i] ? { "--rf-ratio": String(ratios.value[i]) } : undefined;
/* The tallest image's ratio, once every image has loaded: on the phone's
   pages the row of plates is then as tall as that image and no taller, so
   the label sits under the picture and not at the page's foot. */
const tallest = computed(() => {
  const all = props.images.map((_, i) => ratios.value[i] || 0);
  return all.length && all.every((r) => r > 0) ? Math.min(...all) : 0;
});
const figureStyle = computed(() => ({
  "--rf-count": props.images.length,
  ...(tallest.value ? { "--rf-ratio-min": String(tallest.value) } : {}),
}));

/* Full screen: the book's viewer, on the image that was opened, on the
   ground the chapter's figure pane has (as the figure shell's dialog). */
const root = ref(null);
const shown = ref(false);
const index = ref(0);
const view = ref("single");
const ground = ref("dark");
function open(i) {
  const pane = root.value
    ?.closest?.(".chapter-reader")
    ?.querySelector?.(".figure-pane");
  ground.value = pane?.dataset?.ground === "paper" ? "paper" : "dark";
  index.value = i;
  view.value = "single";
  shown.value = true;
}
</script>

<template>
  <figure
    ref="root"
    class="rf"
    :class="[
      `rf--${mode}`,
      {
        'rf--set': images.length > 1,
        'rf--bare': !hasBar,
        'rf--sized': tallest > 0,
      },
    ]"
    :style="figureStyle"
    :data-rail-plates="images.length"
    :aria-label="figureName"
  >
    <div class="rf-plates">
      <div
        v-for="(image, i) in images"
        :key="image.src + i"
        class="rf-plate"
        data-rail-plate
        :style="plateStyle(i)"
      >
        <div class="rf-frame">
          <img
            class="rf-img"
            :src="image.src"
            :alt="image.alt || legendOf(image) || figureName"
            decoding="async"
            draggable="false"
            @load="onLoad(i, $event)"
          />
          <p
            v-if="plateLabel(image)"
            class="rf-plate-name"
            data-rail-plate-label
          >
            <span class="rf-label">{{ plateLabel(image) }}</span>
            <span v-if="image.title" class="rf-name">{{ image.title }}</span>
          </p>
          <button
            v-if="!barExpand"
            class="rf-expand rf-expand--on"
            type="button"
            title="Expand to full screen"
            :aria-label="
              plateName(image)
                ? `Expand ${plateName(image)} to full screen`
                : expandLabel(i)
            "
            @click="open(i)"
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
      </div>
    </div>
    <!-- The figure's name, under its picture as in the figure pane
         (OPENBRAIN-83). -->
    <footer v-if="hasBar" class="rf-bar" data-rail-figure-bar>
      <p class="rf-heading">
        <span v-if="label" class="rf-label">{{ label }}</span>
        <span v-if="title" class="rf-name">{{ title }}</span>
      </p>
      <button
        v-if="barExpand"
        class="rf-expand"
        type="button"
        title="Expand to full screen"
        :aria-label="expandLabel(0)"
        @click="open(0)"
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
    </footer>
    <!-- The legend is read with the figure; sighted readers find it in the
         full-screen view. -->
    <figcaption v-if="legends.length" class="sr-only">
      {{ legends.join(" ") }}
    </figcaption>
    <DemoModal
      :show="shown"
      :title="figureName"
      wide
      :ground="ground"
      @close="shown = false"
    >
      <template v-if="ground === 'dark' && hasBar" #title>
        <span v-if="label" class="rf-fs-label">{{ label }}</span>
        <span class="rf-fs-name">{{ title }}</span>
      </template>
      <div class="rf-full">
        <FigureImages
          v-model:index="index"
          v-model:view="view"
          :images="images"
          :caption="caption"
          :label="label"
          :title="title || name"
          large
        />
      </div>
    </DemoModal>
  </figure>
</template>

<style scoped>
.rf {
  display: flex;
  flex-direction: column;
  justify-content: center;
  box-sizing: border-box;
  height: 100%;
  min-width: 0;
  min-height: 0;
  margin: 0;
  color: var(--bx-ink, rgb(var(--color-ink)));
}
.rf-bar {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding-top: 0.75rem;
}
.rf-heading {
  display: flex;
  align-items: baseline;
  gap: 0.625rem;
  min-width: 0;
  margin: 0;
  font-family: var(--font-mono);
  line-height: 1.45;
  text-transform: uppercase;
}
.rf-label {
  flex: none;
  font-size: 0.65625rem;
  letter-spacing: 0.12em;
  color: var(--bx-fig-label, rgb(var(--color-mute)));
}
.rf-name {
  font-size: 0.71875rem;
  letter-spacing: 0.06em;
  text-wrap: balance;
}
.rf-expand {
  display: grid;
  flex: none;
  place-items: center;
  width: 44px;
  height: 44px;
  padding: 0;
  border: 1px solid var(--bx-hairline, rgb(var(--color-line)));
  border-radius: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
}
.rf-expand:hover {
  border-color: currentColor;
  background: var(--bx-wash, rgb(var(--color-ink) / 0.06));
}
/* Inside the button: the figure clips at its edge, where the button is. */
.rf-expand:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: -4px;
}
/* On the image's corner: its own dark chip, so it reads on any picture and
   on any box's ground. */
.rf-expand--on {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  margin: 0;
  border-color: rgb(255 255 255 / 0.45);
  background: rgb(20 20 20 / 0.72);
  color: #fff;
}
.rf-expand--on:hover {
  border-color: #fff;
  background: rgb(20 20 20 / 0.9);
}
.rf-expand--on:focus-visible {
  outline-color: #fff;
}
/* A plate's own figure name, on the picture's foot: its own dark chip like
   the expand button, so it reads on any picture. */
.rf-plate-name {
  position: absolute;
  left: 0.5rem;
  bottom: 0.5rem;
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  max-width: calc(100% - 1rem);
  margin: 0;
  padding: 0.375rem 0.625rem;
  font-family: var(--font-mono);
  line-height: 1.35;
  text-transform: uppercase;
  background: rgb(20 20 20 / 0.78);
  color: #fff;
}
.rf-plate-name .rf-label {
  color: rgb(var(--color-warn));
}

/* The plates: a row as tall as the figure has left over its label, a size
   container, so each image's frame can be exactly the image (as wide as its
   plate, or as wide as the row's height allows, whichever is less) and the
   corner button sits on the picture, not on a letterbox. */
.rf-plates {
  display: flex;
  flex: 1 1 0;
  align-items: center;
  justify-content: center;
  gap: var(--rf-gap, 1rem);
  min-height: 0;
  container-type: size;
}
/* Once the track has sized the figure to its images, the row is exactly
   their height and the figure (label and images together) is centred. */
.rf[data-rail-fitted] .rf-plates {
  flex: 0 0 var(--rp-plates-h);
}
.rf-plate {
  display: grid;
  flex: calc(var(--rf-ratio, 1) * 100) 1 0;
  /* One cell exactly the plate's size: the frame's percentages need a
     definite cell (WebKit sizes an auto one by the frame). */
  grid-template: minmax(0, 1fr) / minmax(0, 1fr);
  place-items: center;
  min-width: 0;
  height: 100%;
}
.rf-frame {
  position: relative;
  width: min(100%, calc(100cqh * var(--rf-ratio, 1)));
  max-height: 100%;
  aspect-ratio: var(--rf-ratio, 1);
}
.rf-img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

/* ── On the phone's swipe track: a page for every plate ─────────────────── */
.rf.rf--swipe {
  --rf-gutter: var(--reader-gutter-l, 1.25rem);
  width: calc(var(--rf-count, 1) * 100cqw);
}
/* Once the images' sizes are known the row is as tall as the tallest of
   them at the page's width, or as tall as the page has if that is less:
   the label is then right under the picture, and the two are centred on
   the page together (OPENBRAIN-83). Until then the row takes the page. */
.rf--swipe.rf--sized .rf-plates {
  flex: 0 1 calc((100cqw - 2 * var(--rf-gutter)) / var(--rf-ratio-min));
}
/* The label stays in view while the plates of a set go by. */
.rf--swipe .rf-bar {
  position: sticky;
  left: 0;
  box-sizing: border-box;
  width: 100cqw;
  padding-inline: var(--rf-gutter);
}
.rf--swipe .rf-plates {
  gap: 0;
}
.rf--swipe .rf-plate {
  box-sizing: border-box;
  flex: 1 1 0;
  padding-inline: var(--rf-gutter);
}

/* Full screen. */
.rf-full {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 1.25rem;
  box-sizing: border-box;
}
.rf-fs-label,
.rf-fs-name {
  font-family: var(--font-mono);
  font-weight: 600;
  line-height: 1.3;
  text-transform: uppercase;
}
.rf-fs-label {
  margin-right: 0.75rem;
  font-size: var(--ui-size-12);
  letter-spacing: 0.12em;
  color: rgb(var(--color-warn));
}
.rf-fs-name {
  font-size: var(--ui-size-13);
  letter-spacing: 0.06em;
}

@media print {
  .rf {
    height: auto;
    width: auto;
  }
  .rf-plates {
    container-type: normal;
    flex: none;
  }
  .rf-plate {
    height: auto;
  }
  .rf-frame {
    width: 100%;
    max-height: none;
  }
  .rf-expand {
    display: none;
  }
}
</style>
