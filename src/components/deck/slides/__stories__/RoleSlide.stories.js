/*
 * Deck/Slides/RoleSlide — One role in depth (appendix A1–A3).
 * Args come from the deck data (src/data/decks/funding.js).
 */
import RoleSlide from "../RoleSlide.vue";
import { FUNDING_DECK } from "@/data/decks/funding.js";
import { propsOf, renderSlide } from "../../__stories__/slideFrame.js";

export default {
  title: "Deck/Slides/RoleSlide",
  component: RoleSlide,
  parameters: { layout: "padded" },
  render: renderSlide(RoleSlide),
};

/** A1, Creator. */
export const Creator = { args: propsOf(FUNDING_DECK, "appendix-creator") };

/** A2, Professor. */
export const Professor = { args: propsOf(FUNDING_DECK, "appendix-professor") };

/** A3, Student. */
export const Student = { args: propsOf(FUNDING_DECK, "appendix-student") };
