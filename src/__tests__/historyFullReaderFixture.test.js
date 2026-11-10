// @vitest-environment node
/** The committed History fixture is a dated export of the published chapter
 * (scripts/history-full-reader-export.mjs). These checks are hermetic: they
 * hold the committed file to its own header and to the shape the reader and
 * the browser lane rely on. Whether it still equals the live chapter is the
 * export's --check, a local command (docs/architecture/history-fixture.md).
 */
import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import fixture from "../stories/historyFullReaderData.json";
import { transformModuleToChapterFormat } from "../composables/chapterTransform.mjs";
import { buildOutline } from "../composables/useChapterOutline";
import {
  applyWidgetPlacements,
  placementsForChapter,
} from "../widgets/placements";
import { hasEmbed } from "../widgets/embeds";
import { UPLOADED_WIDGETS } from "../widgets/uploads/index.js";

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const boxes = fixture.sections.filter((s) => s.slug.startsWith("box-"));
const widgetBlocks = fixture.paragraphs.flatMap((p) =>
  (p.content?.blocks || []).filter((block) => block.type === "widget")
);
const images = fixture.animations.flatMap((a) =>
  (a.config?.images || []).map((image) =>
    typeof image === "string" ? { src: image } : image
  )
);

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
  it("records its source, export date and row counts in a header", () => {
    const { header } = fixture;
    expect(header.source).toBe("published chapter export");
    expect(header.chapter).toBe(fixture.module.slug);
    expect(header.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(Number.isNaN(Date.parse(header.exportedAt))).toBe(false);
    expect(existsSync(header.exportedBy), header.exportedBy).toBe(true);
    expect(fixture.boundary).toContain("published History chapter");
    expect(fixture.omissions.length).toBeGreaterThan(0);
    // Nothing of the migration-replay fixture this replaced may linger.
    expect(fixture.sources).toBeUndefined();
  });

  it("holds exactly the rows its header counts", () => {
    expect(fixture.header.counts).toEqual({
      sections: fixture.sections.length,
      boxes: boxes.length,
      paragraphs: fixture.paragraphs.length,
      figureLinks: fixture.paragraphs.filter((p) => p.animation_id).length,
      animations: fixture.animations.length,
      widgetBlocks: widgetBlocks.length,
      references: fixture.references.length,
      uploads: fixture.uploads.length,
    });
    expect(fixture.sections.length).toBeGreaterThan(0);
    expect(fixture.paragraphs.length).toBeGreaterThan(0);
  });

  it("is the published module with stable fixture ids and no production ids", () => {
    expect(fixture.module.status).toBe("published");
    expect(fixture.module.id).toBe("history-fixture-module");
    for (const section of fixture.sections) {
      expect(section.id).toBe(`history-section-${section.slug}`);
      expect(section.module_id, section.id).toBe(fixture.module.id);
    }
    for (const paragraph of fixture.paragraphs)
      expect(paragraph.id).toBe(
        `${paragraph.section_id}-p${paragraph.order_index}`
      );
    for (const animation of fixture.animations)
      expect(animation.id).toBe(`history-animation-${animation.animation_key}`);
    for (const reference of fixture.references) {
      expect(reference.id).toBe(`history-reference-${reference.number}`);
      expect(reference.module_id, reference.id).toBe(fixture.module.id);
    }
    const ids = [
      ...fixture.sections,
      ...fixture.paragraphs,
      ...fixture.animations,
      ...fixture.references,
    ].map((row) => row.id);
    expect(new Set(ids).size).toBe(ids.length);
    const text = JSON.stringify(fixture);
    expect(text.match(UUID)?.[0]).toBeUndefined();
    for (const column of [
      "created_at",
      "updated_at",
      "created_by",
      "content_version_id",
    ])
      expect(text.includes(`"${column}":`), column).toBe(false);
  });

  it("links every paragraph to an exported section and every figure link to an exported animation", () => {
    const sectionIds = new Set(fixture.sections.map((s) => s.id));
    const animationIds = new Set(fixture.animations.map((a) => a.id));
    for (const paragraph of fixture.paragraphs) {
      expect(sectionIds.has(paragraph.section_id), paragraph.id).toBe(true);
      expect(Array.isArray(paragraph.content?.blocks), paragraph.id).toBe(true);
      if (paragraph.animation_id)
        expect(animationIds.has(paragraph.animation_id), paragraph.id).toBe(
          true
        );
    }
    // The export holds the figures paragraphs link, and no others.
    const linked = new Set(
      fixture.paragraphs.map((p) => p.animation_id).filter(Boolean)
    );
    expect([...animationIds].filter((id) => !linked.has(id))).toEqual([]);
  });

  it("gives every box a parent section and an anchor paragraph inside it", () => {
    expect(boxes.length).toBeGreaterThan(0);
    for (const box of boxes) {
      const parent = fixture.sections.find(
        (s) => s.id === box.parent_section_id
      );
      expect(parent, box.id).toBeTruthy();
      expect(parent.slug.startsWith("box-"), box.id).toBe(false);
      const anchor = fixture.paragraphs.find(
        (p) => p.id === box.anchor_paragraph_id
      );
      expect(anchor?.section_id, box.id).toBe(parent.id);
    }
    for (const section of fixture.sections.filter((s) => !boxes.includes(s))) {
      expect(section.parent_section_id, section.id).toBeNull();
      expect(section.anchor_paragraph_id, section.id).toBeNull();
    }
  });

  it("keeps every box anchored and nested in the outline through the real transform", () => {
    const transformed = chapter();
    const transformedBoxes = transformed.sections.filter(
      (s) => s.kind === "box"
    );
    expect(transformedBoxes).toHaveLength(boxes.length);
    for (const box of transformedBoxes) {
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
    ).toHaveLength(boxes.length);
  });

  it("carries widgets as database blocks the reader can mount, each replacing its code placement", () => {
    const placements = placementsForChapter(fixture.module.slug);
    for (const block of widgetBlocks) {
      expect(hasEmbed(block.widgetId), block.widgetId).toBe(true);
      expect(["inline", "breakout"]).toContain(block.kind);
      if (block.placementId)
        expect(
          placements.some((placement) => placement.id === block.placementId),
          block.placementId
        ).toBe(true);
    }
    const transformed = chapter();
    const result = applyWidgetPlacements(transformed, placements);
    expect(result.unresolved).toEqual([]);
    // A database block wins over the code placement for the same widget, so
    // no widget may appear twice in the chapter.
    const mounted = [];
    const walk = (nodes) => {
      for (const node of nodes || []) {
        if (node.type === "widget") mounted.push(node.widget);
        for (const group of node.subSection || []) walk(group.paragraphs);
        walk(node.subSubSection);
      }
    };
    for (const section of transformed.sections) walk(section.paragraphs);
    expect(mounted.map((widget) => widget.widgetId).sort()).toEqual(
      widgetBlocks.map((block) => block.widgetId).sort()
    );
    expect(mounted.some((widget) => widget.placedBy === "config")).toBe(false);
  });

  it("names each uploaded widget by the hash of its committed copy", () => {
    const named = new Set(
      [
        ...fixture.animations.map((a) => a.config?.widgetId),
        ...widgetBlocks.map((block) => block.widgetId),
      ]
        .filter((id) => typeof id === "string" && id.startsWith("upload:"))
        .map((id) => id.slice("upload:".length))
    );
    expect(fixture.uploads.map((upload) => upload.slug).sort()).toEqual(
      [...named].sort()
    );
    for (const upload of fixture.uploads) {
      expect(upload.status, upload.slug).toBe("published");
      expect(
        UPLOADED_WIDGETS.some((widget) => widget.slug === upload.slug),
        upload.slug
      ).toBe(true);
      // The story serves this file. If the hash differs, the published widget
      // changed: bring the committed copy up to date with the refresh.
      const html = readFileSync(`src/widgets/uploads/${upload.slug}.html`);
      expect(html.length, upload.slug).toBe(upload.bytes);
      expect(createHash("sha256").update(html).digest("hex"), upload.slug).toBe(
        upload.sha256
      );
    }
  });

  it("keeps the Broca and Fritsch figures the browser lane times as single still images", () => {
    for (const number of [9, 10]) {
      const animation = fixture.animations.find(
        (a) => a.animation_key === `animationFoundationsFig${number}`
      );
      expect(animation.config.images).toHaveLength(1);
      const paragraph = fixture.paragraphs.find(
        (p) => p.animation_id === animation.id
      );
      expect(paragraph.animation_trigger).toBe("auto");
      // The lane's boundary maths has no term for an authored hold.
      expect(paragraph.content.animationFlags?.hold).toBeUndefined();
      expect(
        paragraph.content.blocks.some(
          (b) => b.type === "figure_placeholder" && b.number === number
        )
      ).toBe(true);
    }
  });

  it("draws every figure from committed artwork, or a YouTube poster the story stands in for", () => {
    expect(images.length).toBeGreaterThan(0);
    for (const image of images) {
      if (image.src.startsWith("/publicAssets/")) {
        const file = `public${image.src.split("?")[0]}`;
        expect(readFileSync(file).length, image.src).toBeGreaterThan(0);
      } else {
        expect(image.youtube, image.src).toBeTruthy();
        expect(image.src).toBe(
          `https://i.ytimg.com/vi/${image.youtube}/hqdefault.jpg`
        );
      }
    }
    for (const paragraph of fixture.paragraphs) {
      const src = paragraph.content?.explore?.image?.src;
      if (src)
        expect(
          readFileSync(`public${src.split("?")[0]}`).length,
          src
        ).toBeGreaterThan(0);
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
