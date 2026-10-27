/*
 * Chapter/Opener/OpenerHero — the full-viewport cover with the down-arrow
 * and the utility row (OPENBRAIN-32). Static in Storybook: the scroll blur
 * only engages when the page scrolls.
 */
import OpenerHero from "../OpenerHero.vue";
import { reactiveCoverForModule } from "@/helper/chapterCover";

export default {
  title: "Chapter/Opener/OpenerHero",
  component: OpenerHero,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
  argTypes: {
    cover: { control: "text" },
    title: { control: "text" },
    reactive: { control: "object" },
  },
  args: {
    cover: "/publicAssets/images/00-matisse-bg.jpg",
    title: "The Retina",
  },
  render: (args) => ({
    components: { OpenerHero },
    setup: () => ({ args }),
    template: `<div data-chapter="perc"><OpenerHero v-bind="args" /></div>`,
  }),
};

export const Default = {};

export const AttentionCover = {
  args: {
    cover: "/publicAssets/images/attention-matisse-reader.jpg",
    title: "Attention and Working Memory",
  },
};

/* Sweep the pointer across the hero so the eye lands on a late frame. */
const sweep = async ({ canvasElement }) => {
  const hero = canvasElement.querySelector(".opener-hero");
  if (!hero) return;
  for (const t of [0.1, 0.5, 0.9]) {
    window.dispatchEvent(
      new PointerEvent("pointermove", {
        clientX: Math.round(window.innerWidth * t),
        clientY: Math.round(window.innerHeight / 2),
      })
    );
    await new Promise((r) => setTimeout(r, 120));
  }
};

/* The reactive cover (OPENBRAIN-146): the 2023 Retina eye over the still,
   scrubbed from pointer x. */
export const Reactive = {
  args: {
    cover: "/publicAssets/images/00-matisse-bg.jpg",
    title: "The Retina",
    reactive: reactiveCoverForModule({ slug: "the-retina" }),
  },
  play: sweep,
};

/* The History skull cutaway (OPENBRAIN-156): the record brings its own
   poster (the sketch), so the chapter cover passed here is not what shows.
   The sweep ends with the pointer at the right, so the crown is lifted. */
export const HistoryCutaway = {
  args: {
    cover: "/publicAssets/images/attention-matisse-reader.jpg",
    title: "Foundations of Neuroscience",
    reactive: reactiveCoverForModule({ slug: "foundations-of-neuroscience" }),
  },
  play: sweep,
};

/* A record whose Lottie isn't there: the still cover stands in, nothing is
   logged (lottieAssetOk HEAD-checks before lottie-web gets to fetch). */
export const ReactiveMissingFile = {
  args: {
    ...Reactive.args,
    reactive: {
      ...Reactive.args.reactive,
      lottie: "/publicAssets/animations/covers/not-there.json",
    },
  },
};
