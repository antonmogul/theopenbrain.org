/*
 * Chapter/ReaderShell/TrendingHighlights — the "most highlighted passages"
 * list. Fetches `trending_highlights` on mount through the (mocked) API
 * client; `limit` caps the request.
 */
import TrendingHighlights from "../TrendingHighlights.vue";
import { chapterFrame, trending } from "./chapterFixtures";

export default {
  title: "Chapter/ReaderShell/TrendingHighlights",
  component: TrendingHighlights,
  tags: ["autodocs"],
  parameters: { layout: "padded", api: { trending_highlights: trending } },
  args: { limit: 10 },
  argTypes: {
    limit: {
      control: { type: "number", min: 1 },
      description: "Maximum passages requested.",
    },
  },
  render: chapterFrame(TrendingHighlights, {
    template: `<div style="max-width:420px;"><StoryComponent v-bind="args" /></div>`,
  }),
};

export const Default = {};

/** Nobody has highlighted anything yet. */
export const Empty = { parameters: { api: { trending_highlights: [] } } };

/** The request never resolves — the loading state stays up. */
export const Loading = {
  parameters: {
    api: { trending_highlights: () => new Promise(() => {}) },
  },
};
