/*
 * Chapter/Illustrations/TextOverlay — the expandable info text next to a
 * full-screen figure, opened from the (+) icon. For the impaired-vision
 * figure it also carries the link to the related break video.
 */
import TextOverlay from "../TextOverlay.vue";
import {
  animationById,
  illustrationFrame,
} from "../../__stories__/chapterFixtures";

const impairedVision = animationById("animationImpairedVision");
const centreSurround = animationById("animationCenterSurroundReceptiveFields");

const INFO_TEXT =
  "Optical blur can originate before neural processing begins. Compare emmetropia, myopia, hyperopia, and astigmatism as changes in where rays converge relative to the retina.";

export default {
  title: "Chapter/Illustrations/TextOverlay",
  component: TextOverlay,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
  args: {
    animation: { ...impairedVision, infoText: INFO_TEXT },
    infoIsOpen: true,
  },
  argTypes: {
    animation: {
      control: "object",
      description:
        "{ id, title, infoText }. infoText is HTML; id animationImpairedVision adds the break-video link.",
    },
    infoIsOpen: { control: "boolean" },
  },
  render: illustrationFrame(TextOverlay),
};

/** Open, with the break-video card. */
export const Default = {};

export const Closed = { args: { infoIsOpen: false } };

/** Any other figure: just the text, no video card. */
export const WithoutVideoLink = {
  args: {
    animation: {
      ...centreSurround,
      infoText:
        "An ON-centre cell fires to light in the middle of its receptive field and is suppressed by light in the surround; an OFF-centre cell does the reverse.",
    },
  },
};
