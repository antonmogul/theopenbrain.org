import ConeExplorerPanelComponent from "../ConeExplorerPanel.vue";
import DemoModalComponent from "../DemoModal.vue";
import FlashcardPanelComponent from "../FlashcardPanel.vue";
import LabPanelComponent from "../LabPanel.vue";
import QuizPanelComponent from "../QuizPanel.vue";
import {
  chapterFrame,
  flashcards,
  lab,
  quiz,
} from "../../__stories__/chapterFixtures";

export default {
  title: "Chapter/Demos/ComponentCatalog",
  parameters: { layout: "fullscreen" },
};

const modalFrame = (Component) =>
  chapterFrame(Component, {
    template: `<div style="min-height:680px;padding:40px;background:rgb(var(--color-bg));"><StoryComponent v-bind="args" /></div>`,
  });

export const DemoModal = {
  args: { show: true, title: "Cone spectral sensitivity" },
  render: chapterFrame(DemoModalComponent, {
    template: `
      <div style="min-height:680px;">
        <StoryComponent v-bind="args">
          <div style="padding:24px;font:17px/1.6 var(--font-body);max-width:640px;">
            Compare the overlapping sensitivity curves of S, M, and L cones. The overlap—not three isolated colour channels—supports trichromatic coding.
          </div>
        </StoryComponent>
      </div>`,
  }),
};

export const ConeExplorerInteractive = {
  render: modalFrame(ConeExplorerPanelComponent),
};

export const QuizIntro = {
  args: { quizId: quiz.id },
  render: modalFrame(QuizPanelComponent),
  parameters: {
    auth: { role: "student" },
    api: { "quizzes?id=eq.retina-check": [quiz] },
  },
};

export const QuizError = {
  args: { quizId: "missing-quiz" },
  render: modalFrame(QuizPanelComponent),
  parameters: {
    auth: { role: "student" },
    api: {
      "quizzes?id=eq.missing-quiz": () => {
        throw new Error("Quiz unavailable in this preview");
      },
    },
  },
};

export const FlashcardsStudying = {
  args: { moduleId: "retina-module" },
  render: modalFrame(FlashcardPanelComponent),
  parameters: {
    auth: { role: "student" },
    api: {
      "flashcards?module_id=eq.retina-module": flashcards,
      flashcard_responses: [],
      flashcard_sessions: [{ id: "storybook-session" }],
    },
  },
};

export const FlashcardsEmpty = {
  args: { moduleId: "empty-module" },
  render: modalFrame(FlashcardPanelComponent),
  parameters: {
    auth: { role: "student" },
    api: {
      "flashcards?module_id=eq.empty-module": [],
      flashcard_sessions: [{ id: "empty-session" }],
    },
  },
};

export const LabReadyToRun = {
  args: { labId: lab.id },
  render: modalFrame(LabPanelComponent),
  parameters: {
    auth: { role: "student" },
    api: {
      "code_labs?id=eq.cone-response-lab": [lab],
      code_submissions: [],
    },
  },
};

export const LabError = {
  args: { labId: "missing-lab" },
  render: modalFrame(LabPanelComponent),
  parameters: { api: { "code_labs?id=eq.missing-lab": [] } },
};
