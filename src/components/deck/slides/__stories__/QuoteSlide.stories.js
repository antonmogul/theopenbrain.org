/*
 * Deck/Slides/QuoteSlide — Template T15, a quote over a full-bleed image.
 * Args come from the deck data (src/data/decks/templates.js).
 */
import QuoteSlide from "../QuoteSlide.vue";
import { DECK_TEMPLATES } from "@/data/decks/templates.js";
import { propsOf, renderSlide } from "../../__stories__/slideFrame.js";

export default {
  title: "Deck/Slides/QuoteSlide",
  component: QuoteSlide,
  parameters: { layout: "padded" },
  render: renderSlide(QuoteSlide),
};

/** Empty background placeholder. */
export const Default = { args: propsOf(DECK_TEMPLATES, "t15-quote-break") };
