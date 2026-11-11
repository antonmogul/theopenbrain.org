import { describe, it, expect } from "vitest";
import { FIT_MIN, listFit, listFits } from "@/helper/tocFit";

/*
 * How much the contents' gaps give so the list fits its column
 * (OPENBRAIN-182). The numbers are History's at 1440 wide: seven rows of 30
 * with 34 between them; the tallest set of parts is section 2's, 100 of
 * text and four gaps of 18.
 */
const drawn = {
  rows: 7 * 30,
  gaps: 6 * 34,
  parts: [
    { text: 40, gaps: 2 * 18 },
    { text: 100, gaps: 4 * 18 },
    { text: 40, gaps: 18 },
  ],
};
// With every gap as drawn, the tallest state (section 2 open).
const TALLEST = 210 + 204 + 100 + 72;
const tallestAt = (fit) => 210 + 100 + fit * (204 + 72);

describe("listFit", () => {
  it("leaves the gaps as drawn when the tallest state fits", () => {
    expect(listFit({ ...drawn, room: TALLEST })).toBe(1);
    expect(listFit({ ...drawn, room: 2000 })).toBe(1);
  });

  it("tightens them just enough for the tallest state", () => {
    const room = 500;
    const fit = listFit({ ...drawn, room });
    expect(fit).toBeLessThan(1);
    expect(fit).toBeGreaterThan(FIT_MIN);
    expect(tallestAt(fit)).toBeCloseTo(room, 6);
    expect(listFits({ ...drawn, room }, fit)).toBe(true);
  });

  it("fits every state, not only the one with the most text", () => {
    // Many short parts: little text, a lot of gap.
    const parts = [
      { text: 100, gaps: 72 },
      { text: 60, gaps: 10 * 18 },
    ];
    const measured = { rows: 210, gaps: 204, parts, room: 520 };
    const fit = listFit(measured);
    for (const state of parts)
      expect(210 + state.text + fit * (204 + state.gaps)).toBeLessThanOrEqual(
        520 + 1e-6
      );
  });

  it("stops at its floor, and says when even that does not fit", () => {
    const measured = { ...drawn, room: 330 };
    const fit = listFit(measured);
    expect(fit).toBe(FIT_MIN);
    expect(listFits(measured, fit)).toBe(false);
    expect(
      listFits({ ...drawn, room: 500 }, listFit({ ...drawn, room: 500 }))
    ).toBe(true);
  });

  it("fits a list with no parts by its rows alone", () => {
    expect(listFit({ rows: 210, gaps: 204, room: 414 })).toBe(1);
    const fit = listFit({ rows: 210, gaps: 204, room: 312 });
    expect(210 + fit * 204).toBeCloseTo(312, 6);
  });

  it("changes nothing when it cannot measure", () => {
    expect(listFit()).toBe(1);
    expect(listFit({ ...drawn, room: 0 })).toBe(1);
    expect(listFit({ ...drawn, room: NaN })).toBe(1);
  });
});
