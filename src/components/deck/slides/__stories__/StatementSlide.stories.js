/*
 * Deck/Slides/StatementSlide — Template T6, a single statement.
 * Args come from the deck data (src/data/decks/templates.js).
 */
import StatementSlide from "../StatementSlide.vue";
import { DECK_TEMPLATES } from "@/data/decks/templates.js";
import { propsOf, renderSlide } from "../../__stories__/slideFrame.js";

export default {
  title: "Deck/Slides/StatementSlide",
  component: StatementSlide,
  parameters: { layout: "padded" },
  render: renderSlide(StatementSlide),
};

export const Default = { args: propsOf(DECK_TEMPLATES, "t6-statement") };
