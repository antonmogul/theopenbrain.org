/*
 * Chapter/Text/RailFigure — a picture on a breakout box's side-scrolling
 * track (OPENBRAIN-194): its label and title, then just its images, each
 * with a button that opens it full screen, where the legend is. No legend,
 * thumbnails, play/pause or view-all on the track. The frame stands in for
 * BreakoutBox's track (a size container of a fixed height that provides the
 * mode) and fits the figure to its images as the track does
 * (fitRailFigures). In the reader, BreakoutBox's stories show the whole box.
 */
import { onMounted, provide, ref } from "vue";
import RailFigure from "../RailFigure.vue";
import { fitRailFigures } from "@/helper/exploreRail";

const IMG = "/publicAssets/images/foundations";

const frame = (mode, width) => (args) => ({
  components: { RailFigure },
  setup() {
    provide("exploreRail", ref(mode));
    const track = ref(null);
    const fit = () => fitRailFigures(track.value);
    onMounted(fit);
    return { args, track, fit, width, mode };
  },
  template: `
    <div data-chapter="fund" class="chapter-reader" style="background:rgb(var(--color-dark-surface));color:#fff;padding:32px 0;--bx-ink:#fff;--bx-ink-soft:rgb(255 255 255 / 0.7);--bx-hairline:rgb(255 255 255 / 0.22);--bx-fig-label:rgb(var(--color-warn));--bx-wash:rgb(255 255 255 / 0.08);">
      <div ref="track" data-rail-scroller :data-rail-mode="mode" @load.capture="fit"
        :style="{ width, maxWidth: '100%', height: '30rem', margin: '0 auto', overflowX: 'auto', overflowY: 'hidden', containerType: 'size' }">
        <div data-rail-part style="display:flex;gap:3rem;height:100%;width:max-content">
          <RailFigure v-bind="args" data-rail-figure
            :style="mode === 'track' ? { flex: 'none', width: 'var(--rp-figure-w, 20rem)', maxWidth: '44rem' } : undefined" />
        </div>
      </div>
    </div>`,
});

export default {
  title: "Chapter/Text/RailFigure",
  component: RailFigure,
  parameters: { layout: "fullscreen" },
  args: {
    label: "FIG F",
    title: "Freeman's transorbital lobotomy",
    images: [
      {
        src: `${IMG}/figf-01.jpg`,
        alt: "Walter Freeman performing a transorbital lobotomy while onlookers watch.",
        caption: "",
      },
    ],
    caption: "Walter Freeman performing a lobotomy. Source: public domain.",
  },
  render: frame("track", "1100px"),
};

/** One image under its label: the expand button on the label's row. */
export const Single = {};

/** A short, wide image: the figure is centred in the track's height. */
export const ShortImage = {
  args: {
    label: "FIG K",
    title: "The four humors",
    images: [
      {
        src: `${IMG}/figk-01.jpg`,
        alt: "A diamond diagram linking the four humors to the four elements and their qualities.",
        caption: "",
      },
    ],
    caption:
      "The link between the four humors and the four elements. Source: Stellmack and Stalikis, 1991.",
  },
};

/** A set of two (the doctor with an icepick): both images side by side,
 *  each with its own expand button; nothing else. */
export const TwoPlates = {
  args: {
    label: "FIG E",
    title: "Burckhardt's cortical excisions",
    caption:
      "Trepanation tools belonging to Gottlieb Burckhardt (left), and one of his patients (right) with two cortical resections. Source: Mueller, 1960.",
    images: [
      {
        src: `${IMG}/fige-01.jpg`,
        alt: "A case of trepanation tools.",
        caption: "",
      },
      {
        src: `${IMG}/fige-02.jpg`,
        alt: "A man in profile, photographed in an oval frame.",
        caption: "",
      },
    ],
  },
};

/** An Explore part's own picture: no label, the button on its corner. */
export const Unlabelled = {
  args: {
    label: "",
    title: "",
    name: "Hippocrates’ view on epilepsy",
    images: [
      {
        src: `${IMG}/narrative/hippocrates-bust.jpg`,
        alt: "Marble bust of Hippocrates in profile, from the British Museum.",
        caption:
          "Bust of Hippocrates from the British Museum. Source: The Wellcome Collection.",
      },
    ],
  },
};

/** On a phone's swipe track: a page for each image, the label kept in
 *  view above them. */
export const Swipe = {
  args: TwoPlates.args,
  render: frame("swipe", "390px"),
};
