/*
 * Chapter/ReaderShell/ReaderHelp — what the "?" in the top bar opens
 * (OPENBRAIN-189): how the book reads, in three lines, and the animations
 * switch (Foundations/Settings/MotionSwitch). Signed in (`tools`), it opens
 * with Info, Notebook and Chat, the reader's panel tabs, which were three
 * words in the bar until 11 Nov (OPENBRAIN-197). ReaderTopBar places it
 * under the bar's right end, opens it, closes it and returns focus; see the
 * ReaderTopBar HelpOpen stories for it in place.
 */
import ReaderHelp from "../ReaderHelp.vue";

export default {
  title: "Chapter/ReaderShell/ReaderHelp",
  component: ReaderHelp,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  args: { tools: false, activeTool: null },
  argTypes: {
    tools: {
      control: "boolean",
      description: "Signed in: offer Info, Notebook and Chat.",
    },
    activeTool: {
      control: "select",
      options: [null, "info", "notebook", "chat"],
      description: "The tab the reader's panel is showing, marked in the list.",
    },
  },
  render: (args) => ({
    components: { ReaderHelp },
    setup: () => ({ args }),
    template: `<div style="max-width:23rem;"><ReaderHelp :tools="args.tools" :active-tool="args.activeTool" /></div>`,
  }),
};

/** Signed out: help and the animations setting. */
export const Default = {};

/** Signed in: Info, Notebook and Chat first. */
export const WithTools = { args: { tools: true } };

/** The Notebook is open in the reader's panel. */
export const ToolActive = { args: { tools: true, activeTool: "notebook" } };
