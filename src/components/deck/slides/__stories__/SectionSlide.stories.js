/*
 * Deck/Slides/SectionSlide — Template T1, section divider.
 * Args come from the deck data (src/data/decks/templates.js).
 */
import SectionSlide from "../SectionSlide.vue";
import { DECK_TEMPLATES } from "@/data/decks/templates.js";
import { propsOf, renderSlide } from "../../__stories__/slideFrame.js";

export default {
  title: "Deck/Slides/SectionSlide",
  component: SectionSlide,
  parameters: { layout: "padded" },
  render: renderSlide(SectionSlide),
};

export const Default = { args: propsOf(DECK_TEMPLATES, "t1-section") };
