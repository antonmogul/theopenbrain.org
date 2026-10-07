/*
 * Deck/DeckImage — an image filling its box, or a labelled placeholder
 * while there is no file yet.
 */
import DeckImage from "../DeckImage.vue";

export default {
  title: "Deck/DeckImage",
  component: DeckImage,
  args: {
    src: "/publicAssets/images/00-matisse-bg.jpg",
    alt: "Matisse, Marguerite with black cat",
    placeholder: "Image",
    position: "center",
  },
  render: (args) => ({
    components: { DeckImage },
    setup: () => ({ args }),
    template: `<div style="position: relative; width: 320px; height: 400px"><DeckImage v-bind="args" /></div>`,
  }),
};

export const WithImage = {};

/** No src: the placeholder a headshot shows until a photo is added. */
export const Placeholder = {
  args: { src: "", placeholder: "Stuart — headshot" },
};
