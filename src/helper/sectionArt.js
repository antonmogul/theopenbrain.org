/*
 * Section art (OPENBRAIN-174): one picture per section of a chapter. The
 * opener's contents show it beside the list and switch it as the reader
 * points at a section (OpenerTocArt), and the figure pane shows it as the
 * section's card while the reader crosses into that section (SectionCards).
 *
 * The History pictures are the designers' (Figma Yv7WvZSoabK2t5fNtsChvf,
 * "TOC" 3258:31335, the first row): each is the frame's left half exported
 * whole at twice its size (1440 × 1920), so the chapter's violet is baked
 * into the file, never blended in CSS (as with the breakout images,
 * helper/breakoutTreatment.js). A picture is drawn to be cropped: it fills
 * whatever box it is given.
 *
 * Which section gets which is data, keyed by chapter slug then section slug
 * (the intro's is "introduction"), because section slugs are only unique
 * within a module and titles get edited. A section's own `art` ({ src, alt })
 * wins once sections carry one from the database; nothing is migrated yet.
 * A chapter with no entry here keeps the contents and the pane it had.
 */
const FOUNDATIONS = "/publicAssets/images/foundations/sections";

export const SECTION_ART_BY_SLUG = Object.freeze({
  "foundations-of-neuroscience": Object.freeze({
    introduction: {
      src: `${FOUNDATIONS}/introduction.webp`,
      alt: "A 1519 woodcut of the body's organs, with the brain's cells drawn around it",
    },
    "where-is-my-mind": {
      src: `${FOUNDATIONS}/where-is-my-mind.webp`,
      alt: "An engraving of a skull with a square opening cut into its brow",
    },
    "do-different-parts": {
      src: `${FOUNDATIONS}/do-different-parts.webp`,
      alt: "The surface of a brain exposed during an operation, with numbered tags on it",
    },
    "basic-functional-unit": {
      src: `${FOUNDATIONS}/basic-functional-unit.webp`,
      alt: "A drawing of layers of neurons and their branching fibres",
    },
    "how-neurons-communicate": {
      src: `${FOUNDATIONS}/how-neurons-communicate.webp`,
      alt: "An engraving of a frog's legs wired to an electrical machine on a table",
    },
    "closing-words": {
      src: `${FOUNDATIONS}/closing-words.webp`,
      alt: "A human brain seen from the side",
    },
    references: {
      src: `${FOUNDATIONS}/references.webp`,
      alt: "A stained neuron under the microscope",
    },
  }),
});

/** Sections that never get a card in the pane: the back matter. */
export const NO_SECTION_CARD = Object.freeze([
  "introduction",
  "references",
  "further-reading",
  "footnotes",
]);

const usable = (art) =>
  !!art && typeof art.src === "string" && art.src.trim().length > 0;

/** The chapter's art by section slug, or null when it has none. */
export function sectionArtForChapter(chapterSlug) {
  const map = SECTION_ART_BY_SLUG[chapterSlug];
  return map && Object.keys(map).length ? map : null;
}

/**
 * One section's art, { src, alt }, or null. `section` is anything with a
 * `slug` (an outline entry, a transformed section); its own `art` wins.
 */
export function sectionArtFor(chapterSlug, section) {
  if (usable(section?.art))
    return { src: section.art.src.trim(), alt: section.art.alt || "" };
  const art = SECTION_ART_BY_SLUG[chapterSlug]?.[section?.slug];
  return usable(art) ? art : null;
}

/** Does this section get a card in the figure pane? */
export function hasSectionCard(chapterSlug, section) {
  return (
    !NO_SECTION_CARD.includes(section?.slug) &&
    section?.kind !== "box" &&
    !!sectionArtFor(chapterSlug, section)
  );
}
