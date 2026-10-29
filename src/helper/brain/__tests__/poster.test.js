/*
 * The brain atlas's poster (OPENBRAIN-158): the stills exist and stay
 * small, the poster shrinks by the stage's own fit curve, and the gate that
 * decides whether to fetch the stage asks the canvas for the same context
 * the stage would, so a refusal costs no download and a pass hands the
 * stage that very context.
 */
import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  BRAIN_POSTER,
  FIT_ASPECT,
  FIT_MAX,
  STAGE_CONTEXT_ATTRS,
  fitScaleFor,
  posterScale,
  stageBlocker,
} from "../poster";

const ROOT = path.resolve(__dirname, "../../../..");
const PUBLIC = path.join(ROOT, "public");
const POSTER_BUDGET_KB = 150;

describe("the poster files", () => {
  it("ship at 1x and 2x, each well under the budget", () => {
    const files = [BRAIN_POSTER.src, ...BRAIN_POSTER.srcset.split(", ")]
      .map((s) => s.split(" ")[0])
      .filter((f, i, all) => all.indexOf(f) === i);
    expect(files).toHaveLength(2);
    for (const file of files) {
      const size = statSync(path.join(PUBLIC, file)).size;
      expect(size, file).toBeGreaterThan(1024);
      expect(size / 1024, `${file} KB`).toBeLessThan(POSTER_BUDGET_KB);
      // RIFF....WEBP
      const head = readFileSync(path.join(PUBLIC, file)).subarray(0, 12);
      expect(head.toString("latin1", 0, 4)).toBe("RIFF");
      expect(head.toString("latin1", 8, 12)).toBe("WEBP");
    }
    expect(BRAIN_POSTER.srcset).toMatch(/ 1x, .* 2x$/);
  });
});

describe("fitScaleFor / posterScale", () => {
  it("is 1 on a wide stage and backs off below FIT_ASPECT", () => {
    expect(fitScaleFor(1.8)).toBe(1);
    expect(fitScaleFor(FIT_ASPECT)).toBe(1);
    expect(fitScaleFor(1)).toBeGreaterThan(1);
    expect(fitScaleFor(0.75)).toBeGreaterThan(fitScaleFor(1));
    expect(fitScaleFor(0.1)).toBe(FIT_MAX);
  });
  it("treats a missing or empty stage as wide", () => {
    expect(fitScaleFor(0)).toBe(1);
    expect(fitScaleFor(NaN)).toBe(1);
    expect(fitScaleFor(undefined)).toBe(1);
  });
  it("shrinks the poster by the inverse of the camera's fit", () => {
    expect(posterScale(2)).toBe(1);
    expect(posterScale(0.75)).toBeCloseTo(1 / fitScaleFor(0.75), 10);
    expect(posterScale(0.1)).toBe(1 / FIT_MAX);
  });
  it("is the curve brainStage.js uses", () => {
    const src = readFileSync(
      path.join(ROOT, "src/helper/brain/brainStage.js"),
      "utf8"
    );
    expect(src).toMatch(/fitScaleFor\(camera\.aspect\)/);
    expect(src).not.toMatch(/Math\.pow\(1\.15/);
  });
});

describe("stageBlocker", () => {
  const webgl = (ctx) => ({ getContext: vi.fn(() => ctx) });

  it("holds the poster under reduced motion only when asked to", () => {
    const canvas = webgl({});
    expect(
      stageBlocker({
        reducedMotion: true,
        stillUnderReducedMotion: true,
        canvas,
      })
    ).toBe("motion");
    // Decided before the canvas is asked: no context is created.
    expect(canvas.getContext).not.toHaveBeenCalled();
    expect(
      stageBlocker({
        reducedMotion: true,
        stillUnderReducedMotion: false,
        canvas,
      })
    ).toBeNull();
    expect(
      stageBlocker({
        reducedMotion: false,
        stillUnderReducedMotion: true,
        canvas,
      })
    ).toBeNull();
  });

  it("refuses without a WebGL2 context, asking with the stage's attributes", () => {
    const canvas = webgl(null);
    expect(stageBlocker({ canvas })).toBe("webgl");
    expect(canvas.getContext).toHaveBeenCalledWith(
      "webgl2",
      STAGE_CONTEXT_ATTRS
    );
    expect(stageBlocker({ canvas: null })).toBe("webgl");
    expect(stageBlocker({})).toBe("webgl");
  });

  it("asks for the context exactly as brainStage.js does, before three.js", () => {
    const src = readFileSync(
      path.join(ROOT, "src/helper/brain/brainStage.js"),
      "utf8"
    );
    const literal = `canvas.getContext("webgl2", { antialias: true, alpha: true })`;
    const probe = src.indexOf(literal);
    expect(probe).toBeGreaterThan(-1);
    // The stage's own probe still comes before it constructs the renderer.
    expect(src.indexOf("new THREE.WebGLRenderer")).toBeGreaterThan(probe);
    expect(STAGE_CONTEXT_ATTRS).toEqual({ antialias: true, alpha: true });
  });
});
