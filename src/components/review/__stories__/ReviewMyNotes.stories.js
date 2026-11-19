/*
 * Chapter/Review/ReviewMyNotes — the notes sent from this browser, with the
 * team's status and reply (OPENBRAIN-204): done with a reply, a question
 * back, one still waiting to send, one just received.
 */
import ReviewMyNotes from "../ReviewMyNotes.vue";
import { NOTES } from "./reviewFixtures";

export default {
  title: "Chapter/Review/ReviewMyNotes",
  component: ReviewMyNotes,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  args: {
    notes: NOTES,
    chapterSlug: "",
    checking: false,
    authorAction: async () => true,
  },
  argTypes: {
    notes: { control: "object" },
    chapterSlug: { control: "text" },
    checking: { control: "boolean" },
    onRefresh: { action: "refresh" },
    onDiscard: { action: "discard" },
    onShow: { action: "show" },
    onRetry: { action: "retry" },
  },
  render: (args) => ({
    components: { ReviewMyNotes },
    setup: () => ({ args }),
    template: `<div style="max-width:380px;padding:12px;background:rgb(var(--color-paper));">
      <ReviewMyNotes v-bind="args" />
    </div>`,
  }),
};

export const WithReplies = {};

export const Checking = { args: { checking: true } };

export const Empty = { args: { notes: [] } };

export const Statuses = {
  args: {
    notes: ["new", "doing", "question", "done", "wont_do", "verified"].map(
      (status, i) => ({
        ...NOTES[0],
        clientId: `status-${i}`,
        id: `status-${i}`,
        status,
      })
    ),
  },
};
export const FixedPleaseCheck = { args: { notes: [NOTES[0]] } };
export const CheckedByAuthor = {
  args: { notes: [{ ...NOTES[0], status: "verified" }] },
};
