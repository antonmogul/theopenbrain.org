// @vitest-environment node
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import appendix from "@/data/history/penfieldAppendix.json";
import { PENFIELD_LABELS, PENFIELD_TITLE } from "@/helper/penfieldPresentation";
import { WIDGET_PLACEMENTS } from "@/widgets/placements";

describe("Penfield presentation preserves the scientific source", () => {
  it("retains all original scan hashes and covers only existing mapped labels", () => {
    let points = 0,
      events = 0,
      mapped = 0;
    for (const c of appendix.cases) {
      expect(
        createHash("sha256")
          .update(readFileSync(`public${c.image.src}`))
          .digest("hex")
      ).toBe(c.image.sha256);
      const labels = PENFIELD_LABELS[c.id];
      expect(labels.masks.map((m) => m.id).sort()).toEqual(
        c.points
          .filter((p) => p.hotspots.length)
          .map((p) => p.id)
          .sort()
      );
      for (const mask of labels.masks) {
        for (const pair of mask.polygon.split(" ")) {
          const [x, y] = pair.split(",").map(Number);
          expect(x).toBeGreaterThanOrEqual(0);
          expect(x).toBeLessThanOrEqual(c.image.width);
          expect(y).toBeGreaterThanOrEqual(0);
          expect(y).toBeLessThanOrEqual(c.image.height);
        }
      }
      points += c.points.length;
      events += c.points.reduce((n, p) => n + p.events.length, 0);
      mapped += labels.masks.length;
    }
    expect([appendix.cases.length, points, mapped, events]).toEqual([
      7, 47, 45, 82,
    ]);
  });
  it("uses the corrected requested title in the reader placement", () => {
    expect(PENFIELD_TITLE).toBe(
      "Find out what it was like to be Dr. Wilder Penfield"
    );
    expect(
      WIDGET_PLACEMENTS.find((p) => p.widgetId === "case-cabinet").title
    ).toBe(PENFIELD_TITLE);
  });
});
