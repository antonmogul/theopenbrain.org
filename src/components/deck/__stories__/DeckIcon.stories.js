/*
 * Deck/DeckIcon — the dashboard's nav glyphs at slide sizes, plus the
 * deck-only globe and code icons.
 */
import DeckIcon from "../DeckIcon.vue";

const NAMES = [
  "notes",
  "graduation",
  "book",
  "globe",
  "image",
  "widget",
  "quiz",
  "chart",
  "layers",
  "share",
  "users",
  "clipboard",
  "highlight",
  "flashcard",
  "code",
];

export default {
  title: "Deck/DeckIcon",
  component: DeckIcon,
  argTypes: { name: { control: "select", options: NAMES } },
  args: { name: "globe", size: 96, strokeWidth: 1.4 },
  render: (args) => ({
    components: { DeckIcon },
    setup: () => ({ args }),
    template: `<DeckIcon v-bind="args" />`,
  }),
};

export const Playground = {};

/** Every icon the deck uses. */
export const AllIcons = {
  render: () => ({
    components: { DeckIcon },
    setup: () => ({ names: NAMES }),
    template: `
      <div style="display: flex; flex-wrap: wrap; gap: 24px">
        <figure v-for="n in names" :key="n" style="margin: 0; display: grid; justify-items: center; gap: 8px; font: 12px monospace">
          <DeckIcon :name="n" :size="52" />
          <figcaption>{{ n }}</figcaption>
        </figure>
      </div>`,
  }),
};
