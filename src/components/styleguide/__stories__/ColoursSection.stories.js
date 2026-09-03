/*
 * Foundations/Styleguide/ColoursSection — the colour page of /styleguide.
 *
 * No props: swatches read the --color-* custom properties live from
 * brand.css, so the Accent toolbar changes what this renders.
 */
import ColoursSection from "../ColoursSection.vue";

export default {
  title: "Foundations/Styleguide/ColoursSection",
  component: ColoursSection,
  tags: ["autodocs"],
  render: () => ({
    components: { ColoursSection },
    template: `<ColoursSection />`,
  }),
};

export const Default = {};
