/*
 * Deck/Slides/PhonesSlide — Template T11, three phone screens.
 * Args come from the deck data (src/data/decks/templates.js).
 */
import PhonesSlide from "../PhonesSlide.vue";
import { DECK_TEMPLATES } from "@/data/decks/templates.js";
import { propsOf, renderSlide } from "../../__stories__/slideFrame.js";

export default {
  title: "Deck/Slides/PhonesSlide",
  component: PhonesSlide,
  parameters: { layout: "padded" },
  render: renderSlide(PhonesSlide),
};

export const Default = { args: propsOf(DECK_TEMPLATES, "t11-phones") };
