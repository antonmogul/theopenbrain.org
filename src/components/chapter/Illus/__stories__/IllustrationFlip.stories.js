/*
 * Chapter/Illustrations/IllustrationFlip — the round "flip card" that plays
 * a disease-simulation video on the front and shows the still on the back.
 * `animation.video` is a stem under /publicAssets/video/9-1-diseases/.
 */
import IllustrationFlip from "../IllustrationFlip.vue";
import {
  animationById,
  illustrationFrame,
} from "../../__stories__/chapterFixtures";

const impairedVision = animationById("animationImpairedVision");

const VIDEOS = [
  "normal-vision",
  "cataracts",
  "glaucoma",
  "diabetic-retinopathy",
  "macular-degeneration",
  "retinitis-pigmentosa",
];

export default {
  title: "Chapter/Illustrations/IllustrationFlip",
  component: IllustrationFlip,
  parameters: { layout: "fullscreen", api: { animations: [] } },
  args: {
    animation: {
      ...impairedVision,
      video: "normal-vision",
      title: "Normal vision",
      infoText:
        "With the eye correctly focused, parallel rays converge on the photoreceptor layer.",
    },
  },
  argTypes: {
    animation: {
      control: "object",
      description: `{ video, title, infoText, source }. video is slugged into the asset name; available: ${VIDEOS.join(", ")}.`,
    },
  },
  render: illustrationFrame(IllustrationFlip),
};

export const Default = {};

export const Cataracts = {
  args: {
    animation: {
      ...impairedVision,
      video: "cataracts",
      title: "Cataracts",
      infoText:
        "A clouded lens scatters light before it reaches the retina, washing out contrast.",
    },
  },
};
