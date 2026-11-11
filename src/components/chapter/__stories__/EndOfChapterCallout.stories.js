/*
 * Chapter/EndOfChapterCallout — the chapter's close (OPENBRAIN-179): where
 * the two-column reader ends and the chapter finishes across the full width,
 * on the dark surface it opened on. The chapter in short (its key
 * takeaways), one way to test yourself, and the next chapter leading out.
 *
 * It renders <router-link>, so it depends on the memory router installed in
 * .storybook/preview.js. The reader's stats and the next chapter are props
 * (ChapterView computes them); the chapter's quiz and flashcards are looked
 * up from `quizzes?` and `flashcards?`, which each story answers through
 * `parameters.api`.
 */
import EndOfChapterCallout from "../EndOfChapterCallout.vue";

const TAKEAWAYS = [
  "The history of neuroscience advances through debates where both sides were often partly right and partly wrong.",
  "Where the mind resides shifted over millennia between heart (cardiocentric) and brain (encephalocentric) views.",
  "Settled questions can reopen when new evidence emerges: progress is incremental and self-correcting.",
];

const cards = (n) => Array.from({ length: n }, (_, i) => ({ id: `card-${i}` }));
const QUIZ = {
  id: "quiz-foundations",
  title: "Foundations knowledge check",
  time_limit_minutes: 12,
  quiz_questions: [{ count: 10 }],
};

export default {
  title: "Chapter/EndOfChapterCallout",
  component: EndOfChapterCallout,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    // History today: 24 flashcards, no quiz.
    api: { "quizzes?": [], "flashcards?": cards(24) },
  },
  argTypes: {
    chapterNumber: { control: "text" },
    chapterTitle: { control: "text" },
    keyTakeaways: { control: "object" },
    isAuthenticated: {
      control: "boolean",
      description:
        "A signed-in reader sees their own numbers and goes straight to the quiz or the cards.",
    },
    highlightCount: { control: { type: "number", min: 0 } },
    noteCount: { control: { type: "number", min: 0 } },
    timeSpentSeconds: {
      control: { type: "number", min: 0 },
      description: "Seconds; shown as whole minutes, from one minute up.",
    },
    nextChapter: {
      control: "object",
      description:
        "{ number, slug, title, description?, cover?, ramp? }. null leads back to the book.",
    },
  },
  args: {
    chapterNumber: 1,
    chapterTitle: "Foundations of Neuroscience",
    moduleId: "module-foundations",
    keyTakeaways: TAKEAWAYS,
    isAuthenticated: false,
    highlightCount: 0,
    noteCount: 0,
    timeSpentSeconds: 0,
    nextChapter: {
      number: 2,
      slug: "the-retina",
      title: "The Retina",
      description:
        "An interactive exploration of retinal anatomy, photoreceptors, neural circuits, and visual processing.",
      cover: "/publicAssets/images/00-matisse-bg.jpg",
      ramp: "perc",
    },
  },
  render: (args) => ({
    components: { EndOfChapterCallout },
    setup: () => ({ args }),
    template: `<EndOfChapterCallout v-bind="args" />`,
  }),
};

export const Playground = {};

/**
 * A signed-in reader who annotated as they went: their own numbers under the
 * title, and the test opens directly.
 */
export const Completed = {
  args: {
    isAuthenticated: true,
    highlightCount: 14,
    noteCount: 3,
    timeSpentSeconds: 2820,
  },
};

/**
 * The common case: a signed-out reader. No stats (none are kept for them),
 * and the test says it signs them in.
 */
export const SignedOut = {};

/** A chapter with a published quiz leads with it, its cards beside it. */
export const WithQuiz = {
  args: { isAuthenticated: true },
  parameters: { api: { "quizzes?": [QUIZ], "flashcards?": cards(24) } },
};

/** Neither a quiz nor cards: no "Test your knowledge" at all. */
export const NothingToTest = {
  parameters: { api: { "quizzes?": [], "flashcards?": [] } },
};

/** The book's last chapter leads back to its contents. */
export const FinalChapter = {
  args: {
    chapterNumber: 3,
    chapterTitle: "Attention and Working Memory",
    nextChapter: null,
  },
};

/** No takeaways authored yet: the title block alone, no empty list. */
export const WithoutTakeaways = { args: { keyTakeaways: [] } };

/** The next chapter's colour is its own: Perception's teal on a violet chapter. */
export const AnotherChapter = {
  args: {
    chapterNumber: 2,
    chapterTitle: "The Retina",
    keyTakeaways: [
      "Photoreceptors convert light into electrical signals through phototransduction.",
      "Bipolar cells split the signal into ON and OFF pathways.",
    ],
    nextChapter: {
      number: 3,
      slug: "attention-and-working-memory",
      title: "Attention and Working Memory",
      description: "How the brain chooses what to process, and holds it.",
      cover: "/publicAssets/images/attention-matisse-reader.jpg",
      ramp: "lear",
    },
  },
  globals: { chapter: "perc" },
};
