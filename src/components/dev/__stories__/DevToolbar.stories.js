import DevToolbar from "../DevToolbar.vue";

export default {
  title: "Dashboard/Developer/DevToolbar",
  component: DevToolbar,
  parameters: { layout: "fullscreen" },
};

export const RoleOverride = {
  render: () => ({
    components: { DevToolbar },
    template: `<div style="min-height:180px"><DevToolbar/></div>`,
  }),
};
