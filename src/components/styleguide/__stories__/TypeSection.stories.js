/*
 * Foundations/Styleguide/TypeSection — the type page of /styleguide.
 *
 * No props: renders the .t-* role classes at true size from the --type-*
 * tokens in brand.css.
 */
import TypeSection from "../TypeSection.vue";

export default {
  title: "Foundations/Styleguide/TypeSection",
  component: TypeSection,
  tags: ["autodocs"],
  render: () => ({
    components: { TypeSection },
    template: `<TypeSection />`,
  }),
};

export const Default = {};
