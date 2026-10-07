/*
 * Deck/Slides/TrajectorySlide — Timeline and chapter strip: how much of the book is funded.
 * Args come from the deck data (src/data/decks/funding.js).
 */
import TrajectorySlide from "../TrajectorySlide.vue";
import { FUNDING_DECK } from "@/data/decks/funding.js";
import { propsOf, renderSlide } from "../../__stories__/slideFrame.js";

export default {
  title: "Deck/Slides/TrajectorySlide",
  component: TrajectorySlide,
  parameters: { layout: "padded" },
  render: renderSlide(TrajectorySlide),
};

/** Twelve of 36 chapters funded. */
export const Default = { args: propsOf(FUNDING_DECK, "trajectory") };
