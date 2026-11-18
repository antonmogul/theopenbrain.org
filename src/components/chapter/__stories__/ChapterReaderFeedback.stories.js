import ChapterReaderFeedback from "../ChapterReaderFeedback.vue";
export default {
  title: "Chapter/ChapterReaderFeedback",
  component: ChapterReaderFeedback,
  tags: ["autodocs"],
  args: { moduleId: "module-foundations", isAuthenticated: true },
  parameters: { layout: "padded", api: { feedback: [] } },
  render: (args) => ({
    components: { ChapterReaderFeedback },
    setup: () => ({ args }),
    template:
      '<div style="container-type:inline-size;max-width:82.5rem"><ChapterReaderFeedback v-bind="args" /></div>',
  }),
};
export const SignedIn = {};
export const SignedOut = { args: { isAuthenticated: false } };

/** Submit a message to exercise the preserved draft and retry notice. */
export const SendFailure = {
  parameters: {
    api: {
      feedback: () => {
        throw new Error("Offline");
      },
    },
  },
};
