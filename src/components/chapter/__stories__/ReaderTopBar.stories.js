/*
 * Chapter/ReaderShell/ReaderTopBar — the reader's app bar: menu, wordmark,
 * chapter and current section (a jump menu), the Info / Notebook / Chat
 * tools and the account menu. Reading progress is no longer a line along
 * its top edge: it is the chapter timeline docked at the bottom
 * (Chapter/ReaderShell/ChapterTimeline, OPENBRAIN-128). A draft chapter
 * carries a Draft badge beside the chapter number.
 */
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
    isAuthenticated: true,
    isDraft: false,
    currentSection: "the-nervous-system",
  },
  argTypes: {
    chapterNumber: { control: "text" },
    chapterTitle: { control: "text" },
    sections: { control: "object" },
    isAuthenticated: { control: "boolean" },
    isDraft: {
      control: "boolean",
      description:
        "An unpublished chapter (only creators can open one): a Draft badge beside the chapter number.",
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
          :is-authenticated="args.isAuthenticated"
          :is-draft="args.isDraft"
        />
      </div>`,
  }),
};

export const Desktop = {};

/** Above the first section: no section name to jump from yet. */
export const OpeningFrame = {
  args: { currentSection: null },
};

/** In the chapter's last section. */
export const LastSection = {
  args: { currentSection: "cells-of-the-brain" },
};

/**
 * A draft, as a creator sees it: the badge sits in the bar's row, so it
 * clears TextComp's Edit chapter toggle and edit bar under the bar.
 */
export const Draft = {
  args: { isDraft: true, chapterNumber: "04" },
};

/**
 * The draft badge at phone width: the chapter number hides and, below
 * 400px, the badge is an amber dot (the word stays for screen readers), so
 * the section name keeps its room and the account menu stays on the bar.
 */
export const DraftMobile = {
  args: { isDraft: true, chapterNumber: "04" },
  globals: { viewport: { value: "phone" } },
};

export const Mobile = {
  globals: { viewport: { value: "phone" } },
};
