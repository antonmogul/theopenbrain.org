import { useGeneral } from "@/stores";
import { useReaderSidebar } from "@/composables/useReaderSidebar";
import ReaderTopBar from "../ReaderTopBar.vue";

const SECTIONS = [
  { slug: "from-light-to-signal", title: "From light to signal" },
  { slug: "retinal-circuits", title: "Retinal circuits" },
  { slug: "direction-selectivity", title: "Direction selectivity" },
];

export default {
  title: "Chapter/ReaderShell/ReaderTopBar",
  component: ReaderTopBar,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
  args: {
    chapterNumber: "01",
    chapterTitle: "The Retina",
    sections: SECTIONS,
    progress: 0.42,
    currentSection: "retinal-circuits",
  },
  argTypes: {
    chapterNumber: { control: "text" },
    chapterTitle: { control: "text" },
    sections: { control: "object" },
    progress: {
      control: { type: "range", min: 0, max: 1, step: 0.01 },
      description: "Story-only control for the useGeneral reader state.",
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
        progress: args.progress,
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
        />
      </div>`,
  }),
};

export const InProgress = {};

export const OpeningFrame = {
  args: { progress: 0, currentSection: null },
};

export const NearlyComplete = {
  args: { progress: 0.94, currentSection: "direction-selectivity" },
};
