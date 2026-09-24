/*
 * Chapter/Figure widgets/FigureIntro — the introduction a figure widget
 * opens on (OPENBRAIN-80, -81): text left, an optional break video right.
 */
import FigureIntro from "../shared/FigureIntro.vue";

export default {
  title: "Chapter/Figure widgets/FigureIntro",
  component: FigureIntro,
  decorators: [
    () => ({
      template: `<div data-chapter="perc" style="position: relative; height: 640px; background: #333"><story /></div>`,
    }),
  ],
  args: {
    text: "When rhodopsin absorbs a photon, its light-catching 11-cis retinal chromophore is isomerized into all-trans retinal.<sup data-sup='28'>28</sup>",
  },
};

export const TextOnly = {};

export const WithVideo = {
  args: {
    video: {
      title: "Maureen and Jay Neitz",
      text: "Possible causes and cures for myopia",
      slug: "neitz-myopia",
    },
  },
};
