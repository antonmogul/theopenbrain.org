/*
 * Deck/Editor/DeckField — one field of a slide's form, drawn from its
 * descriptor in src/data/decks/fields.js (OPENBRAIN-129). Each story is one
 * kind of control; the story keeps the value, so the field can be used.
 * Every control's id is fieldId(slideId, path).
 */
import { computed, ref } from "vue";
import DeckField from "../DeckField.vue";
import { LAYOUT_SCHEMAS } from "@/data/decks/fields.js";
import { validateSlide } from "@/data/decks/validate.js";
import { creatorParameters, setAtPath } from "@/stories/deckFixtures.js";

/** A field of a real slide, so its problems come from validation. */
const harness = (layout, key, props) => () => ({
  components: { DeckField },
  setup() {
    const entry = ref({ id: "story", label: "Story", layout, props });
    return {
      entry,
      key,
      descriptor: LAYOUT_SCHEMAS[layout].fields[key],
      problems: computed(() => validateSlide(entry.value, { position: 1 })),
      update: (path, value) =>
        (entry.value = setAtPath(entry.value, path, value)),
    };
  },
  template: `
    <div style="width: 420px; max-width: 100%">
      <DeckField
        :descriptor="descriptor"
        :value="entry.props[key]"
        :context="entry.props"
        :path="'props.' + key"
        slide-id="story"
        :problems="problems"
        deck-id="0b4f6d1e-5c2a-4c1e-9d3b-1a2b3c4d5e6f"
        @update="update"
      />
    </div>`,
});

export default {
  title: "Deck/Editor/DeckField",
  component: DeckField,
  parameters: creatorParameters(),
  argTypes: {
    descriptor: { control: false, description: "From LAYOUT_SCHEMAS." },
    value: { control: false },
    context: { control: false },
    path: { control: false },
    slideId: { control: false },
    problems: { control: false },
    deckId: { control: false },
  },
};

/** Text with a character count; this title is over its 48. */
export const Text = {
  render: harness("hero", "title", {
    title: "The Open Brain, a free neuroscience textbook for all",
    size: "large",
  }),
};

/** A short enum as segments. */
export const Enum = {
  render: harness("hero", "size", { title: "The Open Brain", size: "display" }),
};

/** An optional group: switch it off and it stores null. */
export const Optional = {
  render: harness("hero", "person", {
    title: "Finishing the Book",
    person: { name: "Stuart Trenholm", role: "Founder and co-lead editor" },
  }),
};

/** The icon grid, a radio group: arrow keys move and choose. */
export const Icon = {
  render: harness("role", "icon", {
    role: "creator",
    icon: "notes",
    name: "Creator",
    features: [],
  }),
};

/** The four role colours, each named, never colour alone. */
export const RoleColor = {
  render: harness("role", "role", {
    role: "professor",
    icon: "graduation",
    name: "Professor",
    features: [],
  }),
};
