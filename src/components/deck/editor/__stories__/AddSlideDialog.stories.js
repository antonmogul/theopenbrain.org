/*
 * Deck/Editor/AddSlideDialog — the Add slide gallery (OPENBRAIN-129): a
 * blank slide per layout (Funding and Templates), the templates, and the
 * funding deck's slides, as thumbnails. Only the open tab's thumbnails are
 * drawn. The dialog teleports to <body>, so the story keeps a button that
 * reopens it.
 */
import { ref } from "vue";
import AddSlideDialog from "../AddSlideDialog.vue";
import { Button } from "@/components/dashboard/shared";
import { creatorParameters } from "@/stories/deckFixtures.js";

export default {
  title: "Deck/Editor/AddSlideDialog",
  component: AddSlideDialog,
  parameters: creatorParameters(),
  argTypes: { open: { control: "boolean" } },
  args: { open: true },
  render: (args) => ({
    components: { AddSlideDialog, Button },
    setup: () => ({ open: ref(args.open), picked: ref("") }),
    template: `
      <div>
        <Button size="sm" @click="open = true">Add slide</Button>
        <p v-if="picked" style="font: var(--ui-size-13) var(--font-ui)">Picked: {{ picked }}</p>
        <AddSlideDialog
          :open="open"
          @pick="(e) => { picked = e.label + ' (' + e.layout + ')'; open = false }"
          @close="open = false"
        />
      </div>`,
  }),
};

export const Open = {};
