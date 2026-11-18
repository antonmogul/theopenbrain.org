/*
 * Chapter/Review/ReviewIdentity — who is writing, asked once per browser
 * (OPENBRAIN-204).
 */
import ReviewIdentity from "../ReviewIdentity.vue";

export default {
  title: "Chapter/Review/ReviewIdentity",
  component: ReviewIdentity,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  args: { initial: null },
  argTypes: { initial: { control: "object" }, onSave: { action: "save" } },
  render: (args) => ({
    components: { ReviewIdentity },
    setup: () => ({ args }),
    template: `<div style="max-width:380px;padding:12px;background:rgb(var(--color-paper));">
      <ReviewIdentity v-bind="args" />
    </div>`,
  }),
};

export const FirstTime = {};

export const ChangingName = {
  args: { initial: { name: "Maura", role: "designer" } },
};
