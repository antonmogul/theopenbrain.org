/*
 * ChapterEditor/ChapterDetails — title, subtitle and authors on the chapter
 * block page (OPENBRAIN-70). Save emits only the fields that changed.
 */
import ChapterDetails from "../ChapterDetails.vue";

export default {
  title: "Dashboard/ChapterEditor/ChapterDetails",
  component: ChapterDetails,
  args: {
    module: {
      id: "m1",
      title: "Foundations of Neuroscience",
      description: "Debates that framed our understanding of the brain",
      authors: null,
    },
  },
  argTypes: { onSave: { action: "save" } },
};

/** A chapter without authors yet (History today). */
export const NoAuthors = {};

/** Two authors, as the Retina has. */
export const WithAuthors = {
  args: {
    module: {
      id: "m2",
      title: "The Retina",
      description:
        "An interactive exploration of retinal anatomy, photoreceptors, neural circuits, and visual processing.",
      authors: [
        {
          name: "Arjun Krishnaswamy",
          affiliation: "Department of Physiology, McGill University",
        },
        {
          name: "Stuart Trenholm",
          affiliation: "Montreal Neurological Institute, McGill University",
        },
      ],
    },
  },
};
