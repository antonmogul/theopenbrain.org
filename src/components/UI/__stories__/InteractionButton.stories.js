/*
 * Legacy/InteractionButton — eye toggle that flips `active<Target>` in the
 * useGeneral store.
 *
 * `text === "open"` draws the open eye; anything else draws it closed. It is
 * white-on-dark by design, so the story sits on a dark panel.
 */
import InteractionButton from "../InteractionButton.vue";

export default {
  title: "Legacy/InteractionButton",
  component: InteractionButton,
  tags: ["autodocs"],
  argTypes: {
    target: {
      control: "text",
      description: "Store flag suffix: toggles `active<Target>`.",
    },
    text: { control: "inline-radio", options: ["open", "close"] },
    pos: { control: "text", description: "Accepted but unused." },
  },
  args: { target: "Menu", text: "open", pos: "" },
  render: (args) => ({
    components: { InteractionButton },
    setup: () => ({ args }),
    template: `
      <div style="padding:24px; background:#111; display:inline-block;">
        <InteractionButton v-bind="args" />
      </div>`,
  }),
};

export const Open = {};

export const Closed = { args: { text: "close" } };
