import { describe, it, expect, beforeEach, vi } from "vitest";
import { useCrudResource } from "@/composables/useCrudResource";

describe("useCrudResource", () => {
  let request;

  beforeEach(() => {
    request = vi.fn();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("starts with the provided initial list and idle flags", () => {
    const { list, loading, error } = useCrudResource({ request, initial: [] });
    expect(list.value).toEqual([]);
    expect(loading.value).toBe(false);
    expect(error.value).toBe(null);
  });

  it("runFetch loads data, toggles loading, and clears prior error", async () => {
    request.mockResolvedValue([{ id: "a" }, { id: "b" }]);
    const { list, loading, error, runFetch } = useCrudResource({ request });
    error.value = "stale";

    const p = runFetch("rows?select=*");
    expect(loading.value).toBe(true);
    await p;

    expect(request).toHaveBeenCalledWith("rows?select=*");
    expect(list.value).toEqual([{ id: "a" }, { id: "b" }]);
    expect(error.value).toBe(null);
    expect(loading.value).toBe(false);
  });

  it("runFetch coerces null/undefined responses to an empty array", async () => {
    request.mockResolvedValue(null);
    const { list, runFetch } = useCrudResource({ request });
    await runFetch("rows");
    expect(list.value).toEqual([]);
  });

  it("runFetch on failure records error.message, resets list, clears loading", async () => {
    request.mockRejectedValue(new Error("boom"));
    const { list, loading, error, runFetch } = useCrudResource({
      request,
      logLabel: "lbl",
    });
    list.value = [{ id: "old" }];

    await runFetch("rows");

    expect(error.value).toBe("boom");
    expect(list.value).toEqual([]);
    expect(loading.value).toBe(false);
    expect(console.error).toHaveBeenCalledWith("lbl: Error fetching:", expect.any(Error));
  });

  it("removeById issues a DELETE on table?id=eq.<id> and drops the row locally", async () => {
    request.mockResolvedValue([]);
    const { list, removeById } = useCrudResource({ request, table: "notes" });
    list.value = [{ id: "1" }, { id: "2" }, { id: "3" }];

    await removeById("2");

    expect(request).toHaveBeenCalledWith("notes?id=eq.2", { method: "DELETE" });
    expect(list.value).toEqual([{ id: "1" }, { id: "3" }]);
  });

  it("removeById rethrows on failure and leaves local state untouched", async () => {
    request.mockRejectedValue(new Error("nope"));
    const { list, removeById } = useCrudResource({
      request,
      table: "notes",
      logLabel: "useNotes",
    });
    list.value = [{ id: "1" }];

    await expect(removeById("1")).rejects.toThrow("nope");
    expect(list.value).toEqual([{ id: "1" }]);
    expect(console.error).toHaveBeenCalledWith("useNotes: Error deleting:", expect.any(Error));
  });
});
