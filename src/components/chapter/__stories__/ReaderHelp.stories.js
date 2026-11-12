/*
 * Chapter/ReaderShell/ReaderHelp — what the "?" in the top bar opens
 * (OPENBRAIN-189): how the book reads, in three lines, and the animations
 * switch (Foundations/Settings/MotionSwitch). ReaderTopBar places it under
 * the bar's right end, opens it, closes it and returns focus; see the
 * ReaderTopBar HelpOpen stories for it in place.
 */
import ReaderHelp from "../ReaderHelp.vue";

export default {
  title: "Chapter/ReaderShell/ReaderHelp",
  component: ReaderHelp,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  render: () => ({
    components: { ReaderHelp },
    template: `<div style="max-width:23rem;"><ReaderHelp /></div>`,
  }),
};

export const Default = {};
