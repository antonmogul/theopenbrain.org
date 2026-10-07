/*
 * Deck/Slides/FiguresSlide — Template T8, three key figures.
 * Args come from the deck data (src/data/decks/templates.js).
 */
import FiguresSlide from "../FiguresSlide.vue";
import { DECK_TEMPLATES } from "@/data/decks/templates.js";
import { propsOf, renderSlide } from "../../__stories__/slideFrame.js";

export default {
  title: "Deck/Slides/FiguresSlide",
  component: FiguresSlide,
  parameters: { layout: "padded" },
  render: renderSlide(FiguresSlide),
};

export const Default = { args: propsOf(DECK_TEMPLATES, "t8-figures") };
