/* Source-verified History appendix data. The original event text and image
 * hashes are kept in src/data/history; repeated stimulations stay separate. */
import appendix from "@/data/history/penfieldAppendix.json";

const TINTS = ["soft", "deep", "pale", "main", "soft", "deep", "main"];
const ORDER = ["ge", "sbe", "gp", "yn", "nc", "abra", "rw"];
export const CASE_FILES = ORDER.map((id, i) => {
  const record = appendix.cases.find((c) => c.id === id);
  return {
    ...record,
    tint: `rgb(var(--color-chapter${TINTS[i] === "main" ? "" : `-${TINTS[i]}`}))`,
    illustration: record.image.src,
  };
});
export const CASE_SOURCE = appendix.source.citation;
export const CASE_SOURCE_SHA256 = appendix.source.sha256;
export function useCaseFiles() {
  return { fetchCases: async () => CASE_FILES };
}
