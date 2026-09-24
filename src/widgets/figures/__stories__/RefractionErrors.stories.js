/*
 * Chapter/Figure widgets/Refraction errors — the first figure widget
 * (OPENBRAIN-80), matched to theopenbrain.org. The accent is the chapter's
 * ramp, so the same figure takes each chapter's colour.
 */
import RefractionErrors from "../refraction-errors/RefractionErrors.vue";
import schema from "../refraction-errors/schema.js";
import { figureContent } from "../content.js";

const inChapter = (ramp) => () => ({
  template: `<div data-chapter="${ramp}" class="widget-root figure-widget" style="height: 760px"><story /></div>`,
});

export default {
  title: "Chapter/Figure widgets/Refraction errors",
  component: RefractionErrors,
  args: {
    content: figureContent(schema, {}),
    lottieUrl: "/publicAssets/animations/animationImpairedVision.json",
    infoOpenAtStart: true,
  },
  decorators: [inChapter("perc")],
};

/** As the reader first sees it: the introduction over the figure. */
export const Introduction = {};

/** The conditions, with the Retina's teal. */
export const Conditions = { args: { infoOpenAtStart: false } };

/** The same figure in History takes History's violet. */
export const InHistory = {
  args: { infoOpenAtStart: false },
  decorators: [inChapter("fund")],
};

/** Labels and correction button edited on the chapter page. */
export const Edited = {
  args: {
    infoOpenAtStart: false,
    content: figureContent(schema, {
      content: {
        title: "Why some eyes blur",
        states: [null, "Short sight", "Long sight"],
        toggle: "With glasses",
      },
    }),
  },
};
