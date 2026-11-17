/*
 * Chapter/ReaderShell/ReaderSearch — the search field in the reader's top
 * bar (OPENBRAIN-197), where the chapter number and the section menu were.
 * It searches the chapter the reader holds as they type (headings,
 * paragraphs, breakout boxes, widgets, figure titles and legends), lists
 * the results under the field with the words marked, and jumps to one
 * through readerJump. "/" focuses it, the arrows move, Enter goes, Escape
 * closes. Below 640px it is a search button that opens a full-width field.
 *
 * Here it stands alone over a small chapter; see ReaderTopBar's Search
 * stories for it in the bar.
 */
import { useText } from "@/stores";
import ReaderSearch from "../ReaderSearch.vue";
import { SEARCH_CHAPTER, SEARCH_FIGURES, typeQuery } from "./searchFixtures";

export default {
  title: "Chapter/ReaderShell/ReaderSearch",
  component: ReaderSearch,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
  args: { records: SEARCH_FIGURES },
  argTypes: {
    records: {
      control: "object",
      description:
        "Figure records for titles and legends; the reader's own (useAnimations) when absent.",
    },
  },
  render: (args) => ({
    components: { ReaderSearch },
    setup() {
      useText().$patch({ text: SEARCH_CHAPTER });
      return { args };
    },
    // The bar's row, so the field has its real width and the phone layout
    // has a bar to lay the open field over.
    template: `
      <div style="min-height:34rem; background:rgb(var(--color-bg));">
        <div style="position:relative; display:flex; align-items:center; gap:14px; min-height:54px; padding:5px 8px; background:rgb(var(--color-paper)); border-bottom:1px solid rgb(var(--color-line));">
          <ReaderSearch :records="args.records" />
        </div>
      </div>`,
  }),
};

/** At rest: the field, its placeholder and the "/" key hint. */
export const Default = {};

/** Typing: headings first, then figures, then the text, the words marked. */
export const Results = { play: typeQuery("brain") };

/** Accents and case don't matter: "ramon cajal" finds Ramón y Cajal. */
export const Accents = { play: typeQuery("ramon cajal") };

/** Nothing found. */
export const NoResults = { play: typeQuery("zebra") };

/** A phone: the search button alone. */
export const Mobile = {
  globals: { viewport: { value: "phone" } },
};

/** A phone, opened: the field across the bar, the results under it. */
export const MobileResults = {
  globals: { viewport: { value: "phone" } },
  play: typeQuery("descartes"),
};
