import { describe, expect, it } from "vitest";
import {
  resolveAnchorIndex,
  planPlacementConversion,
  placementBlock,
} from "@/editor/placementsToBlocks";
import { WIDGET_PLACEMENTS } from "@/widgets/placements";

const rows = [
  { id: "r0", content_text: "Intro to cueing." },
  {
    id: "r1",
    content_text:
      "The spatial cueing paradigm introduced by Michael Posner in 1980…",
  },
  { id: "r2", content_text: "Neutral cues", is_subsection_header: true },
  { id: "r3", content_text: "Posner's original measurements showed…" },
];

describe("resolveAnchorIndex (OPENBRAIN-62)", () => {
  it("resolves after / before / beforeSubSection / endOfSection", () => {
    expect(
      resolveAnchorIndex(rows, [
        { after: { textIncludes: "Michael Posner in 1980" } },
      ])
    ).toBe(2);
    expect(
      resolveAnchorIndex(rows, [
        { before: { textIncludes: "original measurements" } },
      ])
    ).toBe(3);
    expect(
      resolveAnchorIndex(rows, [{ beforeSubSection: "Neutral cues" }])
    ).toBe(2);
    expect(resolveAnchorIndex(rows, [{ endOfSection: true }])).toBe(4);
  });

  it("takes the first anchor that resolves, and -1 when none does", () => {
    expect(
      resolveAnchorIndex(rows, [
        { after: { textIncludes: "not in the text" } },
        { before: { textIncludes: "Intro" } },
      ])
    ).toBe(0);
    expect(
      resolveAnchorIndex(rows, [{ after: { textIncludes: "nope" } }])
    ).toBe(-1);
  });
});

describe("planPlacementConversion", () => {
  const sections = [{ id: "s1", slug: "measured" }];
  const rowsBySection = new Map([["s1", rows]]);
  const place = (over) => ({
    id: "p",
    widgetId: "posner-cueing",
    sectionSlug: "measured",
    kind: "inline",
    anchors: [{ after: { textIncludes: "Michael Posner in 1980" } }],
    title: "Run the Posner cueing task",
    ...over,
  });

  it("skips placements the chapter already has as DB widgets (the DB wins)", () => {
    const plan = planPlacementConversion({
      placements: [place()],
      sections,
      rowsBySection,
      existingWidgetIds: new Set(["posner-cueing"]),
    });
    expect(plan.ready).toEqual([]);
  });

  it("plans the insert position and block; reports unresolved ones", () => {
    const plan = planPlacementConversion({
      placements: [
        place(),
        place({ id: "q", widgetId: "x", sectionSlug: "missing" }),
      ],
      sections,
      rowsBySection,
      existingWidgetIds: new Set(),
    });
    expect(plan.ready).toHaveLength(1);
    expect(plan.ready[0]).toMatchObject({ sectionId: "s1", index: 2 });
    expect(plan.ready[0].block).toEqual({
      type: "widget",
      widgetId: "posner-cueing",
      kind: "inline",
      title: "Run the Posner cueing task",
      blurb: "",
      credit: "",
      placementId: "p",
      route: "",
    });
    expect(plan.unresolved.map((p) => p.id)).toEqual(["q"]);
  });

  it("builds a block for every real placement", () => {
    for (const p of WIDGET_PLACEMENTS) {
      const b = placementBlock(p);
      expect(b.widgetId).toBe(p.widgetId);
      expect(["inline", "breakout"]).toContain(b.kind);
    }
  });
});
