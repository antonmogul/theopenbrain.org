/*
 * Foundations/Brand/MenuEye — the eye on the reader's menu button
 * (OPENBRAIN-197): open on the top bar, closed on the drawer's close
 * button. Both drawings are the 2023 Retina chapter's own; one becomes the
 * other in a 180 ms blink, at once under reduced motion (the toolbar's
 * Motion control shows that).
 *
 * Not on the bar since OPENBRAIN-78 (24 Nov): the book's mark opens the
 * drawer there and a ✕ closes it. The eye is kept for whoever wants it.
 */
import MenuEye from "../MenuEye.vue";

export default {
  title: "Foundations/Brand/MenuEye",
  component: MenuEye,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  args: { closed: false },
  argTypes: {
    closed: {
      control: "boolean",
      description: "The menu is open: the eye is shut.",
    },
  },
  render: (args) => ({
    components: { MenuEye },
    setup: () => ({ args }),
    template: `
      <button type="button" :aria-label="args.closed ? 'Close chapter menu' : 'Open chapter menu'"
        style="display:grid; place-items:center; width:44px; height:44px; border:1px solid rgb(var(--color-line)); border-radius:var(--radius-control); background:transparent; color:rgb(var(--color-ink));">
        <MenuEye :closed="args.closed" />
      </button>`,
  }),
};

/** The menu button at rest. */
export const Open = {};

/** While the drawer is open. */
export const Closed = { args: { closed: true } };

/** Press it: the eye blinks shut and open, as it does with the drawer. */
export const Toggle = {
  render: () => ({
    components: { MenuEye },
    data: () => ({ closed: false }),
    template: `
      <button type="button" :aria-pressed="closed" aria-label="Chapter menu"
        style="display:grid; place-items:center; width:44px; height:44px; border:1px solid rgb(var(--color-line)); border-radius:var(--radius-control); background:transparent; color:rgb(var(--color-ink)); cursor:pointer;"
        @click="closed = !closed">
        <MenuEye :closed="closed" />
      </button>`,
  }),
};
