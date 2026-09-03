/*
 * Foundations/BaseModal — teleported dialog with header/body/footer slots.
 *
 * The modal teleports to <body>, so the story keeps a trigger button in the
 * canvas: a closed modal would otherwise leave the story root empty.
 */
import BaseModal from "../BaseModal.vue";
import Button from "../Button.vue";

export default {
  title: "Foundations/BaseModal",
  component: BaseModal,
  tags: ["autodocs"],
  argTypes: {
    modelValue: { control: "boolean", description: "Open state (v-model)." },
    title: { control: "text" },
    size: {
      control: "inline-radio",
      options: ["sm", "md", "lg", "xl", "full"],
    },
    closeOnBackdrop: { control: "boolean" },
    closeOnEscape: { control: "boolean" },
    show: {
      control: false,
      description: "Deprecated alias for modelValue.",
    },
    default: { control: "text", description: "Body (default slot)." },
  },
  args: {
    modelValue: true,
    title: "Publish chapter",
    size: "md",
    closeOnBackdrop: true,
    closeOnEscape: true,
    default: "Publish “The Retina” to enrolled readers?",
  },
  render: (args) => ({
    components: { BaseModal, Button },
    setup: () => ({ args }),
    template: `
      <div style="min-height:200px; padding:24px;">
        <Button variant="outline" @click="args.modelValue = true">Open modal</Button>
        <BaseModal
          :model-value="args.modelValue"
          :title="args.title"
          :size="args.size"
          :close-on-backdrop="args.closeOnBackdrop"
          :close-on-escape="args.closeOnEscape"
          @update:modelValue="args.modelValue = $event"
        >
          <p>{{ args.default }}</p>
          <template #footer>
            <Button variant="ghost" size="sm" @click="args.modelValue = false">Cancel</Button>
            <Button size="sm" @click="args.modelValue = false">Publish</Button>
          </template>
        </BaseModal>
      </div>`,
  }),
};

export const Open = {};

/** Nothing but the trigger; click it to open. */
export const Closed = { args: { modelValue: false } };

export const Small = { args: { size: "sm" } };

/** Full-bleed variant used by the media detail view. */
export const FullWidth = {
  args: {
    size: "full",
    title: "Retinal layers",
    default: "Full-size previews use the whole viewport.",
  },
};

/** No title and no footer — header row and footer are both omitted. */
export const Bare = {
  args: { title: "" },
  render: (args) => ({
    components: { BaseModal, Button },
    setup: () => ({ args }),
    template: `
      <div style="min-height:200px; padding:24px;">
        <Button variant="outline" @click="args.modelValue = true">Open modal</Button>
        <BaseModal
          :model-value="args.modelValue"
          :size="args.size"
          @update:modelValue="args.modelValue = $event"
        >
          <p>{{ args.default }}</p>
        </BaseModal>
      </div>`,
  }),
};
