/*
 * Foundations/BaseCard — the surface every dashboard section is built on.
 *
 * Header and footer are slots, so the two named slots are shown alongside the
 * padding scale. `interactive` + `as="button"` is the clickable-card form used
 * by the media grid and course lists.
 */
import BaseCard from "../BaseCard.vue";

export default {
  title: "Foundations/BaseCard",
  component: BaseCard,
  tags: ["autodocs"],
  argTypes: {
    padding: {
      control: "inline-radio",
      options: ["none", "sm", "md", "lg"],
    },
    interactive: {
      control: "boolean",
      description: "Hover/focus affordance; pair with as='button'.",
    },
    as: {
      control: "inline-radio",
      options: ["div", "button", "article"],
      description: "Rendered element.",
    },
    header: { control: "text", description: "Header slot text." },
    footer: { control: "text", description: "Footer slot text." },
    default: { control: "text", description: "Body (default slot)." },
  },
  args: {
    padding: "md",
    interactive: false,
    as: "div",
    header: "Course workspace",
    footer: "Last edited 2 hours ago",
    default: "The Retina · 8 sections",
  },
  render: (args) => ({
    components: { BaseCard },
    setup: () => ({ args }),
    template: `
      <div style="max-width:680px;">
        <BaseCard :padding="args.padding" :interactive="args.interactive" :as="args.as">
          <template v-if="args.header" #header>{{ args.header }}</template>
          <p>{{ args.default }}</p>
          <template v-if="args.footer" #footer>{{ args.footer }}</template>
        </BaseCard>
      </div>`,
  }),
};

export const Playground = {};

/** Header + body + footer, the full anatomy. */
export const WithHeaderAndFooter = {};

/** Clickable card rendered as a real <button>. */
export const Interactive = {
  args: {
    interactive: true,
    as: "button",
    padding: "lg",
    header: "",
    footer: "",
    default: "Open Foundations of Neuroscience",
  },
};

/** Body only — no header or footer slot supplied. */
export const BodyOnly = { args: { header: "", footer: "" } };

export const Paddings = {
  render: () => ({
    components: { BaseCard },
    template: `
      <div style="display:grid; gap:16px; max-width:680px;">
        <BaseCard padding="none">padding="none"</BaseCard>
        <BaseCard padding="sm">padding="sm"</BaseCard>
        <BaseCard padding="md">padding="md"</BaseCard>
        <BaseCard padding="lg">padding="lg"</BaseCard>
      </div>`,
  }),
};
