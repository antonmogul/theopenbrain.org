/* Exact quotations from the supplied 1815 appendix. Historical claims are
 * quoted as history, not presented as current neuroscience. */
import appendix from "@/data/history/phrenologyAppendix.json";

export const PHRENOLOGY_CITATION = appendix.source.citation;
export const PHRENOLOGY_SOURCE_SHA256 = appendix.source.sha256;
export const PHRENOLOGY_FACULTIES = appendix.faculties;
const MAP_NUMBERS = {
  anterior: [13, 19, 20, 21, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33],
  lateral: [
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 23,
    24, 25, 26, 27, 28, 29, 30, 31, 32, 33,
  ],
  posterior: [1, 2, 3, 4, 5, 6, 9, 10, 11, 12, 18],
};
export const PHRENOLOGY_VIEWS = Object.entries(MAP_NUMBERS).map(
  ([id, numbers]) => ({
    id,
    label: id[0].toUpperCase() + id.slice(1),
    regions: numbers.map((n) =>
      PHRENOLOGY_FACULTIES.find((faculty) => faculty.n === n)
    ),
  })
);
export function usePhrenology() {
  return { fetchViews: async () => PHRENOLOGY_VIEWS };
}
