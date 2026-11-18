/*
 * Chapter/Review/ReviewForm — one reviewer's note (OPENBRAIN-204): the
 * kind, the place (an anchor's label, with "Point again"), and the words.
 */
import { ref } from "vue";
import ReviewForm from "../ReviewForm.vue";
import { ANCHORS } from "./reviewFixtures";

export default {
  title: "Chapter/Review/ReviewForm",
  component: ReviewForm,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  args: {
    anchor: ANCHORS.pane,
    identity: { name: "Stuart Trenholm", role: "author" },
    status: "",
    problems: [],
    type: "figure",
    note: "",
    quote: "",
    suggested: "",
  },
  argTypes: {
    anchor: { control: "object" },
    identity: { control: "object" },
    status: { control: "text" },
    problems: { control: "object" },
    type: {
      control: "select",
      options: ["content", "figure", "widget", "design", "bug", "note"],
    },
  },
  render: (args) => ({
    components: { ReviewForm },
    setup() {
      return {
        args,
        type: ref(args.type),
        note: ref(args.note),
        quote: ref(args.quote),
        suggested: ref(args.suggested),
      };
    },
    template: `<div style="max-width:380px;padding:12px;background:rgb(var(--color-paper));">
      <ReviewForm :anchor="args.anchor" :identity="args.identity"
        :status="args.status" :problems="args.problems"
        v-model:type="type" v-model:note="note"
        v-model:quote="quote" v-model:suggested="suggested" />
    </div>`,
  }),
};

export const PointedAtAFigure = {};

export const PlateOnATrack = {
  args: { anchor: ANCHORS.plate, type: "design" },
};

export const SelectedText = {
  args: {
    anchor: ANCHORS.selection,
    type: "content",
    quote: "rods are more sensitive",
    suggested: "rods are about 100 times more sensitive",
  },
};

export const NothingChosen = {
  args: {
    anchor: null,
    type: "note",
    problems: ["Write a note, or the current and the suggested text."],
  },
};

export const Sent = {
  args: {
    anchor: ANCHORS.reading,
    type: "note",
    status: "Saved in this browser. It will send when it can.",
  },
};
