import HistoryFixtureReader from "./HistoryFixtureReader.vue";

export default {
  title: "Chapter/History fixture browser QA",
  component: HistoryFixtureReader,
  parameters: {
    layout: "fullscreen",
    api: { animations: [] },
    docs: {
      description: {
        component:
          "Fixture-only reader-shaped integration coverage. Uses committed source data, real UI components and local artwork. No database, authentication, source-site requests, production content claims or full-chapter completeness claims. The separate browser lane supplies public assets excluded from the regular Storybook build.",
      },
    },
  },
  render: (args) => ({
    components: { HistoryFixtureReader },
    setup: () => ({ args }),
    template: '<HistoryFixtureReader v-bind="args" />',
  }),
};

export const Cabinet = { args: { subject: "case-cabinet" } };
export const Skull2D = { args: { subject: "phrenology" } };
export const Skull3D = { args: { subject: "phrenology-3d" } };
export const Figure6Gallery = { args: { subject: "gallery" } };
