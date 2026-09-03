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
 */
export const WIDGET_EMBEDS = {
  retinabox: () => import("@/views/RetINaBoxView.vue"),
  "direction-selectivity": () => import("@/views/DirectionSelectivityView.vue"),
  "color-vision": () => import("@/views/ColorVisionView.vue"),
  "v1-camera": () => import("@/views/V1CameraView.vue"),
  "visual-pathway-lesions": () =>
    import("@/views/VisualPathwayLesionsView.vue"),
  sdt: () => import("@/views/SdtWidgetView.vue"),
  "posner-cueing": () => import("@/views/PosnerCueingView.vue"),
  "biased-competition": () => import("@/views/BiasedCompetitionView.vue"),
  "contrast-response-gain": () =>
    import("@/views/ContrastResponseGainView.vue"),
  "tmt-feature-attention": () => import("@/views/TmtFeatureAttentionView.vue"),
};

/** @param {string} widgetId */
export function hasEmbed(widgetId) {
  return Object.prototype.hasOwnProperty.call(WIDGET_EMBEDS, widgetId);
}
