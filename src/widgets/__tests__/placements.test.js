import { describe, it, expect } from "vitest";
import {
  applyWidgetPlacements,
  fullScreenOf,
  placementsForChapter,
  widgetParagraph,
  WIDGET_PLACEMENTS,
} from "@/widgets/placements";

/* A section shaped like transformModuleToChapterFormat's output for the
   Retina's "Amacrine and ganglion cells" section, trimmed to what the anchors
   care about. Fresh per test — applyWidgetPlacements mutates in place. */
function circuitSection() {
  return {
    id: "sec-6",
    slug: "amacrine-and-ganglion-cells-circuits-computations-and-output",
    title: "Amacrine and ganglion cells – circuits, computations and output",
    paragraphs: [
      { id: "p0", text: "The parcellation of photoreceptor-generated signals" },
      {
        subSection: [
          {
            id: "sub-circuit",
            title: "Circuit computations",
            paragraphs: [
              {
                subSubSection: [
                  {
                    id: "p3",
                    text: "<strong>Color opponency:</strong> First described",
                  },
                  {
                    id: "p4",
                    text: "One of the first written accounts of color blindness comes from John Dalton",
                  },
                  {
                    id: "p6",
                    text: "<strong>Object motion sensitivity:</strong> An important task",
                  },
                ],
              },
              { id: "p7", text: "talking about what the frog’s eye tells" },
            ],
          },
          {
            id: "sub-rod",
            title: "Rod and cone pathways",
            paragraphs: [{ id: "p9", text: "While both rod and cone" }],
          },
          {
            id: "sub-out",
            title: "Retinal output",
            paragraphs: [{ id: "p13", text: "While the axons" }],
          },
        ],
      },
    ],
  };
}

function chapterWith(...sections) {
  return {
    moduleId: "m",
    intro: [],
    sections,
    furtherReading: {},
    footNotes: {},
  };
}

const SECTION_SLUG =
  "amacrine-and-ganglion-cells-circuits-computations-and-output";

const ids = (list) => list.map((p) => p.id);

describe("widgetParagraph", () => {
  it("produces the reader's widget paragraph shape", () => {
    const p = widgetParagraph({
      id: "x",
      widgetId: "color-vision",
      kind: "inline",
      title: "T",
      blurb: "B",
      credit: "C",
      route: "/color-vision",
    });
    expect(p).toEqual({
      id: "widget-x",
      type: "widget",
      text: "",
      widget: {
        placementId: "x",
        placedBy: "config",
        widgetId: "color-vision",
        kind: "inline",
        title: "T",
        blurb: "B",
        credit: "C",
        route: "/color-vision",
      },
    });
  });

  it("defaults kind to breakout", () => {
    expect(widgetParagraph({ id: "x", widgetId: "w" }).widget.kind).toBe(
      "breakout"
    );
  });

  it("carries the full-screen flag only when set", () => {
    expect(
      widgetParagraph({ id: "x", widgetId: "w", fullScreen: true }).widget
        .fullScreen
    ).toBe(true);
    expect(
      widgetParagraph({ id: "x", widgetId: "w" }).widget
    ).not.toHaveProperty("fullScreen");
  });
});

describe("fullScreenOf (OPENBRAIN-147)", () => {
  const list = [
    { id: "a", widgetId: "w", chapterSlug: "c", fullScreen: true },
    { id: "b", widgetId: "w", chapterSlug: "c" },
  ];
  it("reads the block's own flag first", () => {
    expect(fullScreenOf({ placementId: "b", fullScreen: true }, list)).toBe(
      true
    );
    expect(fullScreenOf({ placementId: "a", fullScreen: false }, list)).toBe(
      false
    );
  });
  it("does not inherit a removed code placement by placementId", () => {
    expect(fullScreenOf({ placementId: "a", widgetId: "w" }, list)).toBe(false);
    expect(fullScreenOf({ placementId: "b", widgetId: "w" }, list)).toBe(false);
    expect(fullScreenOf({ widgetId: "w" }, list)).toBe(false);
    expect(fullScreenOf(null, list)).toBe(false);
  });
});

describe("placementsForChapter", () => {
  it("filters by chapter slug and keeps declaration order", () => {
    const list = [
      { id: "a", chapterSlug: "one" },
      { id: "b", chapterSlug: "two" },
      { id: "c", chapterSlug: "one" },
    ];
    expect(placementsForChapter("one", list).map((p) => p.id)).toEqual([
      "a",
      "c",
    ]);
    expect(placementsForChapter("none", list)).toEqual([]);
  });
});

describe("applyWidgetPlacements", () => {
  it("inserts after the paragraph whose text contains the needle, inside a sub-subsection", () => {
    const chapter = chapterWith(circuitSection());
    const result = applyWidgetPlacements(chapter, [
      {
        id: "cv",
        widgetId: "color-vision",
        chapterSlug: "the-retina",
        sectionSlug: SECTION_SLUG,
        anchors: [{ after: { textIncludes: "john dalton" } }],
      },
    ]);
    expect(result).toEqual({ applied: ["cv"], skipped: [], unresolved: [] });
    const group =
      chapter.sections[0].paragraphs[1].subSection[0].paragraphs[0]
        .subSubSection;
    expect(ids(group)).toEqual(["p3", "p4", "widget-cv", "p6"]);
    expect(group[2].type).toBe("widget");
    expect(group[2].widget.widgetId).toBe("color-vision");
  });

  it("beforeSubSection lands at the end of the preceding subsection", () => {
    const chapter = chapterWith(circuitSection());
    applyWidgetPlacements(chapter, [
      {
        id: "rb",
        widgetId: "retinabox",
        chapterSlug: "the-retina",
        sectionSlug: SECTION_SLUG,
        anchors: [{ beforeSubSection: "Rod and cone pathways" }],
      },
    ]);
    const circuit = chapter.sections[0].paragraphs[1].subSection[0];
    expect(ids(circuit.paragraphs)).toEqual([undefined, "p7", "widget-rb"]);
    const rod = chapter.sections[0].paragraphs[1].subSection[1];
    expect(ids(rod.paragraphs)).toEqual(["p9"]);
  });

  it("beforeSubSection on the first subsection inserts before the group in the parent list", () => {
    const chapter = chapterWith(circuitSection());
    applyWidgetPlacements(chapter, [
      {
        id: "first",
        widgetId: "sdt",
        chapterSlug: "the-retina",
        sectionSlug: SECTION_SLUG,
        anchors: [{ beforeSubSection: "Circuit computations" }],
      },
    ]);
    const top = chapter.sections[0].paragraphs;
    expect(top[0].id).toBe("p0");
    expect(top[1].id).toBe("widget-first");
    expect(top[2].subSection).toBeDefined();
  });

  it("keeps declaration order when two placements share an anchor", () => {
    const chapter = chapterWith(circuitSection());
    const shared = [{ beforeSubSection: "Rod and cone pathways" }];
    applyWidgetPlacements(chapter, [
      {
        id: "ds",
        widgetId: "direction-selectivity",
        chapterSlug: "the-retina",
        sectionSlug: SECTION_SLUG,
        anchors: shared,
      },
      {
        id: "rb",
        widgetId: "retinabox",
        chapterSlug: "the-retina",
        sectionSlug: SECTION_SLUG,
        anchors: shared,
      },
    ]);
    const circuit = chapter.sections[0].paragraphs[1].subSection[0];
    expect(ids(circuit.paragraphs).slice(-2)).toEqual([
      "widget-ds",
      "widget-rb",
    ]);
  });

  it("falls through the anchor list until one resolves", () => {
    const chapter = chapterWith(circuitSection());
    const result = applyWidgetPlacements(chapter, [
      {
        id: "ds",
        widgetId: "direction-selectivity",
        chapterSlug: "the-retina",
        sectionSlug: SECTION_SLUG,
        anchors: [
          { after: { textIncludes: "text that is not in the chapter" } },
          { beforeSubSection: "Rod and cone pathways" },
        ],
      },
    ]);
    expect(result.applied).toEqual(["ds"]);
    const circuit = chapter.sections[0].paragraphs[1].subSection[0];
    expect(ids(circuit.paragraphs).at(-1)).toBe("widget-ds");
  });

  it("reports placements whose section or anchors do not resolve, and leaves the chapter untouched", () => {
    const chapter = chapterWith(circuitSection());
    const before = JSON.stringify(chapter);
    const result = applyWidgetPlacements(chapter, [
      {
        id: "no-section",
        widgetId: "sdt",
        chapterSlug: "the-retina",
        sectionSlug: "does-not-exist",
        anchors: [{ endOfSection: true }],
      },
      {
        id: "no-anchor",
        widgetId: "sdt",
        chapterSlug: "the-retina",
        sectionSlug: SECTION_SLUG,
        anchors: [{ beforeSubSection: "Nope" }],
      },
    ]);
    expect(result).toEqual({
      applied: [],
      skipped: [],
      unresolved: ["no-section", "no-anchor"],
    });
    expect(JSON.stringify(chapter)).toBe(before);
  });

  it("carries narrowKind, for a desktop-sized tool shown as a card on phones", () => {
    const p = widgetParagraph({
      id: "rb",
      widgetId: "retinabox",
      kind: "inline",
      narrowKind: "breakout",
    });
    expect(p.widget.kind).toBe("inline");
    expect(p.widget.narrowKind).toBe("breakout");
  });

  it("carries fallbackWidgetId, the view shown until an upload is published", () => {
    const p = widgetParagraph({
      id: "rb",
      widgetId: "upload:retina-retinabox",
      fallbackWidgetId: "retinabox",
    });
    expect(p.widget.fallbackWidgetId).toBe("retinabox");
    expect(
      widgetParagraph({ id: "x", widgetId: "sdt" }).widget
    ).not.toHaveProperty("fallbackWidgetId");
  });

  it("skips a placement when the chapter already carries that widget (DB-authored block wins)", () => {
    const section = circuitSection();
    section.paragraphs[0] = {
      id: "db-widget",
      type: "widget",
      text: "",
      widget: { widgetId: "retinabox", kind: "inline" },
    };
    const chapter = chapterWith(section);
    const result = applyWidgetPlacements(chapter, [
      {
        id: "rb",
        widgetId: "retinabox",
        chapterSlug: "the-retina",
        sectionSlug: SECTION_SLUG,
        anchors: [{ beforeSubSection: "Rod and cone pathways" }],
      },
    ]);
    expect(result).toEqual({ applied: [], skipped: ["rb"], unresolved: [] });
  });

  it("skips a placement a DB block took over by its id, whatever widget the block now shows", () => {
    const section = circuitSection();
    section.paragraphs[0] = {
      id: "db-widget",
      type: "widget",
      text: "",
      widget: {
        widgetId: "upload:retina-retinabox",
        placementId: "rb",
        kind: "inline",
      },
    };
    const chapter = chapterWith(section);
    const result = applyWidgetPlacements(chapter, [
      {
        id: "rb",
        widgetId: "retinabox",
        chapterSlug: "the-retina",
        sectionSlug: SECTION_SLUG,
        anchors: [{ beforeSubSection: "Rod and cone pathways" }],
      },
    ]);
    expect(result).toEqual({ applied: [], skipped: ["rb"], unresolved: [] });
  });

  it("endOfSection appends to the section's top-level list", () => {
    const chapter = chapterWith(circuitSection());
    applyWidgetPlacements(chapter, [
      {
        id: "end",
        widgetId: "sdt",
        chapterSlug: "the-retina",
        sectionSlug: SECTION_SLUG,
        anchors: [{ endOfSection: true }],
      },
    ]);
    expect(chapter.sections[0].paragraphs.at(-1).id).toBe("widget-end");
  });

  it("tolerates a chapter without sections", () => {
    expect(applyWidgetPlacements(null, WIDGET_PLACEMENTS)).toEqual({
      applied: [],
      skipped: [],
      unresolved: [],
    });
    expect(applyWidgetPlacements({ sections: "nope" }, [])).toEqual({
      applied: [],
      skipped: [],
      unresolved: [],
    });
  });
});
