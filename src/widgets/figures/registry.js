/*
 * Figure widgets (OPENBRAIN-80): the book's interactive figures rebuilt as
 * self-contained widgets. Each is keyed by the `animations.animation_key` it
 * replaces, so database rows and chapter placements stay as they are; the
 * reader hands a figure to its widget when there is one here.
 *
 * Schemas load eagerly (the chapter page builds its forms from them); the
 * components load when a figure is shown.
 */
import eyeStructureTransition from "./transitions/eye-structure.js";
import retinalCellTypesTransition from "./transitions/retinal-cell-types.js";
import lateralOrganization from "./lateral-organization/schema.js";
import trepanation from "./trepanation/schema.js";
import papyrus from "./papyrus/schema.js";

// All other Retina figures are published uploads, not schema copies.
export const FIGURE_WIDGETS = {
  [lateralOrganization.animationKey]: {
    schema: lateralOrganization,
    load: () => import("./split/SplitFigure.vue"),
  },
  // Section entrance choreography still mounts these on the live Retina,
  // via figureTransitions.js even without a direct paragraph animation_id.
  [eyeStructureTransition.animationKey]: {
    schema: eyeStructureTransition,
    load: () => import("./transitions/TransitionFigure.vue"),
    ground: "paper",
  },
  [retinalCellTypesTransition.animationKey]: {
    schema: retinalCellTypesTransition,
    load: () => import("./transitions/TransitionFigure.vue"),
    ground: "paper",
  },
  // History: the skull and its hands, and case 20's tabs (OPENBRAIN-87).
  [trepanation.animationKey]: {
    schema: trepanation,
    load: () => import("./trepanation/TrepanationMethods.vue"),
  },
  [papyrus.animationKey]: {
    schema: papyrus,
    load: () => import("./papyrus/PapyrusCase.vue"),
  },
};

/** The widget for an animation key, or null. */
export function figureWidgetFor(animationKey) {
  return animationKey &&
    Object.prototype.hasOwnProperty.call(FIGURE_WIDGETS, animationKey)
    ? FIGURE_WIDGETS[animationKey]
    : null;
}
