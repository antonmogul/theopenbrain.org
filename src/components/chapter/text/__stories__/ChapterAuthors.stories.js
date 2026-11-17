/*
 * Chapter/Text/ChapterAuthors — the chapter's authors at the top of its
 * introduction (OPENBRAIN-197): a circle with the face, the name and the
 * affiliation, the whole row a link to the author's lab site in a new tab.
 * Until the photos arrive the circle holds the author's initials on the
 * chapter colour (the toolbar's Chapter control changes it). The data comes
 * from helper/chapterAuthors.js: modules.authors, with each author's link
 * and photo from the entry or from AUTHOR_PROFILES by name.
 */
import ChapterAuthors from "../ChapterAuthors.vue";
import { authorCardsForModule } from "@/helper/chapterAuthors";

const frame = (authors) => ({
  components: { ChapterAuthors },
  setup: () => ({ authors }),
  template: `<div style="max-width:35rem;"><ChapterAuthors :authors="authors" /></div>`,
});

// A stand-in picture from the book, to show a filled circle: Maura's
// photos of the authors are to come.
const FACE = "/publicAssets/images/foundations/fig01-01.jpg";

export default {
  title: "Chapter/Text/ChapterAuthors",
  component: ChapterAuthors,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  args: { authors: authorCardsForModule({ slug: "the-retina" }) },
  argTypes: {
    authors: {
      control: "object",
      description:
        "`authorCardsForModule(module)`: [{ name, affiliation, url, photo, initials }].",
    },
  },
  render: (args) => frame(args.authors),
};

/** The Retina's two authors, initials until their photos arrive. */
export const Default = {};

/** History, in its violet. */
export const History = {
  args: {
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
  },
  globals: { chapter: "fund" },
};

/** With a photo: the `photo` field on the author's entry. */
export const WithPhoto = {
  args: {
    authors: authorCardsForModule({
      authors: [
        {
          name: "Stuart Trenholm",
          affiliation: "Montreal Neurological Institute, McGill University",
          photo: FACE,
        },
        {
          name: "Naguib Mechawar",
          affiliation: "Douglas Mental Health University Institute",
        },
      ],
    }),
  },
};

/** An author the book has no site for is plain text. */
export const WithoutLink = {
  args: {
    authors: authorCardsForModule({
      authors: [{ name: "A. Guest", affiliation: "A university, somewhere" }],
    }),
  },
};

export const Mobile = {
  globals: { viewport: { value: "phone" } },
};
