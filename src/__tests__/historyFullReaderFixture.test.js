// @vitest-environment node
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import fixture from "../views/__stories__/historyFullReaderData.json";
import repairs from "../data/history/sourceContentRepairs.json";
import { transformModuleToChapterFormat } from "../composables/chapterTransform.mjs";
import { buildOutline } from "../composables/useChapterOutline";
import {
  applyWidgetPlacements,
  placementsForChapter,
} from "../widgets/placements";

function chapter() {
  const assembled = {
    ...fixture.module,
    sections: fixture.sections.map((section) => ({
      ...section,
      paragraphs: fixture.paragraphs
        .filter((p) => p.section_id === section.id)
        .map((p) => {
          const animation = fixture.animations.find(
            (a) => a.id === p.animation_id
          );
          return {
            ...p,
            animation_key: animation?.animation_key,
            animation_title: animation?.title,
          };
        }),
    })),
  };
  return transformModuleToChapterFormat(assembled);
}

describe("committed complete History reader fixture", () => {
  it("fingerprints every executed seed/content migration", () => {
    expect(fixture.sources).toHaveLength(12);
    for (const source of fixture.sources) {
      expect(
        createHash("sha256").update(readFileSync(source.path)).digest("hex"),
        source.path
      ).toBe(source.sha256);
    }
  });
  it("contains complete seeded sections and repaired prose, not reader-shaped excerpts", () => {
    expect(fixture.sections).toHaveLength(16);
    expect(fixture.paragraphs).toHaveLength(83);
    expect(fixture.animations).toHaveLength(33);
    for (const repair of repairs.paragraphUpdates) {
      const section = fixture.sections.find(
        (s) => s.slug === repair.sectionSlug
      );
      const paragraph = fixture.paragraphs.find(
        (p) =>
          p.section_id === section.id && p.order_index === repair.orderIndex
      );
      expect(paragraph.content).toEqual(repair.after.content);
      expect(paragraph.content_text).toBe(repair.after.content_text);
    }
  });
  it("keeps all eight box anchors and nested outline entries through the real transform", () => {
    const transformed = chapter();
    const boxes = transformed.sections.filter((s) => s.kind === "box");
    expect(boxes).toHaveLength(8);
    for (const box of boxes) {
      expect(box.anchored, box.id).toBe(true);
      expect(box.anchorParagraphId, box.id).toBeTruthy();
      const parent = transformed.sections.find((s) => s.id === box.parentId);
      expect(
        parent.paragraphs.some((p) => p.id === box.anchorParagraphId),
        box.id
      ).toBe(true);
    }
    const outline = buildOutline(transformed);
    expect(outline.filter((entry) => entry.kind === "box")).toHaveLength(0);
    expect(
      outline
        .flatMap((entry) => entry.subsections)
        .filter((entry) => entry.kind === "box")
    ).toHaveLength(8);
  });
  it("resolves real code widget placements without invented database rows", () => {
    const transformed = chapter();
    const result = applyWidgetPlacements(
      transformed,
      placementsForChapter(fixture.module.slug)
    );
    expect(result.unresolved).toEqual([]);
    expect(
      fixture.paragraphs.some((p) =>
        p.content.blocks.some((b) => b.type === "widget")
      )
    ).toBe(false);
  });
  it("preserves Broca/Fritsch static artwork and all box artwork", () => {
    for (const number of [9, 10]) {
      const animation = fixture.animations.find(
        (a) => a.animation_key === `animationFoundationsFig${number}`
      );
      expect(animation.config.images).toHaveLength(1);
      const paragraph = fixture.paragraphs.find(
        (p) => p.animation_id === animation.id
      );
      expect(paragraph.animation_trigger).toBe("auto");
      expect(
        paragraph.content.blocks.some(
          (b) => b.type === "figure_placeholder" && b.number === number
        )
      ).toBe(true);
    }
    for (const source of fixture.animations
      .flatMap((a) => a.config.images || [])
      .map((image) => (typeof image === "string" ? image : image.src))) {
      expect(source).toMatch(/^\/publicAssets\//);
      expect(readFileSync(`public${source}`).length, source).toBeGreaterThan(0);
    }
  });
  it("mounts the real app, router and app-width observer without fixture geometry CSS", () => {
    const source = readFileSync(
      "src/views/__stories__/HistoryFullReaderHarness.vue",
      "utf8"
    );
    expect(source).toContain('import App from "@/App.vue"');
    expect(source).toContain('import { createAppRouter } from "@/router"');
    expect(source).toContain("observeAppWidth()");
    expect(source).toContain("preferences.init()");
    expect(source).toContain("store.router = markRaw(router)");
    expect(source).toContain("createWebHashHistory()");
    expect(source).not.toContain("<style");
  });
});
