import { authedRequest } from "@/services/api/client";

/** Read complete dashboard datasets without assuming the server's row cap.
 * A short page is not necessarily the last page (PostgREST may cap it below
 * our requested limit). Stop only on an empty page; never show partial totals.
 * Callers supply a stable order and, for time-based data, a fixed upper bound.
 */
export async function readDashboardRows(endpoint, isCurrent = () => true) {
  const rows = [];
  const seenIds = new Set();
  let offset = 0;
  for (let page = 0; page < 200; page++) {
    if (!isCurrent()) return [];
    const batch = await authedRequest(`${endpoint}&limit=500&offset=${offset}`);
    if (!isCurrent()) return [];
    if (!Array.isArray(batch))
      throw new Error("Unexpected dashboard response.");
    if (batch.length === 0) return rows;
    let added = 0;
    for (const row of batch) {
      if (row.id != null && seenIds.has(row.id)) continue;
      if (row.id != null) seenIds.add(row.id);
      rows.push(row);
      added++;
    }
    if (added === 0) {
      throw new Error("Dashboard pagination did not advance. Please retry.");
    }
    offset += batch.length;
  }
  throw new Error(
    "This dataset is too large to load completely. Choose a shorter date range where available; no partial totals are shown."
  );
}
