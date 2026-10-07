/*
 * Dashboard/ChapterEditor/WidgetPicker — add an interactive to a chapter, or
 * change a placed one's settings (OPENBRAIN-61). Lists every catalog widget
 * with a Vue embed.
 */
import WidgetPicker from "../WidgetPicker.vue";

export default {
  title: "Dashboard/ChapterEditor/WidgetPicker",
  component: WidgetPicker,
  args: { open: true, chapterSlug: "attention-and-working-memory" },
};

/** Choosing a new widget: the embeddable catalog, searchable. */
export const AddWidget = {};

/** Settings for a widget already in the chapter. */
export const EditSettings = {
  args: {
    initial: {
      type: "widget",
      widgetId: "sdt",
      kind: "breakout",
      title: "Signal Detection Theory",
      blurb: "Drag the criterion, adjust d′, and watch the ROC curve respond.",
      credit: "Arjun Krishnaswamy",
      placementId: "attention-sdt",
      route: "/sdt",
    },
  },
};
