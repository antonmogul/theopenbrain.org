/*
 * Foundations/Styleguide/SharedCollection — the design-system library page
 * of /styleguide: every dashboard/shared primitive in a Specimen.
 *
 * No props. Modal and confirm dialog are button-triggered, not open by
 * default, so they don't cover the page.
 */
import SharedCollection from "../SharedCollection.vue";

export default {
  title: "Foundations/Styleguide/SharedCollection",
  component: SharedCollection,
  tags: ["autodocs"],
  render: () => ({
    components: { SharedCollection },
    template: `<SharedCollection />`,
  }),
};

export const Default = {};
