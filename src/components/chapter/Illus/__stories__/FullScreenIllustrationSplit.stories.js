/*
 * Chapter/Illustrations/FullScreenIllustrationSplit — the two-column,
 * scroll-scrubbed figure (lateral organization). Left and right Lotties are
 * driven from the parent's scrolling container, which is null in Storybook,
 * so the stage shows the resting frame.
 */
import FullScreenIllustrationSplit from "../FullScreenIllustrationSplit.vue";
import {
  animationById,
  illustrationFrame,
} from "../../__stories__/chapterFixtures";

const scrollFigure = animationById("animationLateralOrganization");

export default {
  title: "Chapter/Illustrations/FullScreenIllustrationSplit",
  component: FullScreenIllustrationSplit,
  parameters: { layout: "fullscreen", api: { animations: [] } },
  args: {
    animation: {
      ...scrollFigure,
      title: "Lateral organization across retinal layers",
      sources: ["Masland, 2012"],
    },
    container: null,
  },
  argTypes: {
    animation: { control: "object" },
    container: {
      control: false,
      description:
        "The parent's scrolling HTMLDivElement that scrubs the frames; null here.",
    },
  },
  render: illustrationFrame(FullScreenIllustrationSplit),
};

export const Default = {};
