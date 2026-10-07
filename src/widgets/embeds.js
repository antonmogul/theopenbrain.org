/*
 * Widget embeds — lazy loaders for the Vue widget views, keyed by widget id.
 *
 * Kept separate from catalog.js on purpose: the catalog imports every
 * author's original HTML as a raw string for the /widgets gallery, and the
 * chapter reader must not pay for that. This map is the only thing the
 * reader pulls in; each view stays in its own route-level chunk and is
 * fetched when a breakout is opened or an inline stage scrolls into view.
 *
 * Ids match src/widgets/catalog.js. Add an entry here when a widget gains a
 * Vue port and should be embeddable inside a chapter.
 *
 * Widgets the authors upload (OPENBRAIN-105) need no entry: an id
 * "upload:<slug>" loads the uploaded file into a sandboxed frame
 * (src/widgets/uploaded/). Use embedLoader(id) rather than the map.
 */
import { h } from "vue";

const UPLOAD_PREFIX = "upload:";

export const WIDGET_EMBEDS = {
  retinabox: () => import("@/views/RetINaBoxView.vue"),
  "direction-selectivity": () => import("@/views/DirectionSelectivityView.vue"),
  "color-vision": () => import("@/views/ColorVisionView.vue"),
  "v1-camera": () => import("@/views/V1CameraView.vue"),
  "visual-pathway-lesions": () =>
    import("@/views/VisualPathwayLesionsView.vue"),
  sdt: () => import("@/views/SdtWidgetView.vue"),
  "posner-cueing": () => import("@/views/PosnerCueingView.vue"),
  "psychometric-function": () => import("@/views/PsychometricFunctionView.vue"),
  "biased-competition": () => import("@/views/BiasedCompetitionView.vue"),
  "contrast-response-gain": () =>
    import("@/views/ContrastResponseGainView.vue"),
  "tmt-feature-attention": () => import("@/views/TmtFeatureAttentionView.vue"),
  "corbetta-pet-attention": () => import("@/views/CorbettaPetView.vue"),
  "hillyard-attention-erp": () => import("@/views/HillyardErpView.vue"),
  "normalization-model": () => import("@/views/NormalizationModelView.vue"),
  // Foundations (History) prototypes — OPENBRAIN-35
  "case-cabinet": () => import("@/views/CaseCabinetView.vue"),
  phrenology: () => import("@/views/PhrenologyView.vue"),
};

function uploadSlugOf(widgetId) {
  return typeof widgetId === "string" &&
    widgetId.startsWith(UPLOAD_PREFIX) &&
    widgetId.length > UPLOAD_PREFIX.length
    ? widgetId.slice(UPLOAD_PREFIX.length)
    : null;
}

/** @param {string} widgetId */
export function hasEmbed(widgetId) {
  return (
    !!uploadSlugOf(widgetId) ||
    Object.prototype.hasOwnProperty.call(WIDGET_EMBEDS, widgetId)
  );
}

/** The lazy loader for a widget id (a built-in view or an upload), or null. */
export function embedLoader(widgetId) {
  const slug = uploadSlugOf(widgetId);
  if (slug)
    return () =>
      import("@/widgets/uploaded/UploadedWidgetEmbed.vue").then((m) => ({
        name: "UploadedWidget",
        render: () => h(m.default, { slug }),
      }));
  return Object.prototype.hasOwnProperty.call(WIDGET_EMBEDS, widgetId)
    ? WIDGET_EMBEDS[widgetId]
    : null;
}
