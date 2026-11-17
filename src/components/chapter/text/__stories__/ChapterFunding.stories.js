/*
 * Chapter/Text/ChapterFunding — who funded the chapter, under its authors
 * (OPENBRAIN-200). The line is set like the authors' affiliations; the
 * funder's logo below it is the link, in a new tab. Data from
 * helper/chapterCredits.js (`creditsForModule`).
 */
import ChapterFunding from "../ChapterFunding.vue";
import ChapterAuthors from "../ChapterAuthors.vue";
import { creditsForModule } from "@/helper/chapterCredits";
import { authorCardsForModule } from "@/helper/chapterAuthors";

const HISTORY = { slug: "foundations-of-neuroscience" };

export default {
  title: "Chapter/Text/ChapterFunding",
  component: ChapterFunding,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  args: { funding: creditsForModule(HISTORY).funding },
  argTypes: {
    funding: {
      control: "object",
      description:
        "`creditsForModule(module).funding`: { text, url, logo: { src, alt, width, height } }.",
    },
  },
  render: (args) => ({
    components: { ChapterFunding },
    setup: () => ({ args }),
    template: `<div style="max-width:35rem;"><ChapterFunding v-bind="args" /></div>`,
  }),
};

/** History: The Neuro, linked to its site. */
export const Default = {};

/** Under the authors, as the reader sets it above "Introduction". */
export const UnderAuthors = {
  render: (args) => ({
    components: { ChapterFunding, ChapterAuthors },
    setup: () => ({
      args,
      authors: authorCardsForModule({
        authors: [
          {
            name: "Naguib Mechawar",
            affiliation:
              "Douglas Mental Health University Institute; Department of Psychiatry, McGill University",
          },
          {
            name: "Stuart Trenholm",
            affiliation: "Montreal Neurological Institute, McGill University",
          },
        ],
      }),
    }),
    template: `<div style="max-width:35rem;"><ChapterAuthors :authors="authors" /><ChapterFunding v-bind="args" /></div>`,
  }),
  globals: { chapter: "fund" },
};

/** A funder with no logo is the line alone. */
export const WithoutLogo = {
  args: {
    funding: { text: "This chapter was funded by a foundation.", logo: null },
  },
};

export const Mobile = {
  globals: { viewport: { value: "phone" } },
};
