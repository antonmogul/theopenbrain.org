/*
 * Chapter/Highlighting/HighlightColorPicker — the row of colour dots. In edit
 * mode the active colour gets a tick. Colours come from HIGHLIGHT_COLORS in
 * useHighlights (the single source of truth for the palette).
 */
import { HIGHLIGHT_COLORS } from "@/composables/useHighlights";
import HighlightColorPicker from "../HighlightColorPicker.vue";
import { chapterFrame } from "../../__stories__/chapterFixtures";

const COLOURS = HIGHLIGHT_COLORS.map((color) => color.value);

export default {
  title: "Chapter/Highlighting/HighlightColorPicker",
  component: HighlightColorPicker,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  args: { mode: "create", activeColor: null },
  argTypes: {
    mode: { control: "select", options: ["create", "edit"] },
    activeColor: {
      control: "select",
      options: [null, ...COLOURS],
      description: "Ticked in edit mode.",
    },
  },
  render: chapterFrame(HighlightColorPicker),
};

export const Default = {};

export const EditActiveBlue = { args: { mode: "edit", activeColor: "blue" } };
