/*
 * Deck/Slides/VideoSlide — The feature walkthrough video. With no recording it shows a placeholder.
 * Args come from the deck data (src/data/decks/funding.js).
 */
import VideoSlide from "../VideoSlide.vue";
import { FUNDING_DECK } from "@/data/decks/funding.js";
import { propsOf, renderSlide } from "../../__stories__/slideFrame.js";

export default {
  title: "Deck/Slides/VideoSlide",
  component: VideoSlide,
  parameters: { layout: "padded" },
  render: renderSlide(VideoSlide),
};

/** No recording yet: the placeholder. */
export const Default = { args: propsOf(FUNDING_DECK, "textbook-today") };
