/*
 * Chapter/Text/EditableBlock — a paragraph or heading that creators can edit
 * in place (TipTap). Read-only for everyone else. The `tag` prop chooses the
 * element the content renders as when not editing.
 */
import EditableBlock from "../EditableBlock.vue";
import { proseFrame } from "../../__stories__/chapterFixtures";

const CONTENT =
  "Horizontal cells pool photoreceptor signals to help form antagonistic surrounds.";

export default {
  title: "Chapter/Text/EditableBlock",
  component: EditableBlock,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
  args: {
    content: CONTENT,
    paragraphId: "horizontal-cells-1",
    isCreator: false,
    tag: "p",
    className: "",
  },
  argTypes: {
    content: { control: "text", description: "HTML content." },
    paragraphId: { control: "text" },
    isCreator: {
      control: "boolean",
      description: "Shows the edit affordance and enables the inline editor.",
    },
    tag: { control: "select", options: ["p", "h1", "h2", "h3", "span"] },
    className: { control: "text" },
  },
  render: proseFrame(EditableBlock),
};

/** What a reader sees: plain content, no edit affordance. */
export const Default = {};

/** A creator hovering the block gets the pencil; clicking it opens the editor. */
export const Creator = {
  args: { isCreator: true },
  parameters: { auth: { role: "creator" } },
};

/** Section titles are editable too — the tag switches the rendered element. */
export const HeadingCreator = {
  args: {
    isCreator: true,
    tag: "h2",
    content: "Retinal circuits",
    paragraphId: "section-title-retinal-circuits",
  },
  parameters: { auth: { role: "creator" } },
};

/** A creator facing an empty block — the layout must not collapse. */
export const EmptyContent = {
  args: { isCreator: true, content: "" },
  parameters: { auth: { role: "creator" } },
};
