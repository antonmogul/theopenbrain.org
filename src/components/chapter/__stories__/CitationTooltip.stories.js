/*
 * Chapter/ReaderShell/CitationTooltip — the reference card that pops over a
 * `.citation-ref` marker in the prose. No props: it resolves the marker's
 * data-ref through the injected `references` context, so the story provides
 * the marker and the context (chapterFrame's provideReaderData) and clicks
 * the marker in `play`.
 */
import CitationTooltip from "../CitationTooltip.vue";
import { chapterFrame, references } from "./chapterFixtures";

const openCitation = async () => {
  document.querySelector(".citation-ref")?.click();
};

export default {
  title: "Chapter/ReaderShell/CitationTooltip",
  component: CitationTooltip,
  parameters: { layout: "fullscreen" },
  args: {
    refNumber: 1,
    sentence: "Horizontal cells help create antagonistic surrounds",
  },
  argTypes: {
    refNumber: {
      control: "select",
      options: references.map((reference) => reference.number),
      description:
        "Story-only: data-ref of the marker the play function clicks, resolved through the injected references.",
    },
    sentence: { control: "text", description: "Story-only: the prose." },
  },
  render: chapterFrame(CitationTooltip, {
    provideReaderData: true,
    template: `<div style="min-height:260px;padding:96px 48px;font:20px/1.7 var(--font-body);">{{ args.sentence }} <button class="citation-ref" :data-ref="args.refNumber" style="font:inherit;color:rgb(var(--color-accent));">[{{ args.refNumber }}]</button>. <StoryComponent /></div>`,
  }),
};

/** Reference 1 (journal article with a DOI). */
export const Default = { play: openCitation };

/** Reference 2 (no DOI). */
export const SecondReference = {
  args: {
    refNumber: 2,
    sentence: "Retinal output is divided into parallel pathways",
  },
  play: openCitation,
};

/** Nothing clicked — only the marker is visible. */
export const Idle = {};
