/*
 * Deck/Slides/ColumnsSlide — Templates T3–T5: two, three or four (two by two) ruled columns.
 * Args come from the deck data (src/data/decks/templates.js).
 */
import ColumnsSlide from "../ColumnsSlide.vue";
import { DECK_TEMPLATES } from "@/data/decks/templates.js";
import { propsOf, renderSlide } from "../../__stories__/slideFrame.js";

export default {
  title: "Deck/Slides/ColumnsSlide",
  component: ColumnsSlide,
  parameters: { layout: "padded" },
  render: renderSlide(ColumnsSlide),
};

/** T3. */
export const TwoColumns = { args: propsOf(DECK_TEMPLATES, "t3-two-columns") };

/** T4. */
export const ThreeColumns = {
  args: propsOf(DECK_TEMPLATES, "t4-three-columns"),
};

/** T5. */
export const TwoByTwo = { args: propsOf(DECK_TEMPLATES, "t5-two-by-two") };
