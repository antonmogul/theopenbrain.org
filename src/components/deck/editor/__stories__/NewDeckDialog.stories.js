/*
 * Deck/Editor/NewDeckDialog — make a deck (OPENBRAIN-129): title, link
 * name (follows the title until edited; checked against the slug rule,
 * reserved words and existing decks), kind, and what to start from. The
 * dialog teleports to <body>; the story keeps a button that reopens it.
 */
import { nextTick, onMounted, ref } from "vue";
import NewDeckDialog from "../NewDeckDialog.vue";
import { Button } from "@/components/dashboard/shared";
import { DECK_LIST_ROWS, creatorParameters } from "@/stories/deckFixtures.js";

const taken = DECK_LIST_ROWS.map((r) => r.slug);

const render = (typeTitle) => (args) => ({
  components: { NewDeckDialog, Button },
  setup() {
    const open = ref(args.open);
    const created = ref(null);
    // Type a title the way an author would, so the link name follows it.
    onMounted(async () => {
      if (!typeTitle) return;
      await nextTick();
      const input = document.getElementById("new-deck-title");
      if (!input) return;
      input.value = typeTitle;
      input.dispatchEvent(new Event("input"));
    });
    return { args, open, created };
  },
  template: `
    <div>
      <Button size="sm" @click="open = true">New deck</Button>
      <pre v-if="created" style="font: var(--ui-size-12) var(--font-mono)">{{ created }}</pre>
      <NewDeckDialog
        :open="open"
        :taken-slugs="args.takenSlugs"
        :busy="args.busy"
        :error="args.error"
        @create="(d) => { created = d; open = false }"
        @close="open = false"
      />
    </div>`,
});

export default {
  title: "Deck/Editor/NewDeckDialog",
  component: NewDeckDialog,
  parameters: creatorParameters(),
  argTypes: {
    open: { control: "boolean" },
    takenSlugs: { control: "object" },
    busy: { control: "boolean" },
    error: { control: "text" },
  },
  args: { open: true, takenSlugs: taken, busy: false, error: "" },
  render: render(""),
};

export const Open = {};

/** "Funding" makes the link name "funding", which a deck already has. */
export const SlugTaken = { render: render("Funding") };
