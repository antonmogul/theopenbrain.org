import Harness from "./HistoryFullReaderHarness.vue";
import fixture from "@/stories/retinaFullReaderData.json";
import { publishedReaderStory } from "@/stories/publishedReaderStory";

export default {
  ...publishedReaderStory(fixture, Harness, "Retina"),
  title: "Chapter/Retina Full Reader",
  component: Harness,
};
export const PublishedExport = {};
