import animationData from "@/assets/json_backend/animations.json";
import FullScreenIllustrationComponent from "../FullScreenIllustration.vue";
import FullScreenIllustrationLoopComponent from "../FullScreenIllustrationLoop.vue";
import FullScreenIllustrationMultipleComponent from "../FullScreenIllustrationMultiple.vue";
import FullScreenIllustrationSplitComponent from "../FullScreenIllustrationSplit.vue";
import IllustarionMultipleComponent from "../IllustarionMultiple.vue";
import IllustrationCompComponent from "../IllustrationComp.vue";
import IllustrationFlipComponent from "../IllustrationFlip.vue";
import IllustrationInlineComponent from "../IllustrationInline.vue";
import IllustrationOnScrollComponent from "../IllustrationOnScroll.vue";
import IllustrationPlaceholderComponent from "../IllustrationPlaceholder.vue";
import IllustrationSwitchComponent from "../IllustrationSwitch.vue";
import IllustrationTransitionComponent from "../IllustrationTransition.vue";
import IllustrationsCompComponent from "../IllustrationsComp.vue";
import TextOverlayComponent from "../TextOverlay.vue";
import { chapterFrame } from "../../__stories__/chapterFixtures";

const animations = animationData.animations;
const byId = (id) => animations.find((animation) => animation.id === id);
const eye = byId("animationEyeStructur");
const phototransduction = byId("animationPhototransduction");
const impairedVision = byId("animationImpairedVision");
const centreSurround = byId("animationCenterSurroundReceptiveFields");
const transition = byId("animationEyeStructurTransition");
const scrollFigure = byId("animationLateralOrganization");

const illustrationFrame = (Component, template) =>
  chapterFrame(Component, {
    template:
      template ||
      `<div style="position:relative;min-height:720px;overflow:hidden;background:rgb(var(--color-bg));"><StoryComponent v-bind="args" /></div>`,
  });

export default {
  title: "Chapter/Illustrations/ComponentCatalog",
  parameters: { layout: "fullscreen", api: { animations: [] } },
};

export const PlaceholderManuscript = {
  args: {
    animation: {
      id: "edwin-smith-papyrus",
      placeholder: true,
      figureNumber: 3,
      diagramType: "manuscript",
      title: "The Edwin Smith surgical papyrus",
      caption: "An early written account linking brain injury to behaviour.",
      note: "Source a public-domain plate with a readable column detail.",
    },
  },
  render: illustrationFrame(IllustrationPlaceholderComponent),
};

export const PlaceholderLongCaption = {
  args: {
    animation: {
      id: "retinal-layers",
      placeholder: true,
      figureNumber: 12,
      diagramType: "diagram",
      title: "Cellular layers of the mammalian retina",
      caption:
        "A cross-section locating photoreceptor outer segments, horizontal and bipolar cells, amacrine cells, and the ganglion-cell output layer.",
    },
  },
  render: illustrationFrame(IllustrationPlaceholderComponent),
};

export const InlineEyeStructure = {
  args: { animationId: eye.id },
  render: illustrationFrame(IllustrationInlineComponent),
};

export const IllustrationCompEyeStructure = {
  args: { animation: eye, activeAnimation: eye.id.toLowerCase() },
  render: illustrationFrame(IllustrationCompComponent),
};

export const IllustrationCompMobile = {
  args: {
    animation: eye,
    activeAnimation: eye.id.toLowerCase(),
    scopeId: "storybook-eye-mobile",
  },
  render: illustrationFrame(IllustrationCompComponent),
  parameters: { viewport: { defaultViewport: "mobile1" } },
};

export const SwitchCentreSurround = {
  args: {
    info: centreSurround,
    isPaused: false,
    scopeId: "storybook-centre-surround",
  },
  render: illustrationFrame(IllustrationSwitchComponent),
};

export const ScrollLinkedLateralOrganization = {
  args: {
    animation: scrollFigure,
    activeAnimation: scrollFigure.id.toLowerCase(),
    progress: 0.56,
    scopeId: "storybook-scroll-figure",
  },
  render: illustrationFrame(IllustrationOnScrollComponent),
};

export const TransitionEyeStructure = {
  args: {
    animation: transition,
    activeAnimation: transition.id.toLowerCase(),
    progress: 0.48,
  },
  render: illustrationFrame(IllustrationTransitionComponent),
};

export const FlipCardVision = {
  args: {
    animation: {
      ...impairedVision,
      video: "myopia",
      title: "How myopia changes retinal focus",
      infoText:
        "In an elongated eye, parallel rays focus in front of the retina rather than on the photoreceptor layer.",
    },
  },
  render: illustrationFrame(IllustrationFlipComponent),
};

export const MultipleStateMount = {
  args: { animation: eye, state: "Lens" },
  render: illustrationFrame(IllustarionMultipleComponent),
};

export const FullScreenMultipleState = {
  args: { animation: impairedVision, state: impairedVision.states[1] },
  render: illustrationFrame(FullScreenIllustrationMultipleComponent),
};

export const FullScreenPhototransduction = {
  args: {
    paragraph: { animationId: phototransduction.id, scroll: false },
  },
  render: illustrationFrame(FullScreenIllustrationComponent),
};

export const FullScreenLoop = {
  args: { animation: phototransduction, state: phototransduction.states[0] },
  render: illustrationFrame(FullScreenIllustrationLoopComponent),
};

export const FullScreenSplit = {
  args: {
    animation: {
      ...scrollFigure,
      title: "Lateral organization across retinal layers",
      sources: ["Masland, 2012"],
    },
    container: null,
  },
  render: illustrationFrame(FullScreenIllustrationSplitComponent),
};

export const TextOverlayOpen = {
  args: {
    animation: {
      ...impairedVision,
      infoText:
        "Optical blur can originate before neural processing begins. Compare emmetropia, myopia, hyperopia, and astigmatism as changes in where rays converge relative to the retina.",
    },
    infoIsOpen: true,
  },
  render: illustrationFrame(TextOverlayComponent),
};

export const IllustrationOrchestratorEmptyCanvas = {
  render: illustrationFrame(
    IllustrationsCompComponent,
    `<div id="bgGradient" style="position:relative;min-height:900px;overflow:hidden;background:rgb(var(--color-bg));"><div id="container"><StoryComponent /></div></div>`
  ),
};
