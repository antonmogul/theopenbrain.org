import { describe, it, expect, vi } from "vitest";
import {
  resolveAnimationRecord,
  isConfigBearing,
  resolveAnimationConfig,
  lottieAssetOk,
  lottiePath,
} from "@/helper/animationResolve";

const DB = [
  { id: "animationEye", title: "Eye (DB)", loop: true },
  { id: "animationDbOnly", title: "DB only" },
];

describe("resolveAnimationRecord", () => {
  it("returns the database record", () => {
    expect(resolveAnimationRecord("animationEye", DB)).toBe(DB[0]);
  });
  it.each([DB, [], null])(
    "warns for a missing record even with a partial database",
    (list) => {
      const warn = vi.fn();
      expect(resolveAnimationRecord("animationMissing", list, warn)).toBe(null);
      expect(warn).toHaveBeenCalledOnce();
      expect(warn.mock.calls[0][0]).toContain("animationMissing");
      expect(warn.mock.calls[0][0]).toContain("Supabase");
    }
  );
  it("returns null quietly for a non-figure paragraph", () => {
    const warn = vi.fn();
    expect(resolveAnimationRecord(undefined, DB, warn)).toBe(null);
    expect(warn).not.toHaveBeenCalled();
  });
});

describe("isConfigBearing", () => {
  it("recognises DB-shaped objects by any config flag", () => {
    expect(isConfigBearing({ id: "a", loop: false })).toBe(true);
    expect(isConfigBearing({ id: "a", switch: true })).toBe(true);
    expect(isConfigBearing({ id: "a", flip: false })).toBe(true);
  });

  it("rejects Chapter 1's bare {name,id,title,transition} stubs", () => {
    expect(
      isConfigBearing({ name: "Eye", id: "animationEye", transition: false })
    ).toBe(false);
    expect(isConfigBearing(null)).toBe(false);
  });
});

describe("resolveAnimationConfig", () => {
  it("returns the prop untouched when it is config-bearing (DB path)", () => {
    const prop = { id: "animationEye", loop: true, states: ["a"] };
    expect(resolveAnimationConfig(prop)).toBe(prop);
  });

  it("keeps a bare prop and warns instead of looking up a legacy record", () => {
    const warn = vi.fn();
    const prop = { name: "X", id: "animationUnknown", title: "X" };
    expect(resolveAnimationConfig(prop, warn)).toBe(prop);
    expect(warn).toHaveBeenCalledOnce();
  });
  it("recognises video and image database records without interaction flags", () => {
    const warn = vi.fn();
    for (const prop of [
      { id: "v", youtubeID: "abc" },
      { id: "i", imageUrl: "/image.png" },
    ])
      expect(resolveAnimationConfig(prop, warn)).toBe(prop);
    expect(warn).not.toHaveBeenCalled();
  });
});

describe("lottieAssetOk", () => {
  const res = (ok, type) => ({
    ok,
    headers: { get: (h) => (h === "content-type" ? type : null) },
  });

  it("accepts a real JSON asset", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(res(true, "application/json"));
    expect(await lottieAssetOk("animationEye", fetchImpl)).toBe(true);
    expect(fetchImpl).toHaveBeenCalledWith(
      "/publicAssets/animations/animationEye.json",
      { method: "HEAD" }
    );
  });

  it("rejects the SPA rewrite (200 + text/html) production serves for misses", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(res(true, "text/html"));
    expect(await lottieAssetOk("animationGhost", fetchImpl)).toBe(false);
  });

  it("rejects an honest 404 and network failure", async () => {
    expect(
      await lottieAssetOk("x", vi.fn().mockResolvedValue(res(false, null)))
    ).toBe(false);
    expect(
      await lottieAssetOk("x", vi.fn().mockRejectedValue(new Error("net")))
    ).toBe(false);
    expect(await lottieAssetOk(undefined, vi.fn())).toBe(false);
  });
});

describe("lottiePath (OPENBRAIN-70 B4)", () => {
  it("uses an uploaded file's URL, else the key's bundled file", async () => {
    const { lottiePath } = await import("@/helper/animationResolve");
    expect(
      lottiePath({
        id: "animationUpload1",
        lottieUrl: "https://x.supabase.co/a.json",
      })
    ).toBe("https://x.supabase.co/a.json");
    // A row naming another bundled file loads that file (its key has none).
    expect(
      lottiePath({
        id: "animationRetinalCellTypes3",
        lottieUrl: "/publicAssets/animations/animationRetinalCellTypes.json",
      })
    ).toBe("/publicAssets/animations/animationRetinalCellTypes.json");
    expect(lottiePath({ id: "animationDragon" })).toBe(
      "/publicAssets/animations/animationDragon.json"
    );
  });
});

describe("horizontal-cell artwork alias", () => {
  it("resolves the 2023 stage alias offline while preserving an author's URL", () => {
    expect(lottiePath({ id: "animationRetinalCellTypes3" })).toBe(
      "/publicAssets/animations/animationRetinalCellTypes.json"
    );
    expect(
      lottiePath({
        id: "animationRetinalCellTypes3",
        lottieUrl: "/custom.json",
      })
    ).toBe("/custom.json");
  });
});
