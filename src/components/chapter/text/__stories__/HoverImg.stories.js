/*
 * Chapter/Text/HoverImg — the floating portrait-and-blurb that follows the
 * cursor while a `.hoverImg` anchor is hovered. No props: it finds anchors by
 * class and looks the id up in infosImages.json, so the story provides the
 * anchor and fires the hover in `play`.
 */
import infos from "@/assets/json_backend/infosImages.json";
import HoverImg from "../HoverImg.vue";
import { chapterFrame } from "../../__stories__/chapterFixtures";

const IMAGE_IDS = infos.images.map((image) => image.title);

const hover = async ({ args }) => {
  if (!args.hovered) return;
  document
    .querySelector(`#${args.imageId}.hoverImg`)
    ?.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
};

export default {
  title: "Chapter/Text/HoverImg",
  component: HoverImg,
  parameters: { layout: "fullscreen" },
  args: { imageId: "alcmeon", label: "Alcmaeon of Croton", hovered: true },
  argTypes: {
    imageId: {
      control: "select",
      options: IMAGE_IDS,
      description:
        "Story-only: id of the .hoverImg anchor; must match a title in infosImages.json.",
    },
    label: { control: "text", description: "Story-only: the anchor text." },
    hovered: {
      control: "boolean",
      description: "Story-only: fire mouseover on mount.",
    },
  },
  render: chapterFrame(HoverImg, {
    template: `<div style="min-height:480px;padding:64px;"><button :id="args.imageId" class="hoverImg" style="font:20px var(--font-body);text-decoration:underline;">{{ args.label }}</button><StoryComponent /></div>`,
  }),
};

export const Default = { play: hover };

export const IslamicGoldenAge = {
  args: { imageId: "islamicGoldenAge", label: "the Islamic Golden Age" },
  play: hover,
};

/** Nothing hovered — the component renders nothing at all. */
export const Idle = { args: { hovered: false }, play: hover };
