/*
 * Deck/Slides/ScreenSlide — Templates T9, T10, T12, T13: one screen in a device frame.
 * Args come from the deck data (src/data/decks/templates.js).
 */
import ScreenSlide from "../ScreenSlide.vue";
import { DECK_TEMPLATES } from "@/data/decks/templates.js";
import { propsOf, renderSlide } from "../../__stories__/slideFrame.js";

export default {
  title: "Deck/Slides/ScreenSlide",
  component: ScreenSlide,
  parameters: { layout: "padded" },
  render: renderSlide(ScreenSlide),
};

/** T9. */
export const WideBrowser = { args: propsOf(DECK_TEMPLATES, "t9-browser") };

/** T10. */
export const BrowserAndText = {
  args: propsOf(DECK_TEMPLATES, "t10-browser-text"),
};

/** T12. */
export const PhoneAndText = { args: propsOf(DECK_TEMPLATES, "t12-phone-text") };

/** T13. */
export const Tablet = { args: propsOf(DECK_TEMPLATES, "t13-tablet") };
