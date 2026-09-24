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
import pupillaryReflex from "./pupillary-reflex/schema.js";
import phototransduction from "./phototransduction/schema.js";
import visualCycle from "./visual-cycle/schema.js";
import centerSurround from "./center-surround/schema.js";
import directionSelectivity from "./direction-selectivity/schema.js";
import objectMotion from "./object-motion/schema.js";
import rodCone from "./rod-cone/schema.js";
import lateralOrganization from "./lateral-organization/schema.js";
import eyeStructureTransition from "./transitions/eye-structure.js";
import retinalCellTypesTransition from "./transitions/retinal-cell-types.js";

const stepThrough = () => import("./step-through/StepThrough.vue");
const switchFigure = () => import("./switch/SwitchFigure.vue");
const transition = () => import("./transitions/TransitionFigure.vue");

export const FIGURE_WIDGETS = {
  [refractionErrors.animationKey]: {
    schema: refractionErrors,
    load: () => import("./refraction-errors/RefractionErrors.vue"),
  },
  // Three figures, one component (OPENBRAIN-81).
  [pupillaryReflex.animationKey]: {
    schema: pupillaryReflex,
    load: stepThrough,
  },
  [phototransduction.animationKey]: {
    schema: phototransduction,
    load: stepThrough,
  },
  [visualCycle.animationKey]: { schema: visualCycle, load: stepThrough },
  // Four panel figures, one component (OPENBRAIN-82).
  [centerSurround.animationKey]: { schema: centerSurround, load: switchFigure },
  [directionSelectivity.animationKey]: {
    schema: directionSelectivity,
    load: switchFigure,
  },
  [objectMotion.animationKey]: { schema: objectMotion, load: switchFigure },
  [rodCone.animationKey]: { schema: rodCone, load: switchFigure },
  // The split and the transitions, driven by the reader's scroll (OPENBRAIN-83).
  [lateralOrganization.animationKey]: {
    schema: lateralOrganization,
    load: () => import("./split/SplitFigure.vue"),
  },
  [eyeStructureTransition.animationKey]: {
    schema: eyeStructureTransition,
    load: transition,
  },
  [retinalCellTypesTransition.animationKey]: {
    schema: retinalCellTypesTransition,
    load: transition,
  },
};

/** The widget for an animation key, or null. */
export function figureWidgetFor(animationKey) {
  return animationKey &&
    Object.prototype.hasOwnProperty.call(FIGURE_WIDGETS, animationKey)
    ? FIGURE_WIDGETS[animationKey]
    : null;
}
