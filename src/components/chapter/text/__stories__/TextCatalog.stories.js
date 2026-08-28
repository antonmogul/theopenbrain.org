import { useCom } from "@/stores/comments";
import { onMounted, ref } from "vue";
import BreakImagesComponent from "../BreakImages.vue";
import BreakSectionComponent from "../BreakSection.vue";
import BreakTextComponent from "../BreakText.vue";
import CommentCompComponent from "../CommentComp.vue";
import DownloadSectionComponent from "../DownloadSection.vue";
import EditableBlockComponent from "../EditableBlock.vue";
import EyeStartComponent from "../EyeStart.vue";
import FootNotesComponent from "../FootNotes.vue";
import FootNotesWindowComponent from "../FootNotesWindow.vue";
import FurtherReadingComponent from "../FurtherReading.vue";
import HoverImgComponent from "../HoverImg.vue";
import InlineImagesComponent from "../InlineImages.vue";
import InlineImagesOpenCloseComponent from "../InlineImages_openClose.vue";
import QuizSectionComponent from "../QuizSection.vue";
import SectionCompComponent from "../SectionComp.vue";
import SubSectionComponent from "../SubSection.vue";
import SubSubSectionComponent from "../SubSubSection.vue";
import { chapterFrame, retinaChapter } from "../../__stories__/chapterFixtures";

export default {
  title: "Chapter/Text/ComponentCatalog",
  parameters: { layout: "fullscreen" },
};

const proseFrame = (Component, options = {}) =>
  chapterFrame(Component, {
    ...options,
    template:
      options.template ||
      `<div style="max-width:760px;min-height:320px;margin:0 auto;padding:48px 64px;background:rgb(var(--color-paper));font:18px/1.65 var(--font-body);"><StoryComponent v-bind="args" /></div>`,
  });

const imageParagraph = {
  id: "retinal-layers-image",
  img: "blind-spot",
  imgCap:
    "The optic disc contains no photoreceptors, producing a blind spot in each eye's visual field.",
};

const subsectionParagraph = {
  id: "parallel-pathways",
  subSection: [
    {
      id: "on-off-pathways",
      title: "ON and OFF pathways",
      paragraphs: [
        {
          id: "on-off-1",
          text: "ON bipolar cells signal light increments; OFF bipolar cells signal light decrements.",
        },
      ],
    },
  ],
};

const subSubParagraph = {
  id: "ganglion-types",
  subSubSection: [
    {
      id: "midget-pathway",
      title: "Midget pathway",
      text: "Midget ganglion cells support high-acuity and red-green opponent signals near the fovea.",
    },
    {
      id: "parasol-pathway",
      title: "Parasol pathway",
      paragraphs: [
        {
          id: "parasol-1",
          text: "Parasol ganglion cells pool over wider areas and respond strongly to temporal contrast.",
        },
      ],
    },
  ],
};

export const BreakVideo = {
  args: {
    slug: "placeholder",
    title: "How retinal circuits were mapped",
    text: "A short conversation about combining anatomy, physiology, and cell-type markers.",
  },
  render: proseFrame(BreakImagesComponent),
};

export const BreakSectionBlindSpot = {
  args: {
    content: {
      id: "blind-spot-demo",
      title: "Blind spot",
      text: "Close one eye and fixate the opposite marker. At the correct distance, one marker disappears where its image falls on the optic disc.",
      steps: [
        "Close your left eye and fixate A with your right eye.",
        "Move slowly toward the screen until B disappears.",
        "Reverse eyes and repeat.",
      ],
    },
  },
  render: proseFrame(BreakSectionComponent, {
    template: `<div style="min-height:1200px;overflow:hidden;"><StoryComponent v-bind="args" /></div>`,
  }),
};

export const BreakText = {
  args: {
    paragraph: {
      id: "key-idea",
      text: "The retina does not simply relay an image: it computes contrast, colour, and motion before signals reach the brain.",
    },
  },
  render: proseFrame(BreakTextComponent),
};

export const CommentOverlay = {
  render: proseFrame(CommentCompComponent, {
    setup() {
      const comments = useCom();
      const ready = ref(false);
      comments.$patch({
        activeCom: "photoreceptors-1",
        comments: { "photoreceptors-1": "Review dark adaptation." },
      });
      onMounted(() => {
        ready.value = true;
      });
      return { ready };
    },
    template: `<div style="min-height:620px;"><mark id="highlight-photoreceptors-1" style="position:absolute;left:-9999px;">Rods support dim-light vision</mark><StoryComponent v-if="ready" /></div>`,
  }),
};

export const DownloadSection = {
  render: proseFrame(DownloadSectionComponent),
};

export const EditableBlockCreator = {
  args: {
    content:
      "Horizontal cells pool photoreceptor signals to help form antagonistic surrounds.",
    paragraphId: "horizontal-cells-1",
    isCreator: true,
    tag: "p",
  },
  render: proseFrame(EditableBlockComponent),
};

export const EditableBlockReadOnly = {
  args: {
    content:
      "Horizontal cells pool photoreceptor signals to help form antagonistic surrounds.",
    paragraphId: "horizontal-cells-1",
    isCreator: false,
    tag: "p",
  },
  render: proseFrame(EditableBlockComponent),
};

export const ChapterCover = {
  render: proseFrame(EyeStartComponent, {
    template: `<div style="min-height:100vh;"><div id="container"></div><StoryComponent /></div>`,
  }),
};

export const FootnotesList = {
  args: {
    content: {
      title: "Notes",
      notes: [
        {
          number: 1,
          text: "Scotopic vision is mediated primarily by rods and has low spatial acuity.",
        },
        {
          number: 2,
          text: "Photopic vision is cone-mediated and supports colour discrimination.",
        },
      ],
    },
  },
  render: proseFrame(FootNotesComponent),
};

export const FootnotesWindowOpen = {
  render: proseFrame(FootNotesWindowComponent, {
    chapter: {
      ...retinaChapter,
      footNotes: {
        title: "Notes",
        notes: [
          { number: 1, text: "Rods are absent from the centre of the fovea." },
          {
            number: 2,
            text: "The optic disc is the exit point for ganglion-cell axons.",
          },
        ],
      },
    },
    template: `<div style="min-height:620px;padding:48px;"><p>Foveal sampling is cone dominated<sup data-sup="1 2" style="cursor:pointer;color:rgb(var(--color-accent));">1,2</sup>.</p><StoryComponent /></div>`,
  }),
  play: async () => {
    document.querySelector("sup[data-sup]")?.click();
  },
};

export const FurtherReading = {
  args: { content: { title: "Further reading" } },
  render: proseFrame(FurtherReadingComponent),
};

export const HoverImage = {
  render: proseFrame(HoverImgComponent, {
    template: `<div style="min-height:480px;padding:64px;"><button id="alcmeon" class="hoverImg" style="font:20px var(--font-body);text-decoration:underline;">Alcmaeon of Croton</button><StoryComponent /></div>`,
  }),
  play: async () => {
    document
      .querySelector("#alcmeon.hoverImg")
      ?.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
  },
};

export const InlineImageWithCaption = {
  args: { paragraph: imageParagraph },
  render: proseFrame(InlineImagesComponent),
};

export const InlineImageCollapsed = {
  args: { paragraph: { ...imageParagraph, imgClosed: true } },
  render: proseFrame(InlineImagesOpenCloseComponent, {
    template: `<div style="min-height:620px;position:relative;"><StoryComponent v-bind="args" /></div>`,
  }),
};

export const QuizSection = {
  render: proseFrame(QuizSectionComponent),
};

export const Section = {
  args: { section: retinaChapter.sections[0], index: 0, isCreator: false },
  render: proseFrame(SectionCompComponent),
};

export const SectionCreator = {
  args: { section: retinaChapter.sections[0], index: 0, isCreator: true },
  render: proseFrame(SectionCompComponent),
  parameters: { auth: { role: "creator" } },
};

export const SubSection = {
  args: { paragraph: subsectionParagraph, index: 1, isCreator: false },
  render: proseFrame(SubSectionComponent),
};

export const SubSubSection = {
  args: {
    subParagraph: subSubParagraph,
    chapterIndex: 1,
    subIndex: 0,
    isCreator: false,
  },
  render: proseFrame(SubSubSectionComponent),
};
