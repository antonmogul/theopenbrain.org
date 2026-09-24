/*
 * Chapter/Figure widgets/History — the History chapter's two figure widgets
 * (OPENBRAIN-87): the trepanation skull, whose hands come in over their
 * openings, and case 20 of the Edwin Smith papyrus as tabs. The accent is the
 * chapter's ramp.
 */
import TrepanationMethods from "../trepanation/TrepanationMethods.vue";
import trepanation from "../trepanation/schema.js";
import PapyrusCase from "../papyrus/PapyrusCase.vue";
import papyrus from "../papyrus/schema.js";
import { figureContent } from "../content.js";

const inChapter =
  (ramp, height = 760) =>
  () => ({
    template: `<div data-chapter="${ramp}" class="widget-root figure-widget" style="height: ${height}px"><story /></div>`,
  });

export default {
  title: "Chapter/Figure widgets/History",
  decorators: [inChapter("fund")],
};

/** Figure 2 as the reader first sees it: the skull, numbered. */
export const Trepanation = {
  render: () => ({
    components: { TrepanationMethods },
    setup: () => ({
      content: figureContent(trepanation, {}),
      schema: trepanation,
    }),
    template: `<TrepanationMethods :content="content" :schema="schema" />`,
  }),
};

/** Figure 2 in a phone-sized figure box. */
export const TrepanationNarrow = {
  ...Trepanation,
  decorators: [
    () => ({ template: `<div style="width: 360px"><story /></div>` }),
    inChapter("fund", 560),
  ],
};

/** Figure 4: case 20's four parts as tabs. */
export const Papyrus = {
  render: () => ({
    components: { PapyrusCase },
    setup: () => ({ content: figureContent(papyrus, {}), schema: papyrus }),
    template: `<PapyrusCase :content="content" :schema="schema" />`,
  }),
};

/** Figure 4 in the Retina's teal: the same widget takes each chapter's colour. */
export const PapyrusInRetina = {
  ...Papyrus,
  decorators: [inChapter("perc")],
};
