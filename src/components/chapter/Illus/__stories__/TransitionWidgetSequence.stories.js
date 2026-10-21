import TransitionWidgetSequence from "../TransitionWidgetSequence.vue";
export default {
  title: "Chapter/Illustrations/TransitionWidgetSequence",
  component: TransitionWidgetSequence,
  parameters: { layout: "fullscreen", api: { widgets: [] } },
  args: {
    transition: { id: "animationRetinalCellTypesTransition" },
    successor: {
      id: "widget-upload:retina-retinal-cell-types",
      widgetId: "upload:retina-retinal-cell-types",
      title: "Retinal cell types",
    },
    active: "animationretinalcelltypestransition",
    progress: 0.7,
  },
  render: (args) => ({
    components: { TransitionWidgetSequence },
    setup: () => ({ args }),
    template:
      '<div style="width: min(100vw, 48rem); height: 90vh"><TransitionWidgetSequence v-bind="args" /></div>',
  }),
};
export const AuthoredZoom = {};
