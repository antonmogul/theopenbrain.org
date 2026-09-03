/*
 * Legacy/ActionButton — 2023 reader pill button with a hover help card.
 *
 * `help` is rendered with v-html into a fixed card while hovering; `pos` and
 * `clickF` are accepted but unused by the template.
 */
import ActionButton from "../ActionButton.vue";

export default {
  title: "Legacy/ActionButton",
  component: ActionButton,
  tags: ["autodocs"],
  argTypes: {
    text: { control: "text" },
    help: { control: "text", description: "HTML shown on hover." },
    pos: { control: "text", description: "Accepted but unused." },
    clickF: { control: false, description: "Legacy callback; unused." },
  },
  args: {
    text: "Export notes",
    help: "Download your private highlights and notes as a portable JSON file.",
    pos: "",
  },
  render: (args) => ({
    components: { ActionButton },
    setup: () => ({ args }),
    template: `<ActionButton :text="args.text" :help="args.help" :pos="args.pos" />`,
  }),
};

export const WithHelp = {};

export const Plain = { args: { text: "Import", help: "" } };
