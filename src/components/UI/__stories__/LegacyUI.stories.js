import ActionButton from "../ActionButton.vue";
import InteractionButton from "../InteractionButton.vue";
import LegendElement from "../LegendElement.vue";
import OpenCloseButtonLink from "../OpenCloseButtonLink.vue";
import OverlayInfo from "../OverlayInfo.vue";
import PointComp from "../PointComp.vue";
import PointsComp from "../PointsComp.vue";
import SourceElement from "../SourceElement.vue";
import StartEndIcon from "../StartEndIcon.vue";
import StateElement from "../StateElement.vue";
import StateElementBlock from "../StateElementBlock.vue";

export default {
  title: "Foundations/Legacy UI",
  parameters: { layout: "padded" },
};

export const ActionButtonWithHelp = {
  render: () => ({
    components: { ActionButton },
    template: `<ActionButton text="Export notes" help="Download your private highlights and notes as a portable JSON file."/>`,
  }),
};
export const InteractionButtonOpen = {
  render: () => ({
    components: { InteractionButton },
    template: `<div style="padding:24px;background:#111"><InteractionButton target="Menu" text="open"/></div>`,
  }),
};
export const LegendNeuralSignals = {
  render: () => ({
    components: { LegendElement },
    template: `<LegendElement :legend="['photoreceptor','bipolar cell','ganglion cell','special']" icon-praefix="retina"/>`,
  }),
};
export const OpenCloseRouteLink = {
  render: () => ({
    components: { OpenCloseButtonLink },
    template: `<OpenCloseButtonLink target="about" text="About"/>`,
  }),
};
export const OverlayIntroduction = {
  render: () => ({
    components: { OverlayInfo },
    template: `<div style="min-height:640px"><OverlayInfo/></div>`,
  }),
  parameters: { layout: "fullscreen" },
};
export const AnnotationPoint = {
  render: () => ({
    components: { PointComp },
    template: `<div style="position:relative;min-height:160px"><mark id="highlight-neuron-1">Neurons communicate through electrical and chemical signals.</mark><PointComp id="neuron-1"/></div>`,
  }),
};
export const AnnotationPointsLayer = {
  render: () => ({
    components: { PointsComp },
    template: `<div style="position:relative;min-height:180px;border:1px dashed rgb(var(--color-line))"><PointsComp/><p>Annotation points are positioned into this overlay layer.</p></div>`,
  }),
};
export const FigureSource = {
  render: () => ({
    components: { SourceElement },
    template: `<div style="position:relative;min-height:220px;border:1px solid rgb(var(--color-line))"><SourceElement source="Adapted from Trenholm et al., 2021 · CC BY 4.0"/></div>`,
  }),
};
export const AnimationStartEndMarkers = {
  render: () => ({
    components: { StartEndIcon },
    data: () => ({
      start: { animation: { end: false, middel: false } },
      end: { animation: { start: false, middel: false } },
    }),
    template: `<div style="display:flex;gap:40px"><div>Start <StartEndIcon :paragraph="start" art="start"/></div><div>End <StartEndIcon :paragraph="end" art="end"/></div></div>`,
  }),
};
export const StateElementList = {
  render: () => ({
    components: { StateElement },
    data: () => ({
      active: 1,
      states: ["Darkness", "Dim light", "Bright light"],
    }),
    template: `<div style="position:relative;min-height:260px"><StateElement :states="states" :active-state="active" @on-click="active = $event.index"/></div>`,
  }),
};
export const StateElementBlocks = {
  render: () => ({
    components: { StateElementBlock },
    data: () => ({
      active: 0,
      states: ["Rod pathway", "Cone pathway", "Melanopsin pathway"],
    }),
    template: `<div style="max-width:300px"><StateElementBlock :states="states" :active-state="active" @on-click="active = $event.index"/></div>`,
  }),
};
