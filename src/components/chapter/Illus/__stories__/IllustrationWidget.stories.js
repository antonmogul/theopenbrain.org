/*
 * Chapter/Illustrations/IllustrationWidget — an interactive widget as a
 * paragraph's figure in the left panel (OPENBRAIN-70 B5).
 */
import IllustrationWidget from "../IllustrationWidget.vue";

export default {
  title: "Chapter/Illustrations/IllustrationWidget",
  component: IllustrationWidget,
  parameters: { layout: "fullscreen" },
  decorators: [
    () => ({
      template: '<div style="height:720px;width:760px"><story/></div>',
    }),
  ],
  args: {
    animation: {
      id: "widget-phrenology",
      title: "Phrenology — the skull that mapped the mind",
      widgetId: "phrenology",
    },
  },
};

/** History's phrenology skull in the figure panel. */
export const Phrenology = {};

/** A widget with no reader view yet says so instead of rendering nothing. */
export const Unavailable = {
  args: {
    animation: { id: "widget-x", title: "Not ported yet", widgetId: "nope" },
  },
};
