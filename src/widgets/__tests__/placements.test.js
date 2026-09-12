import { describe, it, expect } from "vitest";
import {
  applyWidgetPlacements,
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

describe("WIDGET_PLACEMENTS (the real config)", () => {
  it("places all three Retina widgets against today's Retina structure, in the client's order", () => {
    const chapter = chapterWith(circuitSection());
    const result = applyWidgetPlacements(
      chapter,
      placementsForChapter("the-retina")
    );
    expect(result.unresolved).toEqual([]);
    expect(result.applied).toEqual([
      "retina-color-vision",
      "retina-direction-selectivity",
      "retina-retinabox",
    ]);
    const circuit = chapter.sections[0].paragraphs[1].subSection[0];
    // colour vision right after Dalton, inside the sub-subsection group
    expect(ids(circuit.paragraphs[0].subSubSection)).toEqual([
      "p3",
      "p4",
      "widget-retina-color-vision",
      "p6",
    ]);
    // direction selectivity then RetINaBox close Circuit computations,
    // immediately above Rod and cone pathways
    expect(ids(circuit.paragraphs).slice(-2)).toEqual([
      "widget-retina-direction-selectivity",
      "widget-retina-retinabox",
    ]);
  });

  it("has unique ids and only known kinds", () => {
    const seen = new Set();
    for (const p of WIDGET_PLACEMENTS) {
      expect(seen.has(p.id)).toBe(false);
      seen.add(p.id);
      expect(["breakout", "inline"]).toContain(p.kind);
      expect(p.anchors.length).toBeGreaterThan(0);
    }
  });
});

/* Attention & Working Memory (OPENBRAIN-34): two sections shaped like the
   transform's output for the seeded draft, trimmed to the anchor passages.
   Fresh per test — applyWidgetPlacements mutates in place. */
function attentionSections() {
  return [
    {
      id: "att-s2",
      slug: "attention-is-measured-behaviorally",
      title: "Attention is measured behaviorally",
      paragraphs: [
        {
          subSection: [
            {
              id: "att-sub-cocktail",
              title: "The cocktail party problem",
              paragraphs: [{ id: "a1", text: "Cherry's dichotic listening" }],
            },
            {
              id: "att-sub-sdt",
              title: "Signal detection theory",
              paragraphs: [
                {
                  id: "a2",
                  text: "The spatial cueing paradigm introduced by Michael Posner in 1980 became a major tool",
                },
                { id: "a3", text: "While Posner's original measurements" },
                // DB-authored block from the OPENBRAIN-26 seed
                {
                  id: "db-sdt",
                  type: "widget",
                  text: "",
                  widget: { widgetId: "sdt", kind: "breakout" },
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: "att-s3",
      slug: "neural-correlates-of-visual-attention",
      title: "Neural Correlates of Visual Attention.",
      paragraphs: [
        { id: "b1", text: "Many studies indicate that covertly attending" },
        { id: "b2", text: "Contrast gain causes left-ward shifts" },
        { id: "b3", text: "Response gain increases a neural responses across" },
        {
          id: "b4",
          text: "Attention biases competition between two stimuli residing in the same receptive field.",
        },
        {
          id: "b5",
          text: "This push-pull pattern led Treue and Martinez-Trujillo to propose the feature-similarity gain principle",
        },
        { id: "b6", text: "Normalization model: are the many forms" },
        { id: "b7", text: "Reynolds and Heeger (2009) proposed" },
        // DB-authored block from the OPENBRAIN-26 seed, last in the section
        {
          id: "db-normalization",
          type: "widget",
          text: "",
          widget: { widgetId: "normalization-model", kind: "breakout" },
        },
      ],
    },
  ];
}

describe("WIDGET_PLACEMENTS — Attention & Working Memory (OPENBRAIN-34)", () => {
  it("places the four route-only widgets at their passages, in reading order", () => {
    const chapter = chapterWith(...attentionSections());
    const result = applyWidgetPlacements(
      chapter,
      placementsForChapter("attention-and-working-memory")
    );
    expect(result.unresolved).toEqual([]);
    expect(result.skipped).toEqual([]);
    expect(result.applied).toEqual([
      "attention-posner-cueing",
      "attention-contrast-response-gain",
      "attention-biased-competition",
      "attention-feature-attention",
    ]);
    // Posner right after the paradigm paragraph, inside the SDT subsection.
    const sdt = chapter.sections[0].paragraphs[0].subSection[1];
    expect(ids(sdt.paragraphs)).toEqual([
      "a2",
      "widget-attention-posner-cueing",
      "a3",
      "db-sdt",
    ]);
    // Gain model after response gain; biased competition after its
    // paragraph; feature attention after the gain principle.
    expect(ids(chapter.sections[1].paragraphs)).toEqual([
      "b1",
      "b2",
      "b3",
      "widget-attention-contrast-response-gain",
      "b4",
      "widget-attention-biased-competition",
      "b5",
      "widget-attention-feature-attention",
      "b6",
      "b7",
      "db-normalization",
    ]);
  });

  it("skips a config placement for a widget the DB already carries (hasWidget)", () => {
    const chapter = chapterWith(...attentionSections());
    const result = applyWidgetPlacements(chapter, [
      ...placementsForChapter("attention-and-working-memory"),
      {
        id: "cfg-sdt",
        widgetId: "sdt",
        chapterSlug: "attention-and-working-memory",
        sectionSlug: "attention-is-measured-behaviorally",
        anchors: [{ endOfSection: true }],
      },
    ]);
    expect(result.skipped).toEqual(["cfg-sdt"]);
    expect(result.unresolved).toEqual([]);
    // Still exactly one SDT block, the DB one.
    const all = JSON.stringify(chapter);
    expect(all.match(/"widgetId":"sdt"/g)).toHaveLength(1);
  });

  it("does not configure SDT or the normalization model (DB-authored blocks)", () => {
    const ids = placementsForChapter("attention-and-working-memory").map(
      (p) => p.widgetId
    );
    expect(ids).not.toContain("sdt");
    expect(ids).not.toContain("normalization-model");
  });

  it("keeps a reworded passage's widget ahead of the next topic, never behind the normalization block", () => {
    const sections = attentionSections();
    // Reword the gain paragraphs AND the biased-competition paragraph: the
    // gain widget must still land before "feature-similarity"/"Normalization
    // model:", i.e. ahead of the DB normalization block.
    sections[1].paragraphs[1].text = "reworded";
    sections[1].paragraphs[2].text = "reworded";
    sections[1].paragraphs[3].text = "reworded";
    const chapter = chapterWith(...sections);
    const result = applyWidgetPlacements(
      chapter,
      placementsForChapter("attention-and-working-memory")
    );
    expect(result.unresolved).toEqual([]);
    const order = ids(chapter.sections[1].paragraphs);
    const gain = order.indexOf("widget-attention-contrast-response-gain");
    const biased = order.indexOf("widget-attention-biased-competition");
    const feature = order.indexOf("widget-attention-feature-attention");
    const norm = order.indexOf("db-normalization");
    expect(gain).toBeGreaterThan(-1);
    expect(gain).toBeLessThan(biased);
    expect(biased).toBeLessThan(feature);
    expect(feature).toBeLessThan(norm);
  });

  it("falls back to the end of the section only when nothing in it matches", () => {
    const sections = attentionSections();
    sections[1].paragraphs = [{ id: "only", text: "nothing recognisable" }];
    const chapter = chapterWith(...sections);
    const result = applyWidgetPlacements(
      chapter,
      placementsForChapter("attention-and-working-memory")
    );
    expect(result.unresolved).toEqual([]);
    expect(ids(chapter.sections[1].paragraphs)).toEqual([
      "only",
      "widget-attention-contrast-response-gain",
      "widget-attention-biased-competition",
      "widget-attention-feature-attention",
    ]);
  });
});
