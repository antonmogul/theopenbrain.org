/** Cover-only draft fixtures exercise the real creator-gated reader routes.
 * These are not exports of the unpublished manuscripts. The cover paths,
 * titles and slugs are the existing chapter seeds and chapterCover defaults. */
import Harness from "./HistoryFullReaderHarness.vue";

export default {
  title: "Chapter/Cover Logo",
  component: Harness,
  parameters: {
    layout: "fullscreen",
    auth: { authenticated: true, role: "creator" },
  },
};

function draft(slug, title, number, cover) {
  return {
    args: { start: `/chapter/${number}/${slug}` },
    parameters: {
      api: {
        "modules?": [
          {
            id: `cover-${slug}`,
            slug,
            title,
            order_index: number,
            status: "draft",
            cover,
          },
        ],
        "sections?": [],
        "paragraphs?": [],
        "animations?": [],
      },
      docs: {
        description: {
          story:
            "Creator-only route with cover metadata; no draft manuscript content.",
        },
      },
    },
  };
}

export const AttentionCreator = draft(
  "attention-and-working-memory",
  "Attention and Working Memory",
  3,
  {
    image: "/publicAssets/images/attention-matisse-reader.jpg",
    reactive: null,
  }
);
export const StressCreator = draft(
  "stress",
  "Understanding Stress: A Multifaceted Exploration",
  4,
  {
    image: "/publicAssets/images/background.jpg",
    reactive: null,
  }
);
export const AttentionStudentDenied = {
  ...AttentionCreator,
  parameters: {
    ...AttentionCreator.parameters,
    auth: { authenticated: true, role: "student" },
  },
};
