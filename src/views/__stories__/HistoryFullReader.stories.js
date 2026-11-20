import HistoryFullReaderHarness from "./HistoryFullReaderHarness.vue";
import fixture from "@/stories/historyFullReaderData.json";
import { publishedReaderStory } from "@/stories/publishedReaderStory";

export default {
  ...publishedReaderStory(fixture, HistoryFullReaderHarness, "History"),
  title: "Chapter/History Full Reader",
  component: HistoryFullReaderHarness,
};
export const PublishedExport = {};
