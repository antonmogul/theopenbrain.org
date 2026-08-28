import { useReaderSidebar } from "@/composables/useReaderSidebar";
import CitationTooltipComponent from "../CitationTooltip.vue";
import ExportFieldComponent from "../ExportField.vue";
import ReaderSidebarComponent from "../ReaderSidebar.vue";
import TextCompComponent from "../TextComp.vue";
import TrendingHighlightsComponent from "../TrendingHighlights.vue";
import {
  chapterFrame,
  references,
  retinaChapter,
  trending,
} from "./chapterFixtures";

export default {
  title: "Chapter/ReaderShell/ComponentCatalog",
  parameters: { layout: "fullscreen" },
};

export const CitationTooltip = {
  render: chapterFrame(CitationTooltipComponent, {
    provideReaderData: true,
    template: `
      <div style="min-height:260px;padding:96px 48px;font:20px/1.7 var(--font-body);">
        Horizontal cells help create antagonistic surrounds
        <button class="citation-ref" data-ref="1" style="font:inherit;color:rgb(var(--color-accent));">[1]</button>.
        <StoryComponent />
      </div>`,
  }),
  play: async () => {
    document.querySelector(".citation-ref")?.click();
  },
};

export const ImportChapterJson = {
  name: "ExportField · import JSON overlay",
  render: chapterFrame(ExportFieldComponent, {
    template: `<div style="min-height:520px;"><StoryComponent /></div>`,
  }),
};

export const ReaderSidebarInfo = {
  render: chapterFrame(ReaderSidebarComponent, {
    provideReaderData: true,
    setup() {
      useReaderSidebar().open("info");
    },
    template: `<div style="min-height:680px;padding:24px;"><StoryComponent module-id="retina-module" :is-authenticated="true" /></div>`,
  }),
  parameters: { auth: { role: "student" } },
};

export const ReaderSidebarMobile = {
  render: chapterFrame(ReaderSidebarComponent, {
    provideReaderData: true,
    setup() {
      useReaderSidebar().open("notebook");
    },
    template: `<div style="min-height:680px;"><StoryComponent module-id="retina-module" :is-authenticated="true" /></div>`,
  }),
  parameters: {
    auth: { role: "student" },
    viewport: { defaultViewport: "mobile1" },
  },
};

export const TextCompLongChapter = {
  render: chapterFrame(TextCompComponent, {
    chapter: {
      ...retinaChapter,
      sections: [
        ...retinaChapter.sections,
        {
          id: "ganglion-output",
          title: "Ganglion-cell output",
          paragraphs: [
            {
              id: "ganglion-output-1",
              text: "Midget, parasol, and small bistratified ganglion cells carry distinct combinations of spatial, temporal, and chromatic information toward the lateral geniculate nucleus.",
            },
          ],
          subSection: [],
        },
      ],
    },
    template: `<div style="min-height:1800px;position:relative;"><StoryComponent /></div>`,
  }),
};

export const TrendingHighlightsPopulated = {
  render: chapterFrame(TrendingHighlightsComponent),
  parameters: {
    api: { trending_highlights: trending },
  },
};

export const TrendingHighlightsEmpty = {
  render: chapterFrame(TrendingHighlightsComponent),
  parameters: { api: { trending_highlights: [] } },
};

export const CitationReferenceFixture = {
  name: "CitationTooltip · long citation fixture",
  render: chapterFrame(CitationTooltipComponent, {
    provideReaderData: true,
    references,
    template: `
      <div style="min-height:260px;padding:96px 48px;font:20px/1.7 var(--font-body);">
        Retinal output is divided into parallel pathways
        <button class="citation-ref" data-ref="2" style="font:inherit;color:rgb(var(--color-accent));">[2]</button>.
        <StoryComponent />
      </div>`,
  }),
  play: async () => {
    document.querySelector('.citation-ref[data-ref="2"]')?.click();
  },
};
