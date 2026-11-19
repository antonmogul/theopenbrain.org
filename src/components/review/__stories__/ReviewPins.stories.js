/*
 * Chapter/Review/ReviewPins — the numbered pins "All notes" can put on the
 * page (OPENBRAIN-204), here on two paragraphs at the points the notes
 * were made. Not in the docs page: the pins are fixed to the window.
 */
import ReviewPins from "../ReviewPins.vue";

const PAGE = `<main style="max-width:640px;margin:80px auto;padding:24px;font-family:var(--font-body);">
  <div class="P" data-paragraph-id="11111111-0000-4000-8000-000000000001" style="margin-bottom:24px;">
    The idea that the brain is the seat of the mind is an old one, and the
    first skulls with man-made holes show how long people have looked.
  </div>
  <div class="P" data-paragraph-id="11111111-0000-4000-8000-000000000002">
    Galen's experiments on the nerves of a squealing pig are the first
    record of a nerve cut that silences a voice.
  </div>
</main>`;

const ITEMS = [
  {
    id: "a",
    n: 1,
    label: "¶ 1 in “Where is my mind?”",
    anchor: {
      kind: "paragraph",
      paragraphId: "11111111-0000-4000-8000-000000000001",
      point: { x: 0.2, y: 0.3 },
    },
  },
  {
    id: "b",
    n: 2,
    label: "¶ 2 in “Where is my mind?”",
    anchor: {
      kind: "paragraph",
      paragraphId: "11111111-0000-4000-8000-000000000002",
      point: { x: 0.7, y: 0.5 },
    },
  },
];

export default {
  title: "Chapter/Review/ReviewPins",
  component: ReviewPins,
  parameters: { layout: "fullscreen" },
  args: { items: ITEMS },
  argTypes: { items: { control: "object" }, onOpen: { action: "open" } },
  render: (args) => ({
    components: { ReviewPins },
    setup: () => ({ args, page: PAGE }),
    template: `<div><div v-html="page"></div><ReviewPins v-bind="args" /></div>`,
  }),
};

export const OnTwoParagraphs = {};

export const Statuses = {
  args: {
    showChecked: true,
    items: ["new", "doing", "question", "done", "wont_do", "verified"].map(
      (status, i) => ({
        ...ITEMS[0],
        id: status,
        n: i + 1,
        status,
        anchor: { ...ITEMS[0].anchor, point: { x: i * 0.15, y: i * 0.3 } },
      })
    ),
  },
};
