/*
 * Deck/Slides/ImageTextSlide — Template T7, headline beside a full-height image.
 * Args come from the deck data (src/data/decks/templates.js).
 */
import ImageTextSlide from "../ImageTextSlide.vue";
import { DECK_TEMPLATES } from "@/data/decks/templates.js";
import { propsOf, renderSlide } from "../../__stories__/slideFrame.js";

export default {
  title: "Deck/Slides/ImageTextSlide",
  component: ImageTextSlide,
  parameters: { layout: "padded" },
  render: renderSlide(ImageTextSlide),
};

/** Empty image placeholder. */
export const Default = { args: propsOf(DECK_TEMPLATES, "t7-image-text") };
