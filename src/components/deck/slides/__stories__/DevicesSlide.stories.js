/*
 * Deck/Slides/DevicesSlide — Template T14, browser, tablet and phone together.
 * Args come from the deck data (src/data/decks/templates.js).
 */
import DevicesSlide from "../DevicesSlide.vue";
import { DECK_TEMPLATES } from "@/data/decks/templates.js";
import { propsOf, renderSlide } from "../../__stories__/slideFrame.js";

export default {
  title: "Deck/Slides/DevicesSlide",
  component: DevicesSlide,
  parameters: { layout: "padded" },
  render: renderSlide(DevicesSlide),
};

export const Default = { args: propsOf(DECK_TEMPLATES, "t14-devices") };
