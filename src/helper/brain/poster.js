/*
 * The brain atlas's poster (OPENBRAIN-158): a still of the brain in its
 * resting pose that stands in for the three.js stage.
 *
 * The home page is the atlas now, and the first paint must not wait for
 * three.js (~780 KB) or the model (~700 KB). So the stage opens on a WebP of
 * the brain exactly as the stage first draws it (the tour's t = 0 pose, the
 * book closed), captured from the stage itself by
 * scripts/brain/capture-brain-poster.mjs, and the live brain fades in over
 * it once the model is in. When the stage is never coming, the poster stays:
 * a reader who asked for reduced motion (the cover's choice, see
 * `stillUnderReducedMotion` on BrainAtlas) or a browser without WebGL gets
 * the still and the chapter contents beside it, and downloads neither chunk.
 *
 * Nothing here imports three.js: BrainAtlas decides from this file whether
 * to fetch the stage at all.
 */

export const BRAIN_MODEL_URL = "/publicAssets/models/brain/brain-v1.glb";

const POSTER_DIR = "/publicAssets/images/brain";
/** Square stills, the brain centred, transparent around it. */
export const BRAIN_POSTER = Object.freeze({
  src: `${POSTER_DIR}/brain-poster.webp`,
  srcset: `${POSTER_DIR}/brain-poster.webp 1x, ${POSTER_DIR}/brain-poster@2x.webp 2x`,
  /** CSS pixels of the 1x still's side; the 2x still is twice that. */
  size: 1000,
});

/*
 * How the stage refits the camera on a narrow canvas: below this aspect the
 * camera backs off so the brain still fits the width, up to FIT_MAX times
 * the pose's distance. The poster is captured on a wide stage (fit 1) and
 * shrinks by the same curve, so the still and the first live frame line up.
 */
export const FIT_ASPECT = 1.15;
export const FIT_MAX = 2;
export const FIT_POWER = 0.85;

/** The camera-distance multiplier for a canvas of this aspect (w / h). */
export function fitScaleFor(aspect) {
  if (!(aspect > 0)) return 1;
  return aspect < FIT_ASPECT
    ? Math.min(FIT_MAX, Math.pow(FIT_ASPECT / aspect, FIT_POWER))
    : 1;
}

/**
 * The poster's height as a share of the stage's, for a stage of this aspect.
 * Backing the camera off by `fit` shrinks the brain by close to 1 / fit (the
 * silhouette of something ~35 units across seen from ~120 is near enough
 * linear in distance; the difference is under 2 % at the narrowest stage).
 */
export function posterScale(aspect) {
  return 1 / fitScaleFor(aspect);
}

/*
 * The context attributes brainStage.js asks for. The probe below uses the
 * same ones on the same canvas, so when it succeeds the stage receives that
 * very context (a canvas keeps its first context; later attributes are
 * ignored), and when it fails three.js is never fetched. A test holds the
 * stage's literal equal to this.
 */
export const STAGE_CONTEXT_ATTRS = Object.freeze({
  antialias: true,
  alpha: true,
});

/**
 * Why the stage should not be loaded, or null to go ahead.
 *   "motion" — the reader asked for reduced motion and the atlas is set to
 *              hold still then (the home cover);
 *   "webgl"  — the canvas has no WebGL2 context, which the stage would also
 *              find, after downloading three.js to say so.
 */
export function stageBlocker({
  reducedMotion = false,
  stillUnderReducedMotion = false,
  canvas = null,
} = {}) {
  if (reducedMotion && stillUnderReducedMotion) return "motion";
  if (!canvas?.getContext?.("webgl2", STAGE_CONTEXT_ATTRS)) return "webgl";
  return null;
}
