/*
 * Chapter/Text/FurtherReading — the Webvision pointer at the end of Chapter 1.
 * Only the heading is a prop; the body copy and link are fixed.
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
