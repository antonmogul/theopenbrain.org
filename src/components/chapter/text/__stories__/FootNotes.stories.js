/*
 * Chapter/Text/FootNotes — the numbered notes list at the foot of a chapter.
 * Note text is HTML; numbering comes from array position, not `number`.
 */
import FootNotes from "../FootNotes.vue";
import { proseFrame } from "../../__stories__/chapterFixtures";

const NOTES = [
  {
    number: 1,
    text: "Scotopic vision is mediated primarily by rods and has low spatial acuity.",
  },
  {
    number: 2,
    text: "Photopic vision is cone-mediated and supports colour discrimination.",
  },
];

export default {
  title: "Chapter/Text/FootNotes",
  component: FootNotes,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
  args: { content: { title: "Notes", notes: NOTES } },
  argTypes: {
    content: {
      control: "object",
      description: "{ title, notes: [{ number, text }] }. Text is HTML.",
    },
  },
  render: proseFrame(FootNotes),
};

export const Default = {};

export const SingleNote = {
  args: { content: { title: "Note", notes: [NOTES[0]] } },
};

/** A chapter with a notes heading but nothing under it yet. */
export const Empty = { args: { content: { title: "Notes", notes: [] } } };
