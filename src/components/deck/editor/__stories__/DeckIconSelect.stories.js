/*
 * Deck/Editor/DeckIconSelect — the deck's icons as a radio group
 * (OPENBRAIN-129): each option shows the icon and its name; arrow keys,
 * Home and End move and choose.
 */
import { ref } from "vue";
import DeckIconSelect from "../DeckIconSelect.vue";

export default {
  title: "Deck/Editor/DeckIconSelect",
  component: DeckIconSelect,
  argTypes: {
    modelValue: { control: "text", description: "One of ICON_NAMES." },
    label: { control: "text" },
    id: { control: "text" },
  },
  args: { modelValue: "graduation", label: "Icon", id: "story-icon" },
  render: (args) => ({
    components: { DeckIconSelect },
    setup: () => ({ args, icon: ref(args.modelValue) }),
    template: `
      <div style="width: 420px; max-width: 100%">
        <DeckIconSelect v-model="icon" :label="args.label" :id="args.id" />
        <p style="margin: 12px 0 0; font: var(--ui-size-12) var(--font-mono); color: rgb(var(--color-mute))">Chosen: {{ icon }}</p>
      </div>`,
  }),
};

export const Default = {};
