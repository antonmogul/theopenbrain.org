/*
 * Chapter/Demos/QuizPanel — a quiz inside a DemoModal: intro, taking,
 * results and review states. The quiz is loaded through the (mocked) API
 * client; `quizId` picks it.
 */
import QuizPanel from "../QuizPanel.vue";
import { modalFrame, quiz } from "../../__stories__/chapterFixtures";

export default {
  title: "Chapter/Demos/QuizPanel",
  component: QuizPanel,
  parameters: { layout: "fullscreen", auth: { role: "student" } },
  args: { quizId: quiz.id },
  argTypes: {
    quizId: { control: "text", description: "The quiz to load." },
  },
  render: modalFrame(QuizPanel),
};

/** The intro screen: title, description, passing score, time limit. */
export const Default = {
  parameters: { api: { "quizzes?id=eq.retina-check": [quiz] } },
};

/**
 * The quiz request fails. useQuizzes and QuizPanel both log it; the story
 * smoke expects those console errors by this story's id
 * (scripts/storybook-all-smoke.mjs).
 */
export const LoadError = {
  args: { quizId: "missing-quiz" },
  parameters: {
    api: {
      "quizzes?id=eq.missing-quiz": () => {
        throw new Error("Quiz unavailable in this preview");
      },
    },
  },
};

/** The quiz request never resolves — the loading state stays up. */
export const Loading = {
  args: { quizId: "loading-quiz" },
  parameters: {
    api: { "quizzes?id=eq.loading-quiz": () => new Promise(() => {}) },
  },
};
