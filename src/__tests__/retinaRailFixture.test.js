import { describe, it, expect } from "vitest";
import { retinaRailFixture } from "../stories/retinaRailFixture";
import { transformModuleToChapterFormat } from "../composables/chapterTransform.mjs";
import { railLayoutOf } from "../helper/exploreRail";
describe("pending Retina rail content", () => {
  it("survives real subsection reconstruction with all seven rails and stable targets", () => {
    const f = retinaRailFixture();
    const chapter = transformModuleToChapterFormat({
      ...f.module,
      sections: f.sections.map((s) => ({
        ...s,
        paragraphs: f.paragraphs.filter((p) => p.section_id === s.id),
      })),
    });
    const boxes = chapter.sections.filter((s) => s.kind === "box");
    expect(boxes).toHaveLength(7);
    for (const box of boxes) {
      const layout = railLayoutOf(box);
      expect(layout, box.slug).not.toBeNull();
      expect(layout.tail).toEqual([]);
      expect(layout.parts.length).toBeGreaterThan(0);
    }
    const colour = boxes.find((b) => b.slug === "box-colour-vision");
    expect(railLayoutOf(colour).parts).toHaveLength(5);
    expect(colour.paragraphs[0].text).toContain('data-ref="69"');
  });
});
