/*
 * Chapter/Review/ReviewAllNotes — everyone's notes on the chapter, grouped
 * by section, with the team's status and reply and the reviewers' replies
 * (OPENBRAIN-204).
 */
import { threadReviewNotes } from "@/composables/useReviewFeedback";
import ReviewAllNotes from "../ReviewAllNotes.vue";
import { CHAPTER_ROWS } from "./reviewFixtures";

const TITLES = {
  "do-different-parts": "Do different parts of the brain do different things?",
  "box-descartes": "Separating mind from body: Descartes and dualism",
};

export default {
  title: "Chapter/Review/ReviewAllNotes",
  component: ReviewAllNotes,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  args: {
    groups: threadReviewNotes(CHAPTER_ROWS),
    sectionTitle: (k) => TITLES[k] || k,
    loading: false,
    error: "",
    pins: false,
    numbers: {
      "aaaaaaaa-0000-4000-8000-000000000001": 1,
      "aaaaaaaa-0000-4000-8000-000000000003": 2,
    },
    focusId: "",
  },
  argTypes: {
    groups: { control: "object" },
    loading: { control: "boolean" },
    error: { control: "text" },
    pins: { control: "boolean" },
    onShow: { action: "show" },
    onReply: { action: "reply" },
    onRefresh: { action: "refresh" },
  },
  render: (args) => ({
    components: { ReviewAllNotes },
    setup: () => ({ args }),
    template: `<div style="max-width:380px;padding:12px;background:rgb(var(--color-paper));">
      <ReviewAllNotes v-bind="args" />
    </div>`,
  }),
};

export const Threads = {};

export const PinnedNote = {
  args: { pins: true, focusId: "aaaaaaaa-0000-4000-8000-000000000003" },
};

export const Empty = { args: { groups: [] } };

export const CouldNotLoad = {
  args: { groups: [], error: "Couldn't load the notes just now." },
};
