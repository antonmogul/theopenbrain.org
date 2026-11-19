import ReviewAuthorActions from "../ReviewAuthorActions.vue";
export default {
  title: "Chapter/Review/ReviewAuthorActions",
  component: ReviewAuthorActions,
  args: { note: { id: "story", status: "done" }, action: async () => true },
};
export const FixedPleaseCheck = {};
export const Checked = { args: { note: { id: "story", status: "verified" } } };
export const SaveFailed = {
  args: {
    action: async () => {
      throw new Error("Couldn't save. Try again.");
    },
  },
};
