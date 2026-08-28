import FormField from "../FormField.vue";

export default {
  title: "Foundations/Forms/FormField",
  component: FormField,
  tags: ["autodocs"],
  args: {
    label: "Display name",
    hint: "Shown beside your notes and highlights.",
    error: "",
    required: false,
  },
  argTypes: {
    label: { control: "text" },
    hint: { control: "text" },
    error: { control: "text" },
    required: { control: "boolean" },
  },
  render: (args) => ({
    components: { FormField },
    setup: () => ({ args }),
    template: `
      <div style="max-width:420px;">
        <FormField v-bind="args">
          <input value="Ada Lovelace" />
        </FormField>
      </div>`,
  }),
};

export const Playground = {};

export const Required = { args: { required: true } };

export const ValidationError = {
  args: {
    required: true,
    hint: "",
    error: "Enter a display name.",
  },
};

export const Textarea = {
  args: {
    label: "About your research",
    hint: "A short introduction for collaborators.",
  },
  render: (args) => ({
    components: { FormField },
    setup: () => ({ args }),
    template: `
      <div style="max-width:420px;">
        <FormField v-bind="args">
          <textarea rows="4">I study how retinal circuits encode motion.</textarea>
        </FormField>
      </div>`,
  }),
};
