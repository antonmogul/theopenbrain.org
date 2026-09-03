/*
 * Foundations/Styleguide/BookCollection — the reader-area components page of
 * /styleguide: reader atoms plus the quiz, flashcard, lab and AI-tutor
 * feature components, each in a Specimen with representative props.
 *
 * No props. The individual components have their own Student/* stories; this
 * is the side-by-side view.
 */
import BookCollection from "../BookCollection.vue";

export default {
  title: "Foundations/Styleguide/BookCollection",
  component: BookCollection,
  tags: ["autodocs"],
  render: () => ({
    components: { BookCollection },
    template: `<BookCollection />`,
  }),
};

export const Default = {};
