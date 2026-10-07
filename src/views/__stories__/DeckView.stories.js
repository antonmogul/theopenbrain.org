/*
 * Views/Foundations/DeckView — every deck URL:
 *   /deck                    the pinned published deck (rpc/get_pinned_deck),
 *                            or the bundled funding deck when there is none
 *   /deck/templates          the slide templates (bundled)
 *   /deck/s/<token>          a published deck's funder link
 *   /dashboard/decks/<slug>/present   the creator's draft, with notes
 * Funding and Templates are the bundled decks, with no API or auth. The
 * others read the in-memory decks API in src/stories/deckFixtures.js.
 */
import ViewStoryShell from "@/stories/ViewStoryShell.vue";
import {
  DECK_ROWS,
  creatorParameters,
  decksApi,
} from "@/stories/deckFixtures.js";
import DeckView from "../DeckView.vue";

const mountProps = (path, props) => () => ({
  components: { DeckView, ViewStoryShell },
  setup: () => ({ path, props }),
  template: `<ViewStoryShell label="DeckView" :path="path"><DeckView v-bind="props" /></ViewStoryShell>`,
});
const mount = (path, deck) => mountProps(path, { deck });

export default {
  title: "Views/Foundations/DeckView",
  component: DeckView,
  parameters: { layout: "fullscreen" },
};

/** The funding deck at /deck. */
export const Funding = { render: mount("/deck", "funding") };

/** The slide templates at /deck/templates. */
export const Templates = { render: mount("/deck/templates", "templates") };

/**
 * /deck from the database: the published funding deck a creator pinned
 * there (data-deck-source="db"). Readers get no speaker notes and no Edit
 * link.
 */
export const FromDatabase = {
  render: mountProps("/deck", { source: "pinned", deck: "funding" }),
  parameters: { api: decksApi() },
};

/** A funder opening the share link of a published deck, signed out. */
export const Shared = {
  render: mountProps(`/deck/s/${DECK_ROWS[0].share_token}`, {
    source: "shared",
    token: DECK_ROWS[0].share_token,
  }),
  parameters: { api: decksApi() },
};

/** A rotated or unpublished link: "This link isn't available". */
export const LinkUnavailable = {
  render: mountProps("/deck/s/00000000000000000000000000000000", {
    source: "shared",
    token: "00000000000000000000000000000000",
  }),
  parameters: { api: decksApi() },
};

/**
 * Present draft: a creator presenting the working copy of the pitch draft,
 * notes (N) and an Edit link back to the editor included.
 */
export const Draft = {
  render: mountProps("/dashboard/decks/sfn-2026-pitch/present", {
    source: "draft",
    slug: "sfn-2026-pitch",
  }),
  parameters: creatorParameters(decksApi()),
};
