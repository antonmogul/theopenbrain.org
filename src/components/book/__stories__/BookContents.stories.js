/*
 * Chapter/BookContents — the book's table of contents (OPENBRAIN-104), on
 * the home page and /chapters: five subject parts in their ramp colours,
 * chapters as numbered rows with their sections, and (on /chapters) the
 * reader's progress.
 */
import BookContents from "../BookContents.vue";
import { bookParts } from "@/composables/useBookContents";

const MODULES = [
  {
    id: "h",
    order_index: 1,
    slug: "foundations-of-neuroscience",
    title: "Foundations of Neuroscience",
    description: "Debates that framed our understanding of the brain",
    ramp: "fund",
    authors: [{ name: "Naguib Mechawar" }, { name: "Stuart Trenholm" }],
  },
  {
    id: "r",
    order_index: 2,
    slug: "the-retina",
    title: "The Retina",
    description: "An interactive exploration of retinal anatomy.",
    ramp: "perc",
    authors: [{ name: "Arjun Krishnaswamy" }, { name: "Stuart Trenholm" }],
  },
  {
    id: "a",
    order_index: 3,
    slug: "attention-and-working-memory",
    title: "Attention and Working Memory",
    ramp: "lear",
    isDraft: true,
  },
];
const SECTIONS = [
  ["h", "Introduction"],
  ["h", "Where is my mind?"],
  ["h", "Do different parts of the brain do different things?"],
  ["r", "Organization and cell types in the retina"],
  ["r", "Photoreceptors and phototransduction"],
  ["a", "Attention is measured behaviorally"],
].map(([module_id, title], i) => ({
  id: `s${i}`,
  module_id,
  title,
  slug: `s${i}`,
  order_index: i,
  parent_section_id: null,
}));

export default {
  title: "Chapter/BookContents",
  component: BookContents,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
  args: { parts: bookParts(MODULES, SECTIONS), loading: false },
};

/** The home page: the contents without progress. */
export const Default = {};

/** /chapters, signed in: each chapter shows how far the reader is. */
export const WithProgress = {
  args: {
    progress: {
      h: { percent: 42, status: "reading" },
      r: { percent: 100, status: "done" },
    },
  },
};

export const Loading = { args: { loading: true } };
