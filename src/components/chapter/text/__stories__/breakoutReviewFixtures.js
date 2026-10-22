import { transformParagraph } from "@/composables/chapterTransform.mjs";
import history from "@/views/__stories__/historyFullReaderData.json";

// Review composition matches the existing 20261021010000 migration, while
// preserving the committed prose and artwork. No network or authoring writes.
const card = (sectionSlug, index, title, image, alt, legend) => {
  const row = history.paragraphs.filter(
    (p) => p.section_id === `history-section-${sectionSlug}`
  )[index];
  return {
    ...transformParagraph(row),
    explore: {
      title,
      prompt: `Explore more about ${title}`,
      image: { src: `/publicAssets/images/foundations/${image}`, alt },
      legend,
    },
  };
};
export const hippocratesPair = {
  id: "review-sacred-disease",
  kind: "box",
  title: "Hippocrates: the sacred disease and the four humours",
  paragraphs: [
    card(
      "box-sacred-disease",
      0,
      "Hippocrates’ view on epilepsy",
      "narrative/hippocrates-bust.jpg",
      "Marble bust of Hippocrates in profile.",
      "Bust of Hippocrates from the British Museum. Source: The Wellcome Collection."
    ),
    card(
      "box-humoral-theory",
      0,
      "Humoral theory",
      "thurneysser-four-humours-1574.jpg",
      "The four humours with their elements and zodiac signs.",
      "Woodcut in Quinta Essentia by Leonhart Thurneysser (1574). Credit: Wikimedia Commons."
    ),
  ],
};
export const comparativePair = {
  id: "review-rete-mirabile",
  kind: "box",
  title:
    "Failures in comparative neuroanatomy: The rete mirabile and hippocampus minor",
  paragraphs: [
    card(
      "box-rete-mirabile",
      0,
      "The rete mirabile",
      "figc-01.jpg",
      "Galen’s physiology, with the rete mirabile at the base of the brain.",
      "Galen’s physiology (Singer, 1925). Source: Wellcome Collection."
    ),
    card(
      "box-rete-mirabile",
      1,
      "The hippocampus minor",
      "figd-01.jpg",
      "Human and chimpanzee brains, the hippocampus minor marked x in both.",
      "Human and chimpanzee brains (Huxley, 1863)."
    ),
  ],
};
