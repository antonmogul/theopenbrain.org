/*
 * Chapter/Figure widgets/FigureWidget — the host the reader places: it
 * resolves a figure's widget from its animation key and gives it the
 * chapter's accent and its content (OPENBRAIN-80).
 */
import FigureWidget from "../FigureWidget.vue";

export default {
  title: "Chapter/Figure widgets/FigureWidget",
  component: FigureWidget,
  decorators: [
    () => ({
      template: `<div data-chapter="perc" style="height: 760px"><story /></div>`,
    }),
  ],
};

/** A database-shaped record: title, legacy config flags and state rows. */
export const FromTheDatabase = {
  args: {
    record: {
      id: "animationImpairedVision",
      title: "Refraction errors",
      toggle: "Corrected",
      fullscreen: true,
      states: ["Normal eye (emmetropia)", "Myopia", "Hyperopia", "Astigmatism"],
    },
  },
};
