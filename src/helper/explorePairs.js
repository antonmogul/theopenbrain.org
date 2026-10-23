/** Pair only adjacent authored disclosures in breakout boxes; prose is a boundary. */
export function explorePairIds(section) {
  const ids = new Set();
  if (section?.kind !== "box") return ids;
  const paragraphs = section.paragraphs || [];
  for (let index = 0; index < paragraphs.length - 1; index++) {
    if (paragraphs[index].explore && paragraphs[index + 1].explore) {
      ids.add(paragraphs[index].id);
      ids.add(paragraphs[index + 1].id);
      index++;
    }
  }
  return ids;
}
