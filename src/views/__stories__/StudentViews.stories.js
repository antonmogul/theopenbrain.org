import ViewStoryShell from "@/stories/ViewStoryShell.vue";
import BreakView from "../BreakView.vue";
import ChapterOverviewView from "../ChapterOverviewView.vue";
import ChapterView from "../ChapterView.vue";
import ChaptersView from "../ChaptersView.vue";
import EnrollView from "../EnrollView.vue";
import FlashcardView from "../FlashcardView.vue";
import LabView from "../LabView.vue";
import QuizView from "../QuizView.vue";
import StudentDashboardView from "../StudentDashboardView.vue";
import { apiFixtures } from "@/stories/openBrainFixtures";

const viewStory = (View, label, path) => ({
  render: () => ({
    components: { View, ViewStoryShell },
    data: () => ({ label, path }),
    template:
      '<ViewStoryShell :label="label" :path="path"><View /></ViewStoryShell>',
  }),
});

export default {
  title: "Student/Full-page Views",
  parameters: {
    auth: { authenticated: true, role: "student" },
    api: apiFixtures,
    layout: "fullscreen",
  },
};

export const ChapterLibrary = viewStory(
  ChaptersView,
  "ChaptersView",
  "/chapters"
);
export const ChapterOverview = viewStory(
  ChapterOverviewView,
  "ChapterOverviewView",
  "/chapter/3"
);
export const ChapterReader = viewStory(
  ChapterView,
  "ChapterView",
  "/chapter/3/foundations-of-neuroscience"
);
export const ChapterBreak = viewStory(
  BreakView,
  "BreakView",
  "/chapter/break/introduction"
);
export const Enrollment = viewStory(
  EnrollView,
  "EnrollView",
  "/enroll/course-neuro-101"
);
export const FlashcardSession = viewStory(
  FlashcardView,
  "FlashcardView",
  "/flashcards/module-foundations"
);
export const CodeLab = viewStory(LabView, "LabView", "/lab/lab-neuron");
export const QuizAttempt = viewStory(
  QuizView,
  "QuizView",
  "/quiz/quiz-foundations"
);
export const StudentDashboard = viewStory(
  StudentDashboardView,
  "StudentDashboardView",
  "/student"
);
