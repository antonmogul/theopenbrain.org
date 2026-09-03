/*
 * Legacy/OpenCloseButtonLink — route toggle from the 2023 menu.
 *
 * Renders a RouterLink to `/<target>` unless the current route already is the
 * target, in which case it becomes a "go back" click. The placeholder labels
 * (o1 / o2) are the component's own.
 */
import OpenCloseButtonLink from "../OpenCloseButtonLink.vue";

export default {
  title: "Legacy/OpenCloseButtonLink",
  component: OpenCloseButtonLink,
  tags: ["autodocs"],
  argTypes: {
    target: { control: "text", description: "Route name and path segment." },
    text: { control: "text", description: "Accepted but unused." },
    pos: { control: "text", description: "Accepted but unused." },
  },
  args: { target: "about", text: "About", pos: "" },
  render: (args) => ({
    components: { OpenCloseButtonLink },
    setup: () => ({ args }),
    template: `<OpenCloseButtonLink v-bind="args" />`,
  }),
};

export const RouteLink = {};
