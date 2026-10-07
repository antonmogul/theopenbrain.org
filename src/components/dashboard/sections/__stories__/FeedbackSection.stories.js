import FeedbackSection from "../FeedbackSection.vue";

const messages = [
  {
    id: "f1",
    chapterTitle: "The Retina",
    sectionTitle: "Photoreceptors",
    kind: "content",
    page: "/chapter/2/the-retina",
    created_at: "2026-10-04T14:15:00Z",
    message:
      "Could the diagram explain how rods and cones differ?\nThe labels were difficult to follow on my phone.",
  },
  {
    id: "f2",
    chapterTitle: "No chapter assigned",
    kind: "idea",
    created_at: "2026-10-03T11:00:00Z",
    message: "A glossary would be helpful.",
  },
];
export default {
  title: "Dashboard/Sections/FeedbackSection",
  component: FeedbackSection,
  tags: ["autodocs"],
  args: {
    feedbackLoading: false,
    feedbackError: null,
    feedbackAccessDenied: false,
    feedbackChapter: "all",
    feedbackKind: "all",
    feedbackChapters: [
      { id: "retina", title: "The Retina" },
      { id: "history", title: "Foundations of Neuroscience" },
    ],
    filteredFeedback: messages,
  },
  render: (args) => ({
    components: { FeedbackSection },
    setup: () => ({ args }),
    template:
      '<FeedbackSection v-bind="args" @chapter-change="args.feedbackChapter = $event" @kind-change="args.feedbackKind = $event" />',
  }),
};
export const Default = {};
export const Loading = { args: { feedbackLoading: true } };
export const Empty = { args: { filteredFeedback: [] } };
export const LoadError = {
  args: { feedbackError: "Feedback could not be loaded. Please try again." },
};
export const AccessDenied = { args: { feedbackAccessDenied: true } };
export const LongMessage = {
  args: {
    filteredFeedback: [
      {
        ...messages[0],
        message: "A long reader message that preserves its context. ".repeat(
          80
        ),
      },
    ],
  },
};
export const Mobile = {
  globals: { viewport: { value: "phone", isRotated: false } },
  args: { filteredFeedback: messages },
};
