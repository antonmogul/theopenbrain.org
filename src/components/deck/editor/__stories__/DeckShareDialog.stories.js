/*
 * Deck/Editor/DeckShareDialog — a deck's funder link (OPENBRAIN-129):
 * copy it, open it as a funder sees it, show the deck at /deck, make a new
 * link or unpublish (both confirmed first). The story applies the events to
 * its own copy of the row. The dialog teleports to <body>; the story keeps a
 * button that reopens it.
 */
import { ref } from "vue";
import DeckShareDialog from "../DeckShareDialog.vue";
import { Button } from "@/components/dashboard/shared";
import { SHARE_ROWS, creatorParameters } from "@/stories/deckFixtures.js";

const render = (row) => (args) => ({
  components: { DeckShareDialog, Button },
  setup() {
    const deck = ref({ ...row });
    const open = ref(args.open);
    const last = ref("");
    return {
      args,
      deck,
      open,
      last,
      pin: (on) => {
        deck.value = { ...deck.value, pinned: on };
        last.value = on ? "Shown at /deck" : "Not shown at /deck";
      },
      rotate: () => {
        deck.value = {
          ...deck.value,
          share_token: "b0b1b2b3b4b5b6b7b8b9babbbcbdbebf",
        };
        last.value = "New link made";
      },
      unpublish: () => {
        deck.value = { ...deck.value, status: "draft", pinned: false };
        last.value = "Unpublished";
      },
    };
  },
  template: `
    <div>
      <Button size="sm" @click="open = true">Share</Button>
      <p v-if="last" style="font: var(--ui-size-13) var(--font-ui)">{{ last }}</p>
      <DeckShareDialog
        :open="open"
        :deck="deck"
        :busy="args.busy"
        :error="args.error"
        @pin="pin"
        @rotate="rotate"
        @unpublish="unpublish"
        @copy="last = 'Link copied'"
        @close="open = false"
      />
    </div>`,
});

export default {
  title: "Deck/Editor/DeckShareDialog",
  component: DeckShareDialog,
  parameters: creatorParameters(),
  argTypes: {
    open: { control: "boolean" },
    deck: { control: false, description: "The deck row." },
    busy: { control: "boolean" },
    error: { control: "text" },
  },
  args: { open: true, busy: false, error: "" },
};

/** Published, with changes since: funders see the published version. */
export const Published = { render: render(SHARE_ROWS.published) };

/** The deck this site's /deck shows. */
export const Pinned = { render: render(SHARE_ROWS.pinned) };

/** Not published yet: the link is off. */
export const Draft = { render: render(SHARE_ROWS.draft) };
