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
  (entries, start = 0, editTo = "") =>
  () => ({
    components: { DeckStage },
    setup: () => ({ slides: toSlides(entries), index: ref(start), editTo }),
    template: `<div style="height: 100vh"><DeckStage v-model="index" :slides="slides" title="Story deck" :edit-to="editTo" /></div>`,
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

/**
 * What a signed-in creator sees (OPENBRAIN-129): an Edit link at the end of
 * the overlay, opening the deck's editor in a new tab.
 */
export const WithEditLink = {
  render: mount(FUNDING_DECK, 0, "/dashboard/decks/funding"),
};
