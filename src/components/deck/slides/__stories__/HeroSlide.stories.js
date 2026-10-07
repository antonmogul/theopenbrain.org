/*
 * Deck/Slides/HeroSlide — Dark slide with a full-height image: the deck's opening and closing.
 * Args come from the deck data (src/data/decks/funding.js).
 */
import HeroSlide from "../HeroSlide.vue";
import { FUNDING_DECK } from "@/data/decks/funding.js";
import { propsOf, renderSlide } from "../../__stories__/slideFrame.js";

export default {
  title: "Deck/Slides/HeroSlide",
  component: HeroSlide,
  parameters: { layout: "padded" },
  render: renderSlide(HeroSlide),
};

/** The opening slide, with the brand mark. */
export const Intro = { args: propsOf(FUNDING_DECK, "intro") };

/** The closing ask, with a contact. */
export const Closing = { args: propsOf(FUNDING_DECK, "finishing") };
