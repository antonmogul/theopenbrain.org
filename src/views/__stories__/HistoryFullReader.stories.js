import HistoryFullReaderHarness from "./HistoryFullReaderHarness.vue";
import fixture from "./historyFullReaderData.json";

export default {
  title: "Chapter/History Full Reader",
  component: HistoryFullReaderHarness,
  parameters: {
    layout: "fullscreen",
    auth: { authenticated: false },
    api: {
      "modules?": [fixture.module],
      "sections?": fixture.sections,
      "paragraphs?": fixture.paragraphs,
      "animations?": fixture.animations,
      "animation_states?": [],
      "animation_variants?": [],
      "references?": [],
      "quizzes?": [],
    },
    docs: { description: { component: fixture.boundary } },
  },
};

export const SeedAndRepairs = {};
