/** Display-only repairs requested for the appendix on 22 October 2026.
 * Canonical quotations, captions, scans and hashes stay in the source record.
 * A joined paragraph retains each contributing Word block for provenance. */
const PARAGRAPH_JOINS = {
  12: [[583, 584]],
  24: [[788, 789, 790]],
};

export function presentFaculty(faculty) {
  const joins = PARAGRAPH_JOINS[faculty.n] || [];
  const quotes = [];
  for (const quote of faculty.quotes) {
    const group = joins.find((blocks) => blocks.includes(quote.sourceBlock));
    if (group && group[0] !== quote.sourceBlock) continue;
    const parts = group
      ? group.map((block) =>
          faculty.quotes.find((q) => q.sourceBlock === block)
        )
      : [quote];
    quotes.push({
      ...quote,
      text: parts.map((part) => part.text).join(" "),
      sourceBlocks: parts.map((part) => part.sourceBlock),
    });
  }
  return {
    ...faculty,
    quotes,
    editorialNotes:
      faculty.n === 22
        ? [
            "Region not labelled by Spurzheim in an image plate nor on the manuscript's frontispiece. No skull position is assigned here.",
          ]
        : [6, 11].includes(faculty.n)
          ? []
          : faculty.editorialNotes,
  };
}
