/*
 * Chapter/Text/FootNotesWindow — the bottom sheet that slides up when a
 * reader clicks a footnote superscript. No props: it reads the notes from the
 * text store, toggles on useGeneral().superScriptActive, and listens to every
 * <sup> in the document. The story supplies one <sup> and clicks it in `play`.
 */
import FootNotesWindow from "../FootNotesWindow.vue";
import {
  chapterFrame,
  footNotes,
  retinaChapter,
} from "../../__stories__/chapterFixtures";

const clickSuperscript = async () => {
  document.querySelector("sup[data-sup]")?.click();
};

export default {
  title: "Chapter/Text/FootNotesWindow",
  component: FootNotesWindow,
  parameters: { layout: "fullscreen" },
  args: { openNotes: "1 2" },
  argTypes: {
    openNotes: {
      control: "text",
      description:
        "Story-only: the data-sup of the superscript the play function clicks — space-separated note numbers to reveal.",
    },
  },
  render: chapterFrame(FootNotesWindow, {
    chapter: { ...retinaChapter, footNotes },
    // Reset the toggle so a previous story cannot leave the sheet open.
    general: { superScriptActive: false },
    template: `<div style="min-height:620px;padding:48px;"><p>Foveal sampling is cone dominated<sup :data-sup="args.openNotes" style="cursor:pointer;color:rgb(var(--color-accent));">{{ args.openNotes.split(" ").join(",") }}</sup>.</p><StoryComponent /></div>`,
  }),
};

/** Both notes revealed. */
export const Default = { play: clickSuperscript };

/** A superscript that cites a single note. */
export const SecondNoteOnly = {
  args: { openNotes: "2" },
  play: clickSuperscript,
};

/** Nothing clicked yet — the sheet stays translated off-screen. */
export const Closed = { args: { openNotes: "1" } };
