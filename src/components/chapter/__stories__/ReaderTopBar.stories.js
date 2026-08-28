import { useGeneral } from "@/stores";
import { useReaderSidebar } from "@/composables/useReaderSidebar";
import ReaderTopBar from "../ReaderTopBar.vue";

const SECTIONS = [
  { slug: "introduction", title: "Introduction" },
  { slug: "the-nervous-system", title: "The nervous system" },
  { slug: "cells-of-the-brain", title: "Cells of the brain" },
];

export default {
  title: "Chapter/ReaderShell/ReaderTopBar",
  component: ReaderTopBar,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
  args: {
    chapterNumber: "03",
    chapterTitle: "Foundations of Neuroscience",
    sections: SECTIONS,
    progressPercent: 42,
    currentSection: "the-nervous-system",
  },
  argTypes: {
    chapterNumber: { control: "text" },
    chapterTitle: { control: "text" },
    sections: { control: "object" },
    progressPercent: {
      control: { type: "range", min: 0, max: 100, step: 1 },
      description: "Whole-document reading progress shown in the top bar.",
    },
    currentSection: {
      control: "select",
      options: [null, ...SECTIONS.map(({ slug }) => slug)],
      description: "Story-only control for the active section in Pinia.",
    },
  },
  render: (args) => ({
    components: { ReaderTopBar },
    setup() {
      const store = useGeneral();
      store.$patch({
        activeMenu: false,
        currentSubChapter: args.currentSection,
      });
      useReaderSidebar().close();
      return { args };
    },
    template: `
      <div style="min-height:240px; background:rgb(var(--color-bg));">
        <ReaderTopBar
          :chapter-number="args.chapterNumber"
          :chapter-title="args.chapterTitle"
          :sections="args.sections"
          :progress-percent="args.progressPercent"
        />
      </div>`,
  }),
};

export const Desktop = {};

export const OpeningFrame = {
  args: { progressPercent: 0, currentSection: null },
};

export const NearlyComplete = {
  args: { progressPercent: 94, currentSection: "cells-of-the-brain" },
};

export const Mobile = {
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
};
