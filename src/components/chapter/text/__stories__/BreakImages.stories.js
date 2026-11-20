/* A break-video block owns its media and caption; no chapter lookup. */
import { breakVideos } from "@/stories/breakVideoFixtures";
import BreakImages from "../BreakImages.vue";
import { proseFrame } from "../../__stories__/chapterFixtures";

export default {
  title: "Chapter/Text/BreakImages",
  component: BreakImages,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
  args: { video: breakVideos.placeholder },
  argTypes: {
    video: { control: "object", description: "The authored video block." },
  },
  render: proseFrame(BreakImages),
};

export const Default = {};
export const DowlingAndWerblin = {
  args: { video: breakVideos["dowling-and-werblin"] },
};
export const TomBaden = { args: { video: breakVideos.baden } };
export const NeitzMyopia = { args: { video: breakVideos["neitz-myopia"] } };
