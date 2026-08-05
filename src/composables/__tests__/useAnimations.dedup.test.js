import { describe, it, expect, vi, beforeEach } from "vitest";

/*
 * OPENBRAIN-10 regression: the module cache only fills once a fetch COMPLETES,
 * so ~24 inline figures mounting in the same tick each fired their own
 * Supabase request trio — enough parallel traffic that chapter 1's mobile
 * smoke check couldn't reach networkidle. Concurrent callers must share one
 * in-flight fetch.
 */

const apiRequest = vi.fn();
vi.mock("@/services/api/client", () => ({
  apiRequest: (...args) => apiRequest(...args),
}));

import { useAnimations } from "@/composables/useAnimations";

describe("useAnimations concurrent fetch dedup", () => {
  beforeEach(() => {
    useAnimations().clearCache();
    apiRequest.mockReset();
  });

  it("N concurrent callers produce one request trio, and all get the data", async () => {
    let release;
    const gate = new Promise((r) => (release = r));
    apiRequest.mockImplementation(async (path) => {
      await gate; // hold every request open so callers genuinely overlap
      if (path.startsWith("animations?"))
        return [{ id: "row1", animation_key: "animationX", config: {} }];
      return [];
    });

    const instances = Array.from({ length: 10 }, () => useAnimations());
    const pending = instances.map((i) => i.fetchAnimations());
    release();
    const results = await Promise.all(pending);

    // 3 endpoints (animations, states, variants) — once, not 10×.
    expect(apiRequest).toHaveBeenCalledTimes(3);
    for (const [i, r] of results.entries()) {
      expect(r.data).toHaveLength(1);
      expect(instances[i].animations.value).toHaveLength(1);
    }
  });

  it("serves later callers from the cache without new requests", async () => {
    apiRequest.mockImplementation(async (path) =>
      path.startsWith("animations?")
        ? [{ id: "row1", animation_key: "animationX", config: {} }]
        : []
    );
    await useAnimations().fetchAnimations();
    expect(apiRequest).toHaveBeenCalledTimes(3);

    const late = useAnimations();
    await late.fetchAnimations();
    expect(apiRequest).toHaveBeenCalledTimes(3); // unchanged
    expect(late.animations.value).toHaveLength(1);
  });
});
