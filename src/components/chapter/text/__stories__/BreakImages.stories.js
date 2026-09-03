/*
 * Chapter/Text/BreakImages — the "break video" card that links out of the
 * prose to /chapter/break/<slug>. Title and blurb are props; the slug keys
 * breakVideos.json and picks the poster (placeholder = Mona Lisa).
 */
import BreakImages from "../BreakImages.vue";
import { proseFrame } from "../../__stories__/chapterFixtures";

const SLUGS = ["placeholder", "dowling-and-werblin"];

export default {
  title: "Chapter/Text/BreakImages",
  component: BreakImages,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
  args: {
    slug: "placeholder",
    title: "How retinal circuits were mapped",
    text: "A short conversation about combining anatomy, physiology, and cell-type markers.",
  },
  argTypes: {
    slug: {
      control: "select",
      options: SLUGS,
      description: "Key into breakVideos.json; also selects the poster image.",
    },
    title: { control: "text" },
    text: { control: "text" },
  },
  render: proseFrame(BreakImages),
};

export const Default = {};

/** A real interview poster instead of the placeholder artwork. */
export const DowlingAndWerblin = {
  args: {
    slug: "dowling-and-werblin",
    title: "John Dowling",
    text: "Retinal cell types, connectivity and responses.",
  },
};
