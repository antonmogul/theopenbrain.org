// Published replacement figures retain their original authored entrance.
// The widget migration changed the figure key and removed its scroll flag;
// these Lottie assets remain the source of the eye/retina zoom choreography.
export const FIGURE_TRANSITIONS = {
  "widget-upload:retina-retinal-cell-types":
    "animationRetinalCellTypesTransition",
};

export function sectionTransitionId(section) {
  const figure = section?.paragraphs?.[0]?.animation;
  const id = figure?.id || (figure?.name ? `animation${figure.name}` : null);
  return (
    FIGURE_TRANSITIONS[id] ||
    (figure?.transition && id ? `${id}Transition` : null)
  );
}
