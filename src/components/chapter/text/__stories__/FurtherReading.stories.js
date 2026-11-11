/*
 * Chapter/Text/FurtherReading — what the authors would read first, at the
 * head of the chapter's back matter, above its references (OPENBRAIN-179).
 * All of it is the chapter's own data: a title, and paragraphs of a line
 * and its links (to a source, or to an entry of the reference list).
 */
import FurtherReading from "../FurtherReading.vue";
import { proseFrame } from "../../__stories__/chapterFixtures";

export default {
  title: "Chapter/Text/FurtherReading",
  component: FurtherReading,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
  args: { content: { title: "Further reading" } },
  argTypes: {
    content: { control: "object", description: "{ title }" },
  },
  render: proseFrame(FurtherReading),
};

export const Default = {};

export const CustomTitle = {
  args: { content: { title: "Where to go next" } },
};

/** History's: a line and three entries of its reference list. */
export const WithLinks = {
  args: {
    content: {
      title: "Further reading:",
      paragraphs: [
        {
          title:
            "For a broader overview of the history of neuroscience, see these resources.",
          links: [
            {
              url: "#ref-29",
              text: "29. Gross — Brain, Vision, Memory: Tales in the History of Neuroscience",
            },
            {
              url: "#ref-8",
              text: "8. Finger — Origins of Neuroscience: A History of Explorations Into Brain Function",
            },
            { url: "#ref-2", text: "2. Gross — A Hole in the Head" },
          ],
        },
      ],
    },
  },
};
