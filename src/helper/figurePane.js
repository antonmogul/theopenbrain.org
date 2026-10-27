/*
 * The figure pane's ground (OPENBRAIN-152).
 *
 * The History redesign (Figma Yv7WvZSoabK2t5fNtsChvf, "Latest Version",
 * 2733:58923) puts the reader's figure pane on the chapter's dark surface:
 * the artwork sits on --color-dark-surface, its "FIG 05" label in
 * --color-warn, and the text column stays paper. It applies to every
 * chapter, not just History (Anton, 27 Oct).
 *
 * The 2023 Retina figures can't take it yet: they are Lottie line art drawn
 * for the paper page (black strokes on nothing: 706 strokes and 590 fills in
 * rgb(0,0,0) across the 39 files under publicAssets/animations, white in 14
 * of them, so a blanket black-to-white swap would wreck ON & OFF's dark
 * field), their state icons are black SVGs, and two figure-widget families
 * sit "on the reader's own ground" with black ink (SwitchFigure,
 * TransitionFigure). On #1c1c1c that art vanishes. So a chapter that still
 * triggers any of it keeps the paper pane it was drawn for, decided from the
 * chapter's own triggers rather than a slug list: the day its art is redrawn
 * (as the Figma did for the papyrus, OB_Fig4_2_white) the pane goes dark on
 * its own. One ground per chapter, never per figure, so the pane doesn't
 * flicker between plates as the reader scrolls.
 *
 * Pure functions, mirroring the renderer choice in IllustrationsComp.
 */
import { usesFigureShell } from "./figureCycle";
import { figureWidgetFor } from "@/widgets/figures/registry";

/**
 * What a figure asks of the pane: "paper" when its art was drawn for the
 * paper page, "dark" when it sits on the dark surface (the figure shell's
 * images, galleries and placeholders, widgets with a plate of their own) or
 * makes no demand at all (a full-screen figure draws in the text column).
 */
export function figureGround(record) {
  if (!record || record.fullscreen) return "dark";
  const widget = figureWidgetFor(record.id);
  if (widget) return widget.ground === "paper" ? "paper" : "dark";
  if (usesFigureShell(record)) return "dark";
  // IllustrationWidget: an embed on a plate of its own (uploaded widgets
  // bring their --ob-plate tokens).
  if (record.widgetId) return "dark";
  // The 2023 Lottie renderers (Illustration, IllustrationOnScroll,
  // IllustrationTransition).
  return "paper";
}

/** The pane's ground for the figures a chapter triggers (records that
 *  matched no trigger are skipped). */
export function figurePaneGround(records = []) {
  return records.some((record) => record && figureGround(record) === "paper")
    ? "paper"
    : "dark";
}
