<script setup>
/*
 * RailFigure — a picture on a breakout box's side-scrolling track
 * (OPENBRAIN-194; which figures are drawn this way is helper/railFigure.js).
 *
 * One to three still images as plates, without gallery thumbnails or
 * playback controls. Every plate has a row underneath with its figure
 * number, title, expand control and folded legend/credit details
 * (OPENBRAIN-88). Unnumbered Explore images use that same row.
 *
 * Two layouts, by the box's mode (BreakoutBox provides it as exploreRail):
 * - "track": the plates side by side, as tall as the track allows, the
 *   whole figure centred in the track's height, so a short image (the four
 *   humours' diagram) sits in the middle and not at the top. The track
 *   sizes the figure to its images (fitRailFigures, helper/exploreRail.js:
 *   --rp-figure-w, --rp-plates-h); until it has, the images fit the column
 *   the CSS gives them.
 * - "swipe" (a phone): every plate is a page as wide as the track, its
 *   image as large as the page allows, its own label underneath.
 *
 * The label's row is under the picture, where the figure pane has it
 * (Maura, 25 Nov, OPENBRAIN-83: "could we always place them at the bottom,
 * like we do on the regular half-and-half screen?"). Every plate has its own row, including unnumbered Explore pictures and
 * each page of a swipe set. The legend and its credit details open there.
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
  inline: { type: Boolean, default: false },
});

const boxRail = inject("exploreRail", null);
const mode = computed(() =>
  props.inline ? "flow" : unref(boxRail) || "track"
);

const hasBar = computed(() => !!(props.label || props.title));

const figureName = computed(
  () =>
    [props.label, props.title].filter(Boolean).join(": ") ||
    props.name ||
    props.images[0]?.alt ||
    "Figure"
);
/* Each plate may carry its own figure number (Descartes: D and E). */
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
        </div>
        <footer class="rf-bar" data-rail-figure-bar>
          <button
            class="rf-expand"
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
          <p
            class="rf-heading"
            :data-rail-plate-label="plateLabel(image) ? '' : undefined"
          >
            <span v-if="plateLabel(image) || label" class="rf-label">{{
              plateLabel(image) || label
            }}</span>
            <span class="rf-name">{{
              image.title || title || name || image.alt
            }}</span>
          </p>
          <details v-if="legendOf(image)" class="rf-details">
            <summary>Legend</summary>
            <p>{{ legendOf(image) }}</p>
          </details>
        </footer>
      </div>
    </div>
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
  flex: none;
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) auto;
  gap: 0.5rem;
  align-items: start;
  width: 100%;
  padding-top: 0.75rem;
}
.rf-heading {
  display: flex;
  align-items: baseline;
  gap: 0.625rem;
  min-width: 0;
  margin: 0;
  font-family: var(--font-mono);
  line-height: 1.3;
  text-transform: uppercase;
}
.rf-label {
  flex: none;
  font-size: var(--ui-size-11);
  letter-spacing: 0.12em;
  color: var(--bx-fig-label, rgb(var(--color-mute)));
}
.rf-name {
  font-size: var(--ui-size-12);
  letter-spacing: 0.06em;
}
.rf-expand {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  margin-top: -5px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--bx-fig-label, currentColor);
  cursor: pointer;
}
.rf-expand:hover {
  background: var(--bx-wash, rgb(var(--color-ink) / 0.06));
}
.rf-expand:focus-visible,
.rf-details summary:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: -2px;
}
.rf-details {
  display: contents;
  font: 400 var(--ui-size-11) / 1.4 var(--font-mono);
}
.rf-details summary {
  cursor: pointer;
  min-height: 28px;
}
.rf-details p {
  grid-column: 2 / -1;
  margin: 0;
  max-height: 12rem;
  overflow-y: auto;
}
.rf-plates {
  display: flex;
  flex: 1 1 0;
  align-items: center;
  justify-content: center;
  gap: var(--rf-gap, 1rem);
  min-height: 0;
  max-height: 100%;
}
/* The footer can grow after fitting (fonts or opening a credit). Let the
   image give up height immediately, before the next rail measurement. */
.rf[data-rail-fitted] .rf-plates {
  flex: 0 1 auto;
}
.rf-plate {
  display: flex;
  flex-direction: column;
  justify-content: center;
  flex: calc(var(--rf-ratio, 1) * 100) 1 0;
  min-width: 0;
  min-height: 0;
  max-height: 100%;
}
.rf-frame {
  width: 100%;
  min-height: 0;
  aspect-ratio: var(--rf-ratio, 1);
  max-height: var(--rp-plates-h, 100%);
}
.rf-img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.rf.rf--swipe {
  --rf-gutter: var(--reader-gutter-l, 1.25rem);
  width: calc(var(--rf-count, 1) * 100cqw);
}
.rf--swipe .rf-plates {
  gap: 0;
}
.rf--swipe .rf-plate {
  box-sizing: border-box;
  flex: 1 1 0;
  padding-inline: var(--rf-gutter);
}
.rf--flow {
  height: auto;
}
.rf--flow .rf-plates {
  flex: none;
}
.rf--flow .rf-bar {
  box-sizing: border-box;
  padding: 0.75rem;
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
