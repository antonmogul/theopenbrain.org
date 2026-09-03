/*
 * Foundations/Styleguide/ArchivedCollection — retired controls (theme, font
 * pair, accent) kept on /styleguide as a record and to make revival easy.
 *
 * No props. The pickers are live: clicking one changes the data-* attribute
 * on <html> and so the Storybook canvas, until the next story loads.
 */
import ArchivedCollection from "../ArchivedCollection.vue";

export default {
  title: "Foundations/Styleguide/ArchivedCollection",
  component: ArchivedCollection,
  tags: ["autodocs"],
  render: () => ({
    components: { ArchivedCollection },
    template: `<ArchivedCollection />`,
  }),
};

export const Default = {};
