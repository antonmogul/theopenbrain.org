import ArchivedCollection from "../ArchivedCollection.vue";
import BookCollection from "../BookCollection.vue";
import ColoursSection from "../ColoursSection.vue";
import SharedCollection from "../SharedCollection.vue";
import Specimen from "../Specimen.vue";
import TypeSection from "../TypeSection.vue";

export default { title: "Foundations/Styleguide Collections" };

const renderComponent = (StoryComponent) => ({
  render: () => ({
    components: { StoryComponent },
    template: "<StoryComponent />",
  }),
});

export const Colours = renderComponent(ColoursSection);
export const Type = renderComponent(TypeSection);
export const ReaderComponents = renderComponent(BookCollection);
export const SharedComponents = renderComponent(SharedCollection);
export const ArchivedControls = renderComponent(ArchivedCollection);
export const SpecimenFrame = {
  render: () => ({
    components: { Specimen },
    template:
      '<Specimen name="Neural specimen" import-path="components/example.vue" note="Representative state"><button class="t-label" style="padding:12px 18px">Inspect component</button></Specimen>',
  }),
};
