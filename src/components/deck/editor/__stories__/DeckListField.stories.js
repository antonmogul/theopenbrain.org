/*
 * Deck/Editor/DeckListField — a list in a slide's form (OPENBRAIN-129):
 * item cards with Add, Duplicate, Remove and Move, bounded by what the
 * layout's grid can draw, and repeated names flagged. The item fields come
 * through the `item` slot; here, as in the form, one DeckField per key.
 */
import { computed, ref } from "vue";
import DeckListField from "../DeckListField.vue";
import DeckField from "../DeckField.vue";
import { LAYOUT_SCHEMAS } from "@/data/decks/fields.js";
import { FUNDING_DECK } from "@/data/decks/funding.js";
import { DECK_TEMPLATES } from "@/data/decks/templates.js";
import { validateSlide } from "@/data/decks/validate.js";
import { creatorParameters, setAtPath } from "@/stories/deckFixtures.js";

const harness = (source, key) => () => ({
  components: { DeckListField, DeckField },
  setup() {
    const entry = ref(structuredClone(source));
    const descriptor = LAYOUT_SCHEMAS[source.layout].fields[key];
    return {
      entry,
      key,
      descriptor,
      fields: Object.entries(descriptor.of || {}),
      problems: computed(() => validateSlide(entry.value, { position: 2 })),
      update: (path, value) =>
        (entry.value = setAtPath(entry.value, path, value)),
    };
  },
  template: `
    <div style="width: 420px; max-width: 100%">
      <DeckListField
        :descriptor="descriptor"
        :value="entry.props[key]"
        :path="'props.' + key"
        :slide-id="entry.id"
        :problems="problems"
        deck-id="0b4f6d1e-5c2a-4c1e-9d3b-1a2b3c4d5e6f"
        @update="update"
      >
        <template #item="{ item, path }">
          <DeckField
            v-for="[name, sub] in fields"
            :key="name"
            :descriptor="sub"
            :value="item[name]"
            :context="item"
            :path="path + '.' + name"
            :slide-id="entry.id"
            :problems="problems"
            deck-id="0b4f6d1e-5c2a-4c1e-9d3b-1a2b3c4d5e6f"
            @update="update"
          />
        </template>
      </DeckListField>
    </div>`,
});

const team = FUNDING_DECK.find((e) => e.id === "team");

export default {
  title: "Deck/Editor/DeckListField",
  component: DeckListField,
  parameters: creatorParameters(),
  argTypes: {
    descriptor: { control: false, description: "A list or strings field." },
    value: { control: false },
    path: { control: false },
    slideId: { control: false },
    problems: { control: false },
    deckId: { control: false },
  },
};

/** The team: five people, room for six. */
export const Default = { render: harness(team, "people") };

/** Four columns, the most the layout draws: Add is off, and says why. */
export const AtMax = {
  render: harness(
    DECK_TEMPLATES.find((e) => e.id === "t5-two-by-two"),
    "items"
  ),
};

/** Two people with the same name: the second is flagged. */
export const Duplicates = {
  render: harness(
    {
      ...team,
      props: {
        ...team.props,
        people: team.props.people.map((p, i) =>
          i === 4 ? { ...p, name: "Sonia" } : p
        ),
      },
    },
    "people"
  ),
};
