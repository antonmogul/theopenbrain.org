import StudyPartnerPanel from "../StudyPartnerPanel.vue";
const source = {
  id: "p1",
  section: "photoreceptors",
  title: "Photoreceptors",
  chapter: "the-retina",
  number: 2,
};
const greeting = {
  role: "assistant",
  text: "Hey Alex! I see you’ve visited Photoreceptors and left a highlight. Shall we give those ideas a little workout?",
  tools: [
    {
      name: "suggest_actions",
      input: {
        actions: ["Test me", "Go deeper", "Prep for an exam", "Just chat"],
      },
    },
  ],
};
export default {
  title: "Student/AI/Study partner",
  component: StudyPartnerPanel,
  args: { signedIn: true, messages: [greeting] },
  decorators: [
    () => ({
      template:
        '<div style="height:620px;max-width:380px;margin:auto;border:1px solid rgb(var(--color-line))"><story /></div>',
    }),
  ],
};
export const Opening = {};
export const NoReading = {
  args: {
    messages: [
      {
        ...greeting,
        text: "Hey! No reading on the board yet — a perfectly good place to begin. Shall we start with History?",
      },
    ],
  },
};
export const SignedOut = { args: { signedIn: false, messages: [] } };
export const Empty = { args: { messages: [] } };
export const Thinking = {
  args: {
    messages: [greeting, { role: "user", text: "What do photoreceptors do?" }],
    busy: true,
  },
};
export const Error = {
  args: {
    error:
      "I could not reach the book. Your question is still here; please try again.",
  },
};
export const Answer = {
  args: {
    messages: [
      {
        role: "assistant",
        text: "Photoreceptors convert light into electrical signals. [¶p1]",
        citations: [source],
      },
    ],
  },
};
export const Flashcards = {
  args: {
    messages: [
      {
        role: "assistant",
        text: "A few cards from your reading. Ready when you are.",
        citations: [source],
        tools: [
          {
            name: "show_flashcards",
            input: {
              cards: Array.from({ length: 5 }, () => ({
                front: "What do photoreceptors convert?",
                back: "Light into electrical signals.",
                sourceParagraphId: "p1",
              })),
            },
          },
        ],
      },
    ],
  },
};
export const Quiz = {
  args: {
    messages: [
      {
        role: "assistant",
        text: "Choose an answer; we’ll unpack it together.",
        citations: [source],
        tools: [
          {
            name: "show_quiz",
            input: {
              questions: Array.from({ length: 5 }, () => ({
                question: "What do photoreceptors convert?",
                options: ["Light", "Sound", "Heat", "Pressure"],
                correctIndex: 0,
                explanation:
                  "The chapter describes conversion of light into electrical signals.",
                sourceParagraphId: "p1",
              })),
            },
          },
        ],
      },
    ],
  },
};
export const History = {
  args: {
    conversations: [
      { id: "c1", title: "Study partner · Revisiting the Retina" },
    ],
  },
};
export const Refusal = {
  args: {
    messages: [
      {
        role: "assistant",
        text: "Sounds like you need a travel advisor; I’m your book-bound learning assistant. Shall we return to the Retina?",
      },
    ],
  },
};
