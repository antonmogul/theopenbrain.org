/*
 * Deck/Slides/TeamSlide — The team, one column per person. Headshots are placeholders until photos are added.
 * Args come from the deck data (src/data/decks/funding.js).
 */
import TeamSlide from "../TeamSlide.vue";
import { FUNDING_DECK } from "@/data/decks/funding.js";
import { propsOf, renderSlide } from "../../__stories__/slideFrame.js";

export default {
  title: "Deck/Slides/TeamSlide",
  component: TeamSlide,
  parameters: { layout: "padded" },
  render: renderSlide(TeamSlide),
};

/** Five people, no photos yet. */
export const Default = { args: propsOf(FUNDING_DECK, "team") };
