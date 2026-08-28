import { describe, expect, it, vi } from "vitest";
import { useReferences } from "@/composables/useReferences";

const fetchReferences = vi.hoisted(() => vi.fn());
vi.mock("@/services/api/chapters", () => ({ fetchReferences }));

function deferred() {
  let resolve;
  const promise = new Promise((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

describe("useReferences route identity", () => {
  it("clears references and ignores an older chapter response", async () => {
    const oldRequest = deferred();
    fetchReferences.mockReset();
    fetchReferences.mockImplementationOnce(() => oldRequest.promise);
    fetchReferences.mockResolvedValueOnce([{ number: 2, title: "Current" }]);
    const { references, fetchRefs } = useReferences();

    const oldFetch = fetchRefs("module-1");
    const currentFetch = fetchRefs("module-2");
    await currentFetch;
    expect(references.value).toEqual([{ number: 2, title: "Current" }]);

    oldRequest.resolve([{ number: 1, title: "Stale" }]);
    await oldFetch;
    expect(references.value).toEqual([{ number: 2, title: "Current" }]);

    await fetchRefs(null);
    expect(references.value).toEqual([]);
  });
});
