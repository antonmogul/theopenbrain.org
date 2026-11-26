/*
 * Chapter/Text/BoxTitleCard — how a side-scrolling breakout box opens
 * (OPENBRAIN-77, Maura's scroll sketch of 23 Nov): the box's lead picture,
 * full bleed and darkened, with its title, the first sentence or two of
 * its text, "more" and Skip. In the reader BreakoutBox lays the pinned card
 * over the box and the page's scroll plays it; here the Progress control
 * stands in for the scroll (0: the box has just pinned; 1: the track has
 * taken over), and the picture flies to a stand-in for its place on the
 * track. BreakoutBox's stories show the whole box (in Storybook that is the
 * phone's still card: there is no stage layer to pin on).
 */
import { onMounted, ref, watch } from "vue";
import BoxTitleCard from "../BoxTitleCard.vue";

const IMG = "/publicAssets/images/foundations";
const GROUND =
  "--bx-bg:rgb(var(--color-dark-surface));background:rgb(var(--color-dark-surface));color:#fff;";

/* A pinned card over a stand-in box: a heading, and the picture's own
   place at the left, where the card's picture lands. */
const pinned = (args) => ({
  components: { BoxTitleCard },
  setup() {
    const card = ref(null);
    const target = ref(null);
    const play = () =>
      card.value?.drive({
        progress: args.progress ?? 0,
        near: true,
        target: target.value,
      });
    onMounted(play);
    watch(() => args.progress, play, { flush: "post" });
    return { args, card, target, play };
  },
  template: `
    <div data-chapter="fund" class="chapter-reader" style="position:relative;height:100vh;min-height:32rem;overflow:hidden;${GROUND}">
      <h2 style="margin:0;padding:2rem 3rem 1.5rem;text-align:center;font:500 1.75rem/1.25 var(--font-body)">{{ args.title }}</h2>
      <div style="display:flex;gap:3rem;padding:0 3rem;height:calc(100% - 11rem)">
        <div data-rail-plate style="flex:none;height:100%">
          <img ref="target" :src="args.picture.src" alt="" style="display:block;height:100%;width:auto" @load="play" />
        </div>
        <p style="max-width:24rem;margin:0;align-self:center;font:400 1rem/1.5 var(--font-body)">{{ args.excerpt }}</p>
      </div>
      <BoxTitleCard ref="card" v-bind="args" variant="pinned" :progress="null" />
    </div>`,
});

const still = (width) => (args) => ({
  components: { BoxTitleCard },
  setup: () => ({ args, width }),
  template: `
    <div data-chapter="fund" class="chapter-reader" style="${GROUND}">
      <div :style="{ width, maxWidth: '100%', margin: '0 auto' }">
        <BoxTitleCard v-bind="args" />
      </div>
    </div>`,
});

export default {
  title: "Chapter/Text/BoxTitleCard",
  component: BoxTitleCard,
  parameters: { layout: "fullscreen" },
  argTypes: {
    progress: { control: { type: "range", min: 0, max: 1, step: 0.01 } },
    variant: { control: false },
  },
  args: {
    title: "Hippocrates: the sacred disease and the four humours",
    excerpt:
      "“It is thus with regard to the disease called Sacred [epilepsy]: it appears to me to be nowise more divine nor more sacred than other diseases, but has a natural cause from the originates like other affections…",
    picture: {
      src: `${IMG}/narrative/hippocrates-bust.jpg`,
      alt: "Marble bust of Hippocrates in profile, from the British Museum.",
    },
    progress: 0,
  },
  render: pinned,
};

/** Arrived: the picture fills the box, darkened, under the words. */
export const Pinned = {};
const art = `${IMG}/boxes/hippocrates/`;
const layered = {
  picture: {
    src: `${art}original.webp`,
    alt: "Hippocrates refuses the gifts of Artaxerxes",
  },
  layers: [0.12, 0.4, 0.65, 1].map((depth, i) => ({
    src: `${art}layer${i + 1}.webp`,
    depth,
  })),
};
export const Parallax = { args: { ...layered, progress: 0.35 } };
export const ParallaxReducedMotion = {
  args: { ...layered, variant: "static", progress: null },
  render: still("100%"),
};

/** Half-way: the words have gone and the picture is on its way to its
 *  place on the track, which shows through the box's colour. */
export const PinnedOnItsWay = { args: { progress: 0.72 } };

/** The end of the card's scroll: out of the way, the track's own picture
 *  where the card's landed. */
export const PinnedDone = { args: { progress: 1 } };

/** Reduced motion: a still block before the box. No zoom, no fade. */
export const Static = {
  args: { variant: "static", progress: null },
  render: still("100%"),
};

/** A phone's swipe track: the picture, the title and Skip, above the
 *  pages. */
export const Phone = {
  args: {
    variant: "simple",
    progress: null,
    title: "Wilder Penfield and the Montreal Procedure",
    picture: {
      src: `${IMG}/narrative/penfield-operative-h.jpg`,
      alt: "Operative photograph of an exposed cortex with lettered paper markers.",
    },
  },
  render: still("390px"),
};
