/*
 * Student/Quiz/Question — the legacy Chapter 1 quiz card.
 *
 * Pre-Supabase shape: `{ q, a, c }` is the prompt, its options and the index
 * of the correct option. The component positions itself absolutely inside the
 * reader, so the render gives it the relative stage the chapter provides.
 */
import { fn } from "storybook/test";
import Question from "../Question.vue";

const QUESTION = {
  q: "Which cell detects light",
  a: ["Rod", "Astrocyte", "Microglia"],
  c: 0,
};

export default {
  title: "Student/Quiz/Question",
  component: Question,
  tags: ["autodocs"],
  argTypes: {
    question: {
      control: "object",
      description: "Legacy record: `q` prompt, `a` options, `c` correct index.",
    },
    num: {
      control: { type: "number", min: 1 },
      description: "Question number; namespaces the radio inputs.",
    },
    onNext: { description: "Emitted once the correct option is picked." },
  },
  args: { question: QUESTION, num: 1, onNext: fn() },
  render: (args) => ({
    components: { Question },
    setup: () => ({ args }),
    template: `<div style="position:relative;min-height:420px;max-width:900px;"><Question v-bind="args" /></div>`,
  }),
};

export const Default = {};

/** Five options — the tallest card the legacy quiz produced. */
export const ManyOptions = {
  args: {
    num: 2,
    question: {
      q: "Which of these is a retinal interneuron",
      a: [
        "Bipolar cell",
        "Pyramidal cell",
        "Purkinje cell",
        "Motor neuron",
        "Betz cell",
      ],
      c: 0,
    },
  },
};
