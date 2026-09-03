/*
 * Chapter/ReaderShell/InfoTab — the sidebar's chapter overview: reading
 * progress and time, section list, stats, and the reference list. No props:
 * everything is injected by ChapterView (readingProgress, highlights, notes,
 * references) or read from the text store, so the story-only controls feed
 * chapterFrame's provideReaderData.
 */
import InfoTab from "../InfoTab.vue";
import {
  highlights,
  notes,
  references,
  sidebarFrame,
} from "../../__stories__/chapterFixtures";

export default {
  title: "Chapter/ReaderShell/InfoTab",
  component: InfoTab,
  parameters: { layout: "padded" },
  args: {
    progress: 62,
    timeSpent: 1840,
    withAnnotations: true,
    withReferences: true,
  },
  argTypes: {
    progress: {
      control: { type: "range", min: 0, max: 100, step: 1 },
      description: "Story-only: injected readingProgress.progress (%).",
    },
    timeSpent: {
      control: { type: "number", min: 0 },
      description: "Story-only: injected readingProgress.timeSpent (seconds).",
    },
    withAnnotations: {
      control: "boolean",
      description: "Story-only: inject the highlight and note fixtures.",
    },
    withReferences: {
      control: "boolean",
      description: "Story-only: inject the reference fixtures.",
    },
  },
  render: sidebarFrame(InfoTab, {
    provideReaderData: true,
    readingProgress: (args) => ({
      progress: args.progress,
      timeSpent: args.timeSpent,
    }),
    highlights: (args) => (args.withAnnotations ? highlights : []),
    notes: (args) => (args.withAnnotations ? notes : []),
    references: (args) => (args.withReferences ? references : []),
    template: `<div style="width:min(420px,100%);height:640px;overflow:auto;border:1px solid rgb(var(--color-line));background:rgb(var(--color-paper));"><StoryComponent /></div>`,
  }),
};

/** Part-way through, with annotations and references. */
export const Default = {};

/** Just opened the chapter: nothing read, nothing marked. */
export const Unstarted = {
  args: { progress: 0, timeSpent: 0, withAnnotations: false },
};

/** A chapter without a bibliography — the references block must not render empty. */
export const NoReferences = { args: { withReferences: false } };
