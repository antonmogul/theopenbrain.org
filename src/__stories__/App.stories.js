import App from "../App.vue";

export default {
  title: "Foundations/Application Shell",
  component: App,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "The production application frame mounted with Storybook's memory router, deterministic Pinia store and network-safe API fixtures.",
      },
    },
  },
};

export const EmptyRoute = {
  render: () => ({
    components: { App },
    template: '<div class="min-h-screen bg-bg"><App /></div>',
  }),
};
