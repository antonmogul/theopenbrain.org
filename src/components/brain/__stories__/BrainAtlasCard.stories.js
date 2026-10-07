/*
 * Widgets/BrainAtlasCard — the card BrainAtlas opens for the chosen
 * chapter or area (OPENBRAIN-127), on the atlas's dark panel. The chapters
 * come from bookChapters() as the atlas builds them: with a catalog row a
 * chapter has a number and a route; without one it is in preparation.
 */
import BrainAtlasCard from "../BrainAtlasCard.vue";
import { areaById, bookChapters } from "@/helper/brain/areas";

const catalog = [
  {
    slug: "foundations-of-neuroscience",
    title: "Foundations of Neuroscience",
    order_index: 1,
    ramp: "fund",
  },
  { slug: "the-retina", title: "The Retina", order_index: 2, ramp: "perc" },
];
const chapters = bookChapters(catalog);
const bySlug = (slug) => chapters.find((c) => c.slug === slug);

export default {
  title: "Widgets/BrainAtlasCard",
  component: BrainAtlasCard,
  args: { chapters, loaded: true, backToTour: false },
  argTypes: {
    chapter: { control: false },
    area: { control: false },
    chapters: { control: false },
    loaded: {
      control: "boolean",
      description: "The catalog has answered.",
    },
    backToTour: {
      control: "boolean",
      description: "Closing hands back to the tour.",
    },
  },
  decorators: [
    () => ({
      template: `<div style="max-width:36rem;padding:3rem 1.5rem;background:rgb(var(--color-dark-surface));"><story /></div>`,
    }),
  ],
};

/** A published chapter: its parts and a link to read it. */
export const Chapter = { args: { chapter: bySlug("the-retina") } };

/** A chapter that owns two parts. Not in the catalog yet, so no link. */
export const InPreparation = {
  args: { chapter: bySlug("attention-and-working-memory"), backToTour: true },
};

/** An area no chapter covers yet. */
export const Unclaimed = { args: { area: areaById("motor") } };
