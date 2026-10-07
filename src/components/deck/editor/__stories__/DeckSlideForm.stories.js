/*
 * Deck/Editor/DeckSlideForm — the form for the selected slide
 * (OPENBRAIN-129), generated from its layout's schema: label, layout,
 * hidden and notes, then one field per prop, then Advanced. The story
 * applies `update` and `change-layout` to a local entry and validates it, so
 * problems appear and clear as you type. The slide's preview sits beside it.
 */
import { computed, ref } from "vue";
import DeckSlideForm from "../DeckSlideForm.vue";
import SlidePreview from "../../SlidePreview.vue";
import { FUNDING_DECK } from "@/data/decks/funding.js";
import { DECK_TEMPLATES } from "@/data/decks/templates.js";
import { carryOver, validateSlide } from "@/data/decks/validate.js";
import { creatorParameters, setAtPath } from "@/stories/deckFixtures.js";

const harness = (source, position) => () => ({
  components: { DeckSlideForm, SlidePreview },
  setup() {
    const entry = ref(structuredClone(source));
    const problems = computed(() => validateSlide(entry.value, { position }));
    return {
      entry,
      problems,
      position,
      update: (path, value) =>
        (entry.value = setAtPath(entry.value, path, value)),
      changeLayout: (layout) =>
        (entry.value = carryOver(entry.value, layout).entry),
    };
  },
  template: `
    <div style="display: grid; grid-template-columns: minmax(0, 1fr) 420px; gap: 24px; align-items: start">
      <SlidePreview :entry="entry" :debounce="100" :label="'Preview of slide ' + position + ': ' + entry.label" />
      <DeckSlideForm
        :entry="entry"
        :problems="problems"
        :position="position"
        :total="9"
        deck-id="0b4f6d1e-5c2a-4c1e-9d3b-1a2b3c4d5e6f"
        @update="update"
        @change-layout="changeLayout"
      />
    </div>`,
});

const funding = (id) => FUNDING_DECK.find((e) => e.id === id);
const position = (id) => FUNDING_DECK.findIndex((e) => e.id === id) + 1;

export default {
  title: "Deck/Editor/DeckSlideForm",
  component: DeckSlideForm,
  parameters: { ...creatorParameters(), layout: "padded" },
  argTypes: {
    entry: { control: false },
    problems: { control: false },
    position: { control: false },
    total: { control: false },
    deckId: { control: false },
  },
};

/** The opening slide: brand mark, display title, image. */
export const Hero = { render: harness(funding("intro"), 1) };

/** A list of people with headshots and crops. */
export const Team = { render: harness(funding("team"), position("team")) };

/** Milestones, chapter counts and the summary helper. */
export const Trajectory = {
  render: harness(funding("trajectory"), position("trajectory")),
};

/** A template: two to four columns. */
export const Columns = {
  render: harness(
    DECK_TEMPLATES.find((e) => e.id === "t4-three-columns"),
    3
  ),
};
