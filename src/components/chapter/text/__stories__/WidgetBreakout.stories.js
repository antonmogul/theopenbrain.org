import WidgetBreakoutComponent from "../WidgetBreakout.vue";
import { chapterFrame } from "../../__stories__/chapterFixtures";
import { STAGE_LAYER_ID } from "@/helper/stageLayer";

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

/*
 * The reader's geometry around an inline stage (OPENBRAIN-37): a right-pinned
 * prose column that clips its horizontal overflow, a full-width stage layer
 * beside it, and the card inside the column. At ≥1300px the stage teleports
 * into the layer and spans the frame; below that it stays in the column.
 * Resize the canvas across 1300px to watch it move.
 */
const readerFrame = (Component) =>
  chapterFrame(Component, {
    template: `
      <div style="position:relative;min-height:640px;background:rgb(var(--color-bg));">
        <div style="position:absolute;inset:0 auto 0 0;width:calc(100% - var(--reader-prose-w));display:grid;place-items:center;font-family:var(--font-mono);font-size:12px;color:rgb(var(--color-mute));">
          figure pane
        </div>
        <div id="${STAGE_LAYER_ID}" style="position:absolute;top:0;left:0;width:100%;height:0;overflow:visible;pointer-events:none;z-index:45;"></div>
        <div style="position:relative;margin-left:calc(100% - var(--reader-prose-w));width:var(--reader-prose-w);overflow-x:clip;padding:40px 3.75rem 40px 3.125rem;border-left:1px solid rgb(var(--color-ink));background:rgb(var(--color-paper));font-family:var(--font-body);color:rgb(var(--color-ink));">
          <p style="line-height:1.6;margin:0 0 1rem;">Amacrine cells shape the timing and selectivity of ganglion-cell responses; the circuit below lets you wire one yourself.</p>
          <StoryComponent v-bind="args" />
          <p style="line-height:1.6;margin:1rem 0 0;">Rod and cone pathways: the two photoreceptor classes feed the inner retina through distinct bipolar cells.</p>
        </div>
      </div>`,
  });

export const InlineStageFullBleed = {
  args: InlineStage.args,
  render: readerFrame(WidgetBreakoutComponent),
};

/* Attention (OPENBRAIN-34). Placed inline since OPENBRAIN-37; this is the
   card as it looks in the modal-only breakout form for comparison. */
export const AttentionBreakout = {
  args: {
    placement: {
      placementId: "attention-posner-cueing",
      widgetId: "posner-cueing",
      kind: "breakout",
      title: "Run the Posner cueing task",
      blurb:
        "Valid, invalid and neutral cues, your own reaction times: see why a cue at the target's location speeds detection and an invalid one slows it.",
      credit: "Interactive by Arjun Krishnaswamy",
      route: "/posner-cueing",
    },
  },
  render: proseFrame(WidgetBreakoutComponent),
};

/* Foundations (OPENBRAIN-35): an in-house prototype, no author HTML. */
export const FoundationsBreakout = {
  args: {
    placement: {
      placementId: "foundations-case-cabinet",
      widgetId: "case-cabinet",
      kind: "breakout",
      title: "Case cabinet — patients who taught us where the mind lives",
      blurb:
        "Open the folders of R.W., H.M., S.B. and P.G.: four clinical cases, each a lesion or a surgery that revealed what a region of the brain does.",
      credit: "Interactive by The Open Brain",
      route: "/case-cabinet",
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
