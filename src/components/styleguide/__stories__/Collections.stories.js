import ArchivedCollection from "../ArchivedCollection.vue";
import BookCollection from "../BookCollection.vue";
import ColoursSection from "../ColoursSection.vue";
import SharedCollection from "../SharedCollection.vue";
import Specimen from "../Specimen.vue";
import TypeSection from "../TypeSection.vue";

export default { title: "Foundations/Styleguide Collections" };
export const Colours = { component: ColoursSection };
export const Type = { component: TypeSection };
export const ReaderComponents = { component: BookCollection };
export const SharedComponents = { component: SharedCollection };
export const ArchivedControls = { component: ArchivedCollection };
export const SpecimenFrame = {
  render: () => ({
    components: { Specimen },
    template:
      '<Specimen name="Neural specimen" import-path="components/example.vue" note="Representative state"><button class="t-label" style="padding:12px 18px">Inspect component</button></Specimen>',
  }),
};
