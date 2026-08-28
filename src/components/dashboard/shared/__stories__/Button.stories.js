/*
 * Button — pilot story for the Storybook migration.
 *
 * Demonstrates the thing /styleguide cannot do: every prop is an interactive
 * control, so a reviewer can dial through variant × size × state without
 * anyone hand-writing a specimen for each combination.
 */
import Button from "../Button.vue";

export default {
  title: "Foundations/Button",
  component: Button,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["solid", "ghost", "outline", "danger"],
      description: "Visual weight. `danger` is reserved for destructive acts.",
    },
    size: { control: "inline-radio", options: ["sm", "md", "lg"] },
    loading: {
      control: "boolean",
      description: "Swaps in a spinner and blocks clicks.",
    },
    disabled: { control: "boolean" },
    block: { control: "boolean", description: "Full-width." },
    as: {
      control: "inline-radio",
      options: ["button", "a", "router-link"],
      description:
        "Rendered element. `router-link` needs a router in context, so it is not exercised here.",
    },
    default: { control: "text", description: "Label (slot)." },
  },
  args: {
    variant: "solid",
    size: "md",
    loading: false,
    disabled: false,
    block: false,
    as: "button",
    default: "Save changes",
  },
  render: (args) => ({
    components: { Button },
    setup: () => ({ args }),
    template: `<Button v-bind="args">{{ args.default }}</Button>`,
  }),
};

export const Playground = {};

/** All four variants side by side — the at-a-glance comparison. */
export const Variants = {
  render: () => ({
    components: { Button },
    template: `
      <div style="display:flex; gap:12px; flex-wrap:wrap; align-items:center;">
        <Button variant="solid">Solid</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="danger">Danger</Button>
      </div>`,
  }),
};

export const Sizes = {
  render: () => ({
    components: { Button },
    template: `
      <div style="display:flex; gap:12px; align-items:center;">
        <Button size="sm">Small</Button>
        <Button size="md">Medium</Button>
        <Button size="lg">Large</Button>
      </div>`,
  }),
};

/**
 * Loading and disabled both suppress the click. Worth seeing together: they
 * look different but behave the same, which is easy to get wrong when
 * refactoring.
 */
export const States = {
  render: () => ({
    components: { Button },
    template: `
      <div style="display:flex; gap:12px; align-items:center;">
        <Button>Default</Button>
        <Button loading>Loading</Button>
        <Button disabled>Disabled</Button>
      </div>`,
  }),
};
