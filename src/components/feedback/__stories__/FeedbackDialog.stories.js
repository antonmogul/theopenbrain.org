/*
 * Student/FeedbackDialog — "Send feedback" (OPENBRAIN-101).
 *
 * Mounted once in App.vue and opened with useFeedback().openFeedback(ctx);
 * the story opens it on mount, about the chapter in `label`. Signed out, it
 * asks the reader to sign in.
 */
import { onMounted } from "vue";
import FeedbackDialog from "../FeedbackDialog.vue";
import { useFeedback } from "@/composables/useFeedback";

export default {
  title: "Student/FeedbackDialog",
  component: FeedbackDialog,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    auth: { authenticated: true, role: "student", name: "Maya Chen" },
  },
  argTypes: {
    label: {
      control: "text",
      description: "Story-only: where the feedback is from.",
    },
  },
  args: { label: "Chapter 1 · Foundations of Neuroscience" },
  render: (args) => ({
    components: { FeedbackDialog },
    setup() {
      const { openFeedback } = useFeedback();
      onMounted(() => openFeedback({ label: args.label }));
    },
    template: `<div style="min-height:640px;"><FeedbackDialog /></div>`,
  }),
};

/** Signed in, about a chapter. */
export const Default = {};

/** Signed out: asks the reader to sign in first. */
export const SignedOut = {
  parameters: { auth: { authenticated: false } },
};
