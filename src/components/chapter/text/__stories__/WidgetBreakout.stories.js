import WidgetBreakoutComponent from "../WidgetBreakout.vue";
import { chapterFrame } from "../../__stories__/chapterFixtures";

export default {
  title: "Chapter/Text/WidgetBreakout",
  parameters: { layout: "fullscreen" },
};

/* The prose column at roughly its 1440px width, on the reader's background. */
const proseFrame = (Component) =>
  chapterFrame(Component, {
    template: `
      <div style="padding:40px 24px;background:rgb(var(--color-bg));min-height:480px;">
        <div style="max-width:640px;margin:0 auto;font-family:var(--font-body);color:rgb(var(--color-ink));">
          <p style="line-height:1.6;margin:0 0 1rem;">One of the first written accounts of color blindness comes from John Dalton – of atomic theory fame – at the end of the 18th century, describing his own inability to tell certain colours apart.</p>
          <StoryComponent v-bind="args" />
          <p style="line-height:1.6;margin:1rem 0 0;">Object motion sensitivity: An important task of the visual system is to separate object from background.</p>
        </div>
      </div>`,
  });

export const BreakoutCard = {
  args: {
    placement: {
      placementId: "retina-color-vision",
      widgetId: "color-vision",
      kind: "breakout",
      title: "Colour vision starts in the retina",
      blurb:
        "Work from the electromagnetic spectrum down to cone opponency: how three pigment classes, and their overlap, become the colours we see.",
      credit: "Interactive by Stuart Trenholm",
      route: "/color-vision",
    },
  },
  render: proseFrame(WidgetBreakoutComponent),
};

export const InlineStage = {
  args: {
    placement: {
      placementId: "retina-retinabox",
      widgetId: "retinabox",
      kind: "inline",
      title: "RetINaBox — build a retinal circuit",
      blurb:
        "Wire photoreceptors, bipolar and ganglion cells yourself and watch how the circuit turns a light stimulus into spikes.",
      credit: "Interactive by Stuart Trenholm",
      route: "/retinabox",
    },
  },
  render: proseFrame(WidgetBreakoutComponent),
};

export const UnavailableWidget = {
  args: {
    placement: {
      placementId: "future-widget",
      widgetId: "not-ported-yet",
      kind: "inline",
      title: "Normalization model of attention",
      blurb: "Held back at the author's request while the model is revised.",
      credit: "Arjun Krishnaswamy",
      route: "",
    },
  },
  render: proseFrame(WidgetBreakoutComponent),
};
