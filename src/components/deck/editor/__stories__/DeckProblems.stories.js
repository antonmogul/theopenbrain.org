/*
 * Deck/Editor/DeckProblems — every problem in a deck, by slide
 * (OPENBRAIN-129): validateDeck's output plus the preview's overflow
 * warning. Choosing one jumps to its field in the editor; "Renumber
 * eyebrows" appears when eyebrows are out of order. The dialog teleports to
 * <body>; the story keeps a button that reopens it.
 */
import { ref } from "vue";
import DeckProblems from "../DeckProblems.vue";
import { Button } from "@/components/dashboard/shared";
import {
  BROKEN_DECK,
  BROKEN_DECK_PROBLEMS,
  creatorParameters,
} from "@/stories/deckFixtures.js";

export default {
  title: "Deck/Editor/DeckProblems",
  component: DeckProblems,
  parameters: creatorParameters(),
  argTypes: {
    open: { control: "boolean" },
    problems: { control: false, description: "validateDeck output." },
    entries: { control: false },
  },
  args: { open: true },
  render: (args) => ({
    components: { DeckProblems, Button },
    setup: () => ({
      open: ref(args.open),
      last: ref(""),
      problems: BROKEN_DECK_PROBLEMS,
      entries: BROKEN_DECK,
    }),
    template: `
      <div>
        <Button size="sm" @click="open = true">Problems ({{ problems.length }})</Button>
        <p v-if="last" style="font: var(--ui-size-13) var(--font-ui)">{{ last }}</p>
        <DeckProblems
          :open="open"
          :problems="problems"
          :entries="entries"
          @jump="(j) => (last = 'Jump to ' + j.slideId + ' · ' + (j.path || 'slide'))"
          @renumber="last = 'Renumber eyebrows'"
          @close="open = false"
        />
      </div>`,
  }),
};

export const Default = {};
