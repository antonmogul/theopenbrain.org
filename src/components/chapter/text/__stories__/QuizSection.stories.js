/*
 * Chapter/Text/QuizSection — the "test yourself" call-to-action block at the
 * end of a chapter. No props; it is a <RouterLink> and depends on the memory
 * router installed in .storybook/preview.js.
 */
import QuizSection from "../QuizSection.vue";
import { proseFrame } from "../../__stories__/chapterFixtures";

export default {
  title: "Chapter/Text/QuizSection",
  component: QuizSection,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
  render: proseFrame(QuizSection),
};

export const Default = {};
