import { describe, expect, it } from "vitest";
import {
  firstIndexOf,
  retinaLayers,
  retinaModel,
} from "@/components/chapter/timeline/__stories__/timelineFixture";

describe("timeline preview story data", () => {
  it("has a real item for every widget preview, independently of code placements", () => {
    const model = retinaModel();
    const widgets = model.items.filter((item) => item.kind === "widget");
    expect(widgets).toHaveLength(3);
    expect(firstIndexOf(model, "widget")).toBeGreaterThanOrEqual(0);
    for (const item of widgets) expect(item.sectionKey).toBeTruthy();
    expect(
      firstIndexOf(model, (item) => item.marks.some((m) => m.type === "video"))
    ).toBeGreaterThanOrEqual(0);
    expect(
      firstIndexOf(
        model,
        (item) => item.kind === "break" && item.marks[0]?.type === "break"
      )
    ).toBeGreaterThanOrEqual(0);
    const layers = retinaLayers(model);
    expect(
      [...layers.highlights.keys()].some((index) => layers.trending.has(index))
    ).toBe(true);
  });
});
