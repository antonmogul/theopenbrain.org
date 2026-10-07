/*
 * Dashboard/Sections/Decks — slide decks in the creator dashboard
 * (OPENBRAIN-129). Each card shows the deck's first slide, its status, a
 * dot for changes funders don't see yet and whether it is the deck at
 * /deck. Backed by the in-memory decks API in src/stories/deckFixtures.js,
 * so New deck, Duplicate, Archive and Delete work as they would live.
 */
import DecksSection from "../DecksSection.vue";
import {
  creatorParameters,
  decksApi,
  decksApiError,
  decksApiLoading,
  decksApiMissingTable,
} from "@/stories/deckFixtures.js";

export default {
  title: "Dashboard/Sections/Decks",
  component: DecksSection,
  parameters: { layout: "padded" },
};

/**
 * The funding deck (published, shown at /deck, with unpublished changes)
 * and a pitch draft; an archived talk sits under Archived.
 */
export const Default = { parameters: creatorParameters(decksApi()) };

/** No decks yet: start a new one, or copy the funding deck. */
export const Empty = {
  parameters: creatorParameters(decksApi({ decks: [] })),
};

/** The list request never answers. */
export const Loading = { parameters: creatorParameters(decksApiLoading()) };

/** The list request fails (500): try again. */
export const LoadError = {
  name: "Error",
  parameters: creatorParameters(decksApiError()),
};

/**
 * The decks migration isn't pushed yet (404, PGRST205): the section asks
 * for `supabase db push` instead of offering a retry.
 */
export const MigrationMissing = {
  parameters: creatorParameters(decksApiMissingTable()),
};
