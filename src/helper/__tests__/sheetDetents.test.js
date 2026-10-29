import { describe, expect, it } from "vitest";
import {
  SHEET_BREAKPOINT,
  SHEET_DETENTS,
  SHEET_FLICK,
  SHEET_HALF_MIN,
  SHEET_MEDIA_QUERY,
  dragFraction,
  fitHalfDetent,
  keyDetent,
  releaseVelocity,
  snapDetent,
} from "../sheetDetents";

describe("phrenology sheet maths (OPENBRAIN-160)", () => {
  it("names the breakpoint the CSS repeats, exclusive of 760", () => {
    expect(SHEET_BREAKPOINT).toBe(760);
    expect(SHEET_MEDIA_QUERY).toBe("(max-width: 759.98px)");
  });

  it("lowers the half detent under a low region's number, not below the floor", () => {
    const high = fitHalfDetent({ containerHeight: 600, labelBottom: 200 });
    expect(high).toBe(SHEET_DETENTS.half);
    // The number sits 360px down a 600px body: the sheet's top must stay
    // 12px below it, so 228/600 of the body is all the sheet can have.
    expect(
      fitHalfDetent({ containerHeight: 600, labelBottom: 360 })
    ).toBeCloseTo(228 / 600);
    expect(fitHalfDetent({ containerHeight: 600, labelBottom: 590 })).toBe(
      SHEET_HALF_MIN
    );
    // No label (Weight, 22, has no place on the skull) or no height: base.
    expect(fitHalfDetent({ containerHeight: 600, labelBottom: null })).toBe(
      0.5
    );
    expect(fitHalfDetent({ containerHeight: 0, labelBottom: 100 })).toBe(0.5);
  });

  it("drags the top edge: up grows, clamped to closed and full", () => {
    expect(dragFraction(0.5, -100, 500)).toBeCloseTo(0.7);
    expect(dragFraction(0.5, 100, 500)).toBeCloseTo(0.3);
    expect(dragFraction(0.5, -900, 500)).toBe(SHEET_DETENTS.full);
    expect(dragFraction(0.5, 900, 500)).toBe(0);
    expect(dragFraction(0.5, -100, 0)).toBe(0.5);
  });

  it("measures the release velocity over the last samples only", () => {
    expect(releaseVelocity([])).toBe(0);
    expect(releaseVelocity([{ t: 0, fraction: 0.5 }])).toBe(0);
    const flick = [
      { t: 0, fraction: 0.5 },
      { t: 500, fraction: 0.5 }, // a long rest, outside the window
      { t: 560, fraction: 0.56 },
      { t: 600, fraction: 0.6 },
    ];
    expect(releaseVelocity(flick)).toBeCloseTo(1);
    expect(
      releaseVelocity(
        flick
          .slice()
          .reverse()
          .map((s, i) => ({ ...s, t: i * 50 }))
      )
    ).toBeLessThan(0);
  });

  it("snaps to the nearest detent, dismisses under half, and honours flicks", () => {
    expect(snapDetent(0.55, 0)).toBe("half");
    expect(snapDetent(0.75, 0)).toBe("full");
    expect(snapDetent(0.48, 0)).toBe("half"); // within the slack
    expect(snapDetent(0.4, 0)).toBe("closed");
    expect(snapDetent(0.52, SHEET_FLICK)).toBe("full");
    expect(snapDetent(0.52, -SHEET_FLICK)).toBe("closed");
    // From full, a flick down drops to half while still above it.
    expect(snapDetent(0.7, -SHEET_FLICK, SHEET_DETENTS, { from: "full" })).toBe(
      "half"
    );
    expect(
      snapDetent(0.45, -SHEET_FLICK, SHEET_DETENTS, { from: "full" })
    ).toBe("closed");
    // A lowered half detent moves the dismiss line with it.
    expect(snapDetent(0.35, 0, { half: 0.3, full: 0.9 })).toBe("half");
    expect(snapDetent(0.2, 0, { half: 0.3, full: 0.9 })).toBe("closed");
  });

  it("maps keys to detents: arrows step, Home and End jump, half + down closes", () => {
    expect(keyDetent("ArrowUp", "half")).toBe("full");
    expect(keyDetent("ArrowRight", "half")).toBe("full");
    expect(keyDetent("ArrowUp", "full")).toBeNull();
    expect(keyDetent("ArrowDown", "full")).toBe("half");
    expect(keyDetent("ArrowLeft", "half")).toBe("closed");
    expect(keyDetent("Home", "full")).toBe("half");
    expect(keyDetent("End", "half")).toBe("full");
    expect(keyDetent("Tab", "half")).toBeNull();
  });
});
