/*
 * What FigureWidget provides to the widget it hosts: a ref that is true
 * when the widget is sized to its content (the host's `fit`: inline in the
 * text column, below the two-column reader) rather than filling the pane.
 * A widget's toolbar row reads it to know that opening its legend moves
 * the page (shared/FigureBar.vue).
 */
export const FIGURE_WIDGET_FIT = Symbol("figureWidgetFit");
