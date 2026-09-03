import ViewStoryShell from "@/stories/ViewStoryShell.vue";
import BiasedCompetitionView from "../BiasedCompetitionView.vue";
import CaseCabinetView from "../CaseCabinetView.vue";
import ColorVisionView from "../ColorVisionView.vue";
import ContrastResponseGainView from "../ContrastResponseGainView.vue";
import DirectionSelectivityView from "../DirectionSelectivityView.vue";
import Phrenology3DView from "../Phrenology3DView.vue";
import PhrenologyView from "../PhrenologyView.vue";
import PosnerCueingView from "../PosnerCueingView.vue";
import PythonPlaygroundView from "../PythonPlaygroundView.vue";
import RetINaBoxView from "../RetINaBoxView.vue";
import SdtWidgetView from "../SdtWidgetView.vue";
import TmtFeatureAttentionView from "../TmtFeatureAttentionView.vue";
import V1CameraView from "../V1CameraView.vue";
import VisualPathwayLesionsView from "../VisualPathwayLesionsView.vue";
import WidgetLibraryView from "../WidgetLibraryView.vue";

const viewStory = (View, label, path) => ({
  render: () => ({
    components: { View, ViewStoryShell },
    data: () => ({ label, path }),
    template:
      '<ViewStoryShell :label="label" :path="path"><View /></ViewStoryShell>',
  }),
});

export default {
  title: "Widgets/Full-page Views",
  parameters: { layout: "fullscreen" },
};
export const BiasedCompetition = viewStory(
  BiasedCompetitionView,
  "BiasedCompetitionView",
  "/biased-competition"
);
export const CaseCabinet = viewStory(
  CaseCabinetView,
  "CaseCabinetView",
  "/case-cabinet"
);
export const ColorVision = viewStory(
  ColorVisionView,
  "ColorVisionView",
  "/color-vision"
);
export const ContrastResponseGain = viewStory(
  ContrastResponseGainView,
  "ContrastResponseGainView",
  "/contrast-response"
);
export const DirectionSelectivity = viewStory(
  DirectionSelectivityView,
  "DirectionSelectivityView",
  "/direction-selectivity"
);
export const Phrenology3D = viewStory(
  Phrenology3DView,
  "Phrenology3DView",
  "/phrenology-3d"
);
export const Phrenology = viewStory(
  PhrenologyView,
  "PhrenologyView",
  "/phrenology"
);
export const PosnerCueing = viewStory(
  PosnerCueingView,
  "PosnerCueingView",
  "/posner-cueing"
);
export const PythonPlayground = viewStory(
  PythonPlaygroundView,
  "PythonPlaygroundView",
  "/playground"
);
export const RetINaBox = viewStory(
  RetINaBoxView,
  "RetINaBoxView",
  "/retinabox"
);
export const SignalDetection = viewStory(
  SdtWidgetView,
  "SdtWidgetView",
  "/sdt"
);
export const FeatureAttention = viewStory(
  TmtFeatureAttentionView,
  "TmtFeatureAttentionView",
  "/feature-attention"
);
export const V1Camera = viewStory(V1CameraView, "V1CameraView", "/v1-camera");
export const VisualPathwayLesions = viewStory(
  VisualPathwayLesionsView,
  "VisualPathwayLesionsView",
  "/visual-pathway"
);
export const WidgetLibrary = viewStory(
  WidgetLibraryView,
  "WidgetLibraryView",
  "/widgets"
);
