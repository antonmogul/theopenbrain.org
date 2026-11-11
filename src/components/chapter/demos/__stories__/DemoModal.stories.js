/*
 * Chapter/Demos/DemoModal — the focus-trapping dialog that hosts the in-chapter
 * demos (quiz, flashcards, lab, cone explorer, embedded widgets). It teleports
 * to <body>; `wide` gives content that brings its own page layout the full
 * viewport. The body is a slot.
 */
import DemoModal from "../DemoModal.vue";
import { chapterFrame } from "../../__stories__/chapterFixtures";

export default {
  title: "Chapter/Demos/DemoModal",
  component: DemoModal,
  parameters: { layout: "fullscreen" },
  args: { show: true, title: "Cone spectral sensitivity", wide: false },
  argTypes: {
    show: { control: "boolean" },
    title: { control: "text" },
    wide: {
      control: "boolean",
      description: "Full-viewport panel for content with its own layout.",
    },
    ground: {
      control: "inline-radio",
      options: ["paper", "dark"],
      description:
        "The panel's ground. \"dark\" is the figure pane's dark surface, for a figure opened full screen from it: the panel carries .figure-pane--dark, the pane's own contract.",
    },
  },
  render: chapterFrame(DemoModal, {
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

export const Default = {};

/** The wide variant used for embedded widget views. */
export const Wide = {
  args: { wide: true, title: "RetINaBox — build a retinal circuit" },
};

/** On the figure pane's dark ground (OPENBRAIN-177): a figure opened full
 *  screen keeps the ground it was on. White close control with a white
 *  focus ring; the figure shell fills the heading through the `title` slot
 *  (see Chapter/Illustrations/IllustrationPlaceholder, On The Dark Pane). */
export const WideOnDark = {
  args: {
    wide: true,
    ground: "dark",
    title: "FIG G: Mary Rafferty's exposed brain",
  },
};

/** Not shown — nothing is teleported and body scrolling is untouched. */
export const Hidden = { args: { show: false } };
