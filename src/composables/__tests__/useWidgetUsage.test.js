import { describe, expect, it } from "vitest";
import { buildWidgetUsage } from "@/composables/useWidgetUsage";

// OPENBRAIN-71: where each widget is used.
const modules = [
  {
    id: "m1",
    title: "Foundations of Neuroscience",
    slug: "foundations-of-neuroscience",
  },
  { id: "m2", title: "The Retina", slug: "the-retina" },
];
const sections = [
  {
    id: "s1",
    module_id: "m1",
    title: "Do different parts of the brain do different things?",
  },
  { id: "s2", module_id: "m2", title: "Organization and cell types" },
];
const placements = [
  { widgetId: "phrenology", chapterSlug: "foundations-of-neuroscience" },
  { widgetId: "retinabox", chapterSlug: "the-retina" },
  { widgetId: "v1-camera", chapterSlug: "visual-cortex" }, // no such chapter
];

describe("buildWidgetUsage", () => {
  it("lists text blocks, panel figures and code placements", () => {
    const usage = buildWidgetUsage({
      modules,
      sections,
      blockRows: [
        {
          section_id: "s1",
          content: { blocks: [{ type: "widget", widgetId: "phrenology" }] },
        },
      ],
      widgetMedia: [{ id: "w1", config: { widgetId: "case-cabinet" } }],
      figureRows: [{ section_id: "s1", animation_id: "w1" }],
      placements,
    });
    expect(usage.get("phrenology")).toEqual([
      {
        chapter: "Foundations of Neuroscience",
        chapterSlug: "foundations-of-neuroscience",
        section: "Do different parts of the brain do different things?",
        where: "text",
      },
    ]); // its code placement is overridden by the block, as in the reader
    expect(usage.get("case-cabinet")[0].where).toBe("panel");
    expect(usage.get("retinabox")).toEqual([
      {
        chapter: "The Retina",
        chapterSlug: "the-retina",
        section: "",
        where: "code",
      },
    ]);
    expect(usage.has("v1-camera")).toBe(false);
  });
});
