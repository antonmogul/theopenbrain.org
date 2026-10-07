/*
 * Deck/DeckStage — presents slides scaled to fit, with keyboard and tap
 * navigation, an overlay, speaker notes (N) and print-to-PDF.
 */
import { ref } from "vue";
import DeckStage from "../DeckStage.vue";
import { toSlides } from "../slides/layouts.js";
import { FUNDING_DECK } from "@/data/decks/funding.js";
import { DECK_TEMPLATES } from "@/data/decks/templates.js";

const mount =
  (entries, start = 0) =>
  () => ({
    components: { DeckStage },
    setup: () => ({ slides: toSlides(entries), index: ref(start) }),
    template: `<div style="height: 100vh"><DeckStage v-model="index" :slides="slides" title="Story deck" /></div>`,
  });

export default {
  title: "Deck/DeckStage",
  component: DeckStage,
  parameters: { layout: "fullscreen" },
};

/** The funding deck from its first slide. */
export const FundingDeck = { render: mount(FUNDING_DECK) };

/** Opened on the Users slide (slide 4). */
export const OnSlideFour = { render: mount(FUNDING_DECK, 3) };

/** The slide templates. */
export const Templates = { render: mount(DECK_TEMPLATES) };
