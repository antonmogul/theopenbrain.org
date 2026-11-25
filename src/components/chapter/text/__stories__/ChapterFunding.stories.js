/*
 * Chapter/Text/ChapterFunding — who funded the chapter, under its authors
 * (OPENBRAIN-200). A row built like an author's, on a light grey panel:
 * the funder's logo on the left (the link, in a new tab, with no ground of
 * its own), the line on its right in the authors' face (OPENBRAIN-91).
 * Data from helper/chapterCredits.js (`creditsForModule`).
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

/** The Retina: the Vision Science Research Network's wider logo. */
export const Retina = {
  args: { funding: creditsForModule({ slug: "the-retina" }).funding },
  globals: { chapter: "perc" },
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
