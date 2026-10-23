import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { lottiePath } from "../animationResolve";
const sourceBytes = readFileSync(
  resolve("public/publicAssets/animations/animationEyeMovements.json")
);
const original = JSON.parse(sourceBytes);
const derived = JSON.parse(
  readFileSync(
    resolve("public/publicAssets/animations/derived/animationEyeMovements.json")
  )
);
describe("eye-movement presentation derivative", () => {
  it("preserves source provenance and everything except the one baked expression", () => {
    expect(derived.presentationSource.sha256).toBe(
      createHash("sha256").update(sourceBytes).digest("hex")
    );
    const restored = structuredClone(derived);
    delete restored.presentationSource;
    restored.layers[0].shapes[1].s = original.layers[0].shapes[1].s;
    expect(restored).toEqual(original);
    expect(JSON.stringify(derived)).not.toContain('"x":"var $bm_rt');
  });
  it("uses exactly the authored end keyframes, tangents and easing with a constant -0.4 offset", () => {
    const trim = derived.layers[0].shapes[1];
    expect(trim.s.a).toBe(1);
    expect(trim.s.k).toHaveLength(trim.e.k.length);
    for (let i = 0; i < trim.s.k.length; i++) {
      const key = structuredClone(trim.e.k[i]);
      for (const endpoint of ["s", "e"])
        if (key[endpoint]) key[endpoint] = key[endpoint].map((v) => v - 0.4);
      expect(trim.s.k[i]).toEqual(key);
    }
  });
  it("selects only the canonical bundled figure and respects custom author assets", () => {
    expect(lottiePath({ id: "animationEyeMovements" })).toContain("/derived/");
    expect(
      lottiePath({
        id: "animationEyeMovements",
        lottieUrl: "/publicAssets/animations/animationEyeMovements.json",
      })
    ).toContain("/derived/");
    expect(
      lottiePath({
        id: "animationEyeMovements",
        lottieUrl: "https://example.com/custom.json",
      })
    ).toBe("https://example.com/custom.json");
  });
});
