/*
 * Figure widgets (OPENBRAIN-80): the book's interactive figures rebuilt as
 * self-contained widgets. Each is keyed by the `animations.animation_key` it
 * replaces, so database rows and chapter placements stay as they are; the
 * reader hands a figure to its widget when there is one here.
 *
 * Schemas load eagerly (the chapter page builds its forms from them); the
 * components load when a figure is shown.
 */
import refractionErrors from "./refraction-errors/schema.js";

export const FIGURE_WIDGETS = {
  [refractionErrors.animationKey]: {
    schema: refractionErrors,
    load: () => import("./refraction-errors/RefractionErrors.vue"),
  },
};

/** The widget for an animation key, or null. */
export function figureWidgetFor(animationKey) {
  return animationKey && Object.hasOwn(FIGURE_WIDGETS, animationKey)
    ? FIGURE_WIDGETS[animationKey]
    : null;
}
