import Harness from "./HistoryFullReaderHarness.vue";
import fixture from "@/stories/retinaFullReaderData.json";
import { publishedReaderStory } from "@/stories/publishedReaderStory";
import { retinaRailFixture } from "@/stories/retinaRailFixture";

export default {
  ...publishedReaderStory(fixture, Harness, "Retina"),
  title: "Chapter/Retina Full Reader",
  component: Harness,
};
export const PublishedExport = {};
export const RailBoxes = {
  parameters: publishedReaderStory(retinaRailFixture(), Harness, "Retina")
    .parameters,
};
