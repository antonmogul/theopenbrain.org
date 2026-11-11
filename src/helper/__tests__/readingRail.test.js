import { describe, expect, it } from "vitest";
import {
  cutSpan,
  figureLabel,
  railMarkFor,
  showingIndex,
  stepMark,
} from "../readingRail";

describe("figureLabel: the pane toolbar's wording", () => {
  it("pads a number to two digits and leaves a letter as it is", () => {
    expect(figureLabel(5)).toBe("FIG 05");
    expect(figureLabel("12")).toBe("FIG 12");
    expect(figureLabel("A")).toBe("FIG A");
  });
  it("is FIG alone without a number", () => {
    expect(figureLabel(undefined)).toBe("FIG");
    expect(figureLabel(null)).toBe("FIG");
    expect(figureLabel("")).toBe("FIG");
  });
});

describe("railMarkFor: what a paragraph's figure is", () => {
  it("has no mark for a trigger that brings nothing into the pane", () => {
    // No record: the Retina's blank trigger, which only clears the pane.
    expect(railMarkFor(undefined)).toBeNull();
    // A full-screen figure draws in the text column.
    expect(railMarkFor({ id: "a", fullscreen: true })).toBeNull();
    // A section's entrance plays over a blank spacer.
    expect(railMarkFor({ id: "a", isTransition: true })).toBeNull();
  });

  it("names a numbered figure as the pane does", () => {
    expect(
      railMarkFor({
        id: "animationFoundationsFig5",
        title: "Galen silences a squealing pig",
        figureNumber: 5,
        placeholder: true,
      })
    ).toEqual({
      kind: "figure",
      label: "FIG 05",
      name: "Figure 5: Galen silences a squealing pig, shown beside this paragraph",
    });
  });

  it("keeps the number for an interactive figure (History's Fig 2 and Fig 4)", () => {
    const mark = railMarkFor({
      id: "animationFoundationsFig4",
      figureNumber: "04",
      widgetId: "papyrus",
    });
    expect(mark.label).toBe("FIG 04");
    expect(mark.name).toBe("Figure 4, shown beside this paragraph");
  });

  it("says TRY IT for a widget and WATCH for a film", () => {
    expect(
      railMarkFor({ id: "w", title: "Loewi", widgetId: "upload:loewi" })
    ).toEqual({
      kind: "widget",
      label: "TRY IT",
      name: "Interactive: Loewi, shown beside this paragraph",
    });
    expect(
      railMarkFor({ id: "v", placeholder: true, youtubeID: "WgkAR-vrJpM" })
    ).toMatchObject({ kind: "video", label: "WATCH" });
    expect(railMarkFor({ id: "v", videoUrl: "/a.mp4" }).kind).toBe("video");
  });

  it("is FIG for the figure shell without a number", () => {
    expect(
      railMarkFor({ id: "a", imageUrl: "/a.jpg", title: "Woodcut" })
    ).toEqual({
      kind: "figure",
      label: "FIG",
      name: "Figure: Woodcut, shown beside this paragraph",
    });
  });

  it("is a bare pointer for the Retina's 2023 figures, which have no label", () => {
    expect(railMarkFor({ id: "animationDragon" })).toEqual({
      kind: "plain",
      label: "",
      name: "Figure, shown beside this paragraph",
    });
    expect(railMarkFor({ id: "animationEye", scroll: true }).kind).toBe(
      "plain"
    );
  });
});

describe("showingIndex: the last active trigger decides the pane", () => {
  it("is -1 when nothing is on", () => {
    expect(showingIndex([])).toBe(-1);
    expect(showingIndex([false, false])).toBe(-1);
  });
  it("prefers a paragraph's figure to the container's it sits in", () => {
    expect(showingIndex([true, false, false])).toBe(0);
    expect(showingIndex([true, true, false])).toBe(1);
  });
});

describe("cutSpan: the ribbon stops where a band covers the line", () => {
  it("is the whole span without bands", () => {
    expect(cutSpan(100, 900)).toEqual([[100, 900]]);
    expect(cutSpan(100, 900, [[1000, 1200]])).toEqual([[100, 900]]);
  });
  it("is nothing for an empty span", () => {
    expect(cutSpan(900, 900)).toEqual([]);
    expect(cutSpan(900, 100)).toEqual([]);
  });
  it("leaves out a band inside the span", () => {
    expect(cutSpan(100, 900, [[300, 500]])).toEqual([
      [100, 300],
      [500, 900],
    ]);
  });
  it("trims a band over either end, and several bands", () => {
    expect(
      cutSpan(100, 900, [
        [50, 150],
        [400, 450],
        [850, 2000],
      ])
    ).toEqual([
      [150, 400],
      [450, 850],
    ]);
  });
  it("drops a sliver between two bands", () => {
    expect(
      cutSpan(100, 900, [
        [300, 500],
        [504, 700],
      ])
    ).toEqual([
      [100, 300],
      [700, 900],
    ]);
  });
  it("is nothing when a band covers it all", () => {
    expect(cutSpan(100, 900, [[0, 1000]])).toEqual([]);
  });
});

describe("stepMark: the arrow keys along the rail", () => {
  it("moves one mark and stops at the ends", () => {
    expect(stepMark(1, 4, "ArrowDown")).toBe(2);
    expect(stepMark(3, 4, "ArrowDown")).toBe(3);
    expect(stepMark(1, 4, "ArrowUp")).toBe(0);
    expect(stepMark(0, 4, "ArrowUp")).toBe(0);
  });
  it("goes to the first and the last", () => {
    expect(stepMark(2, 4, "Home")).toBe(0);
    expect(stepMark(2, 4, "End")).toBe(3);
  });
  it("has nowhere to go without marks", () => {
    expect(stepMark(0, 0, "ArrowDown")).toBe(-1);
  });
});
