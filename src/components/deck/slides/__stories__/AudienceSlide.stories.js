/*
 * Deck/Slides/AudienceSlide — The four kinds of users, side by side.
 * Args come from the deck data (src/data/decks/funding.js).
 */
import AudienceSlide from "../AudienceSlide.vue";
import { FUNDING_DECK } from "@/data/decks/funding.js";
import { propsOf, renderSlide } from "../../__stories__/slideFrame.js";

export default {
  title: "Deck/Slides/AudienceSlide",
  component: AudienceSlide,
  parameters: { layout: "padded" },
  render: renderSlide(AudienceSlide),
};

/** Creator, Professor, Student and Public. */
export const Default = { args: propsOf(FUNDING_DECK, "users") };
