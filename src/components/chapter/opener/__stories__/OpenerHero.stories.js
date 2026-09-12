/*
 * Chapter/Opener/OpenerHero — the full-viewport cover with the down-arrow
 * and the utility row (OPENBRAIN-32). Static in Storybook: the scroll blur
 * only engages when the page scrolls.
 */
import OpenerHero from "../OpenerHero.vue";

export default {
  title: "Chapter/Opener/OpenerHero",
  component: OpenerHero,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
  argTypes: {
    cover: { control: "text" },
    title: { control: "text" },
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
