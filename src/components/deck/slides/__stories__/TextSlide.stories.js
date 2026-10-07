/*
 * Deck/Slides/TextSlide — Template T2, text-heavy with a sidebar note.
 * Args come from the deck data (src/data/decks/templates.js).
 */
import TextSlide from "../TextSlide.vue";
import { DECK_TEMPLATES } from "@/data/decks/templates.js";
import { propsOf, renderSlide } from "../../__stories__/slideFrame.js";

export default {
  title: "Deck/Slides/TextSlide",
  component: TextSlide,
  parameters: { layout: "padded" },
  render: renderSlide(TextSlide),
};

export const Default = { args: propsOf(DECK_TEMPLATES, "t2-text") };
