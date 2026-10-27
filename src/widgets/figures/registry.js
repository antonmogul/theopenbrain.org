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
import onOff from "./on-off/schema.js";
import lateralOrganization from "./lateral-organization/schema.js";
import eyeStructureTransition from "./transitions/eye-structure.js";
import retinalCellTypesTransition from "./transitions/retinal-cell-types.js";
import trepanation from "./trepanation/schema.js";
import papyrus from "./papyrus/schema.js";

const stepThrough = () => import("./step-through/StepThrough.vue");
const switchFigure = () => import("./switch/SwitchFigure.vue");
const transition = () => import("./transitions/TransitionFigure.vue");

// `ground: "paper"` marks a widget drawn on the reader's own ground with
// black ink and black Lottie line art (no plate of its own), so the figure
// pane keeps its paper ground for a chapter that shows it rather than the
// dark surface (helper/figurePane.js, OPENBRAIN-152). Widgets with a plate
// (StepThrough's #333, the split's grey, History's #333) need no mark.
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
  [centerSurround.animationKey]: {
    schema: centerSurround,
    load: switchFigure,
    ground: "paper",
  },
  [directionSelectivity.animationKey]: {
    schema: directionSelectivity,
    load: switchFigure,
    ground: "paper",
  },
  [objectMotion.animationKey]: {
    schema: objectMotion,
    load: switchFigure,
    ground: "paper",
  },
  [rodCone.animationKey]: {
    schema: rodCone,
    load: switchFigure,
    ground: "paper",
  },
  // On the live site; its row and paragraph links come by migration.
  [onOff.animationKey]: { schema: onOff, load: switchFigure, ground: "paper" },
  // The split and the transitions, driven by the reader's scroll (OPENBRAIN-83).
  [lateralOrganization.animationKey]: {
    schema: lateralOrganization,
    load: () => import("./split/SplitFigure.vue"),
  },
  [eyeStructureTransition.animationKey]: {
    schema: eyeStructureTransition,
    load: transition,
    ground: "paper",
  },
  [retinalCellTypesTransition.animationKey]: {
    schema: retinalCellTypesTransition,
    load: transition,
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
