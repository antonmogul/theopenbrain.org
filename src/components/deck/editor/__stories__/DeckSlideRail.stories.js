/*
 * Deck/Editor/DeckSlideRail — the deck editor's slide rail (OPENBRAIN-129):
 * numbered thumbnails with labels, Hidden badges, notes dots and problem
 * counts. Click to select; Up/Down move the selection; Alt+Up/Down, drag or
 * the item menu reorder; Delete removes. The story applies each event to a
 * local copy of the deck, as the editor does through useDeckEditor.
 */
import { ref } from "vue";
import DeckSlideRail from "../DeckSlideRail.vue";
import { FUNDING_DECK } from "@/data/decks/funding.js";
import { cloneEntry } from "@/data/decks/validate.js";
import { GALLERY } from "@/data/decks/index.js";
import {
  BROKEN_DECK,
  BROKEN_DECK_PROBLEMS,
  creatorParameters,
  problemsBySlide,
} from "@/stories/deckFixtures.js";

const harness =
  (source, { problems = [], width = 240 } = {}) =>
  () => ({
    components: { DeckSlideRail },
    setup() {
      const entries = ref(structuredClone(source));
      const selectedId = ref(entries.value[1]?.id ?? null);
      const ids = () => entries.value.map((e) => e.id);
      const indexOf = (id) => entries.value.findIndex((e) => e.id === id);
      const moveTo = (id, to) => {
        const list = [...entries.value];
        const [entry] = list.splice(indexOf(id), 1);
        list.splice(to, 0, entry);
        entries.value = list;
      };
      const insertAfter = (afterId, entry) => {
        const list = [...entries.value];
        list.splice(indexOf(afterId) + 1, 0, entry);
        entries.value = list;
        selectedId.value = entry.id;
      };
      return {
        entries,
        selectedId,
        width,
        problemsById: problemsBySlide(problems),
        select: (id) => (selectedId.value = id),
        move: (id, delta) => moveTo(id, indexOf(id) + delta),
        moveTo,
        duplicate: (id) =>
          insertAfter(id, cloneEntry(entries.value[indexOf(id)], ids())),
        remove: (id) =>
          (entries.value = entries.value.filter((e) => e.id !== id)),
        toggleHidden: (id) =>
          (entries.value = entries.value.map((e) =>
            e.id === id ? { ...e, hidden: !e.hidden } : e
          )),
        // The editor opens AddSlideDialog; the story adds a blank section.
        add: (afterId) =>
          insertAfter(
            afterId,
            cloneEntry(
              GALLERY[0].entries.find((e) => e.layout === "section"),
              ids()
            )
          ),
      };
    },
    template: `
      <div :style="{ width: width + 'px', maxWidth: '100%' }">
        <DeckSlideRail
          :entries="entries"
          :selected-id="selectedId"
          :problems-by-id="problemsById"
          @select="select"
          @move="move"
          @move-to="moveTo"
          @duplicate="duplicate"
          @remove="remove"
          @toggle-hidden="toggleHidden"
          @add="add"
        />
      </div>`,
  });

export default {
  title: "Deck/Editor/DeckSlideRail",
  component: DeckSlideRail,
  parameters: creatorParameters(),
  argTypes: {
    entries: { control: false, description: "The deck's entries." },
    selectedId: { control: false },
    problemsById: {
      control: false,
      description: "{ [slideId]: { errors, warnings } } counts.",
    },
  },
};

/** The nine funding slides, the second selected. */
export const Default = { render: harness(FUNDING_DECK) };

/** Problem badges: errors on Team, warnings further down. */
export const WithProblems = {
  render: harness(BROKEN_DECK, { problems: BROKEN_DECK_PROBLEMS }),
};

/** A slide hidden when presenting: dimmed, with a Hidden badge. */
export const HiddenSlide = {
  render: harness(
    FUNDING_DECK.map((e) =>
      e.id === "textbook-today" ? { ...e, hidden: true } : e
    )
  ),
};

/** Given the full width (the 1024–1279px editor): a strip of thumbnails. */
export const Strip = { render: harness(FUNDING_DECK, { width: 960 }) };
