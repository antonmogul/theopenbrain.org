import { describe, it, expect } from "vitest";
import { FIT_MIN, listFit, listFits } from "@/helper/tocFit";

/*
 * How much the contents' gaps give so the list fits its column
 * (OPENBRAIN-182). The numbers are History's at 1440 wide: seven rows of 30
 * with 34 between them. Titles only since OPENBRAIN-193: no parts open
 * under a row, so there is one state to fit.
 */
const drawn = { rows: 7 * 30, gaps: 6 * 34 };
const AS_DRAWN = 210 + 204;

describe("listFit", () => {
  it("leaves the gaps as drawn when the list fits", () => {
    expect(listFit({ ...drawn, room: AS_DRAWN })).toBe(1);
    expect(listFit({ ...drawn, room: 2000 })).toBe(1);
  });

  it("tightens them just enough", () => {
    const room = 312;
    const fit = listFit({ ...drawn, room });
    expect(fit).toBeLessThan(1);
    expect(fit).toBeGreaterThan(FIT_MIN);
    expect(210 + fit * 204).toBeCloseTo(room, 6);
    expect(listFits({ ...drawn, room }, fit)).toBe(true);
  });

  it("stops at its floor, and says when even that does not fit", () => {
    const measured = { ...drawn, room: 240 };
    const fit = listFit(measured);
    expect(fit).toBe(FIT_MIN);
    expect(listFits(measured, fit)).toBe(false);
    expect(
      listFits({ ...drawn, room: 312 }, listFit({ ...drawn, room: 312 }))
    ).toBe(true);
  });

  it("has nothing to give for a single row", () => {
    expect(listFit({ rows: 30, gaps: 0, room: 40 })).toBe(1);
    expect(listFit({ rows: 30, gaps: 0, room: 20 })).toBe(FIT_MIN);
    expect(listFits({ rows: 30, gaps: 0, room: 20 }, FIT_MIN)).toBe(false);
  });

  it("changes nothing when it cannot measure", () => {
    expect(listFit()).toBe(1);
    expect(listFit({ ...drawn, room: 0 })).toBe(1);
    expect(listFit({ ...drawn, room: NaN })).toBe(1);
  });
});
