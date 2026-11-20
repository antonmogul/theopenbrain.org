import { describe, expect, it } from "vitest";
import {
  buildSearchIndex,
  fold,
  queryTerms,
  searchChapter,
} from "@/helper/chapterSearch";
import { sectionLabelMap } from "@/composables/useChapterOutline";

/* A small chapter in the shape the reader holds (useText().text): an intro,
   a section with a subsection, a figure and a widget, and a breakout box
   placed after one of its paragraphs. */
const text = {
  intro: [
    {
      id: "intro",
      title: "History",
      sectionTitle: "Introduction",
      paragraphs: [
        { id: "p-intro", text: "<p>Oliver Sacks became a neurologist.</p>" },
      ],
    },
  ],
  sections: [
    {
      id: "mind",
      title: "Where is my mind?",
      paragraphs: [
        {
          id: "p-egypt",
          text: "<p>The Edwin Smith papyrus names the <em>brain</em> for the first time.<sup>3</sup></p>",
          animation: { id: "animationPapyrus", title: "The papyrus" },
        },
        {
          subSection: [
            {
              id: "hippocrates",
              title: "Hippocrates and the four humours",
              paragraphs: [
                {
                  id: "p-humours",
                  text: "<p>Santiago Ramón y Cajal had not yet drawn a neuron; the humours ruled.</p>",
                },
              ],
            },
          ],
        },
        {
          id: "p-widget",
          type: "widget",
          widget: {
            widgetId: "phrenology",
            title: "Phrenology head",
            blurb: "Press a faculty to read what Gall claimed.",
          },
        },
        { id: "p-last", text: "<p>Descartes placed the soul elsewhere.</p>" },
      ],
    },
    {
      id: "box-descartes",
      kind: "box",
      title: "Separating mind from body: Descartes and dualism",
      anchored: true,
      anchorParagraphId: "p-egypt",
      paragraphs: [
        {
          id: "p-box",
          text: "<p>Descartes’ skull was missing until 1821.</p>",
          explore: {
            title: "The skull in Paris",
            legend: "The skull, Musée de l’homme.",
          },
        },
      ],
    },
  ],
};
const figures = [
  {
    id: "animationPapyrus",
    title: "The Edwin Smith papyrus",
    figureNumber: 5,
    caption: "Case six, in hieratic.",
    images: [{ caption: "The translation by Breasted." }],
  },
];
const index = buildSearchIndex(text, {
  labels: sectionLabelMap(text.sections),
  figures,
});
const find = (q, opts) => searchChapter(index, q, opts);
const plain = (parts) => parts.map((p) => p.text).join("");
const hits = (parts) => parts.filter((p) => p.hit).map((p) => p.text);

describe("fold", () => {
  it("drops case and accents and straightens quotes, a character for a character", () => {
    expect(fold("Ramón y Cajal’s")).toBe("ramon y cajal's");
    expect(fold("Musée de l’homme").length).toBe("Musée de l’homme".length);
  });
});

describe("queryTerms", () => {
  it("splits on spaces, folds and drops repeats", () => {
    expect(queryTerms("  Cajal   NEURON cajal ")).toEqual(["cajal", "neuron"]);
  });
});

describe("buildSearchIndex", () => {
  it("lists headings, paragraphs, boxes, widgets and figures in reading order", () => {
    expect(
      index.map((e) => `${e.kind}:${e.title || e.body.slice(0, 18)}`)
    ).toEqual([
      "section:Introduction",
      "text:Oliver Sacks becam",
      "section:Where is my mind?",
      "text:The Edwin Smith pa",
      "figure:The Edwin Smith papyrus",
      // The box sits right after the paragraph it is anchored to.
      "box:Separating mind from body: Descartes and dualism",
      "subsection:The skull in Paris",
      "text:Descartes’ skull w",
      "figure:The skull, Musée d",
      "subsection:Hippocrates and the four humours",
      "text:Santiago Ramón y C",
      "widget:Phrenology head",
      "text:Descartes placed t",
    ]);
  });

  it("anchors every entry on something readerJump can find", () => {
    for (const entry of index) expect(entry.id).toBeTruthy();
    const byTitle = (t) => index.find((e) => e.title === t);
    expect(byTitle("Where is my mind?").id).toBe("mind");
    expect(byTitle("Hippocrates and the four humours").id).toBe("hippocrates");
    expect(byTitle("The Edwin Smith papyrus").id).toBe("p-egypt");
    expect(byTitle("Phrenology head").id).toBe("p-widget");
  });

  it("says what each row is and where it is", () => {
    const figure = index.find((e) => e.kind === "figure");
    expect(figure.tag).toBe("Fig 05");
    expect(figure.where).toBe("1 · Where is my mind?");
    // The legend: the figure's own and each image's.
    expect(figure.body).toBe(
      "Case six, in hieratic. The translation by Breasted."
    );
    const box = index.find((e) => e.kind === "box");
    // A box is named by its title, shortened, never by a letter: the
    // reader no longer prints "Breakout box A" (OPENBRAIN-193).
    expect(box.tag).toBe("Box");
    expect(index.find((e) => e.id === "p-box").where).toBe(
      "Separating mind from body: Descartes and…"
    );
    for (const entry of index) {
      expect(entry.tag).not.toMatch(/^Box [A-Z]$/);
      expect(entry.where).not.toMatch(/^Box [A-Z]$/);
    }
    expect(index.find((e) => e.kind === "widget").tag).toBe("Interactive");
  });

  it("keeps citation numbers and markup out of the text", () => {
    const egypt = index.find((e) => e.id === "p-egypt" && e.kind === "text");
    expect(egypt.body).toBe(
      "The Edwin Smith papyrus names the brain for the first time."
    );
  });

  it("survives a chapter that has not loaded", () => {
    expect(buildSearchIndex(null)).toEqual([]);
    expect(buildSearchIndex({})).toEqual([]);
  });
});

describe("searchChapter", () => {
  it("finds nothing for an empty or one-letter query", () => {
    expect(find("").results).toEqual([]);
    expect(find(" d ").results).toEqual([]);
  });

  it("marks the matching words where they are", () => {
    const { results, total } = find("papyrus");
    expect(total).toBe(2);
    const figure = results.find((r) => r.entry.kind === "figure");
    expect(plain(figure.title)).toBe("The Edwin Smith papyrus");
    expect(hits(figure.title)).toEqual(["papyrus"]);
    const text = results.find((r) => r.entry.kind === "text");
    expect(hits(text.body)).toEqual(["papyrus"]);
  });

  it("puts headings first, then figure and widget titles, then text in reading order", () => {
    expect(find("descartes").results.map((r) => r.entry.kind)).toEqual([
      "box",
      "text",
      "text",
    ]);
    expect(find("descartes").results.map((r) => r.entry.id)).toEqual([
      "box-descartes",
      "p-box",
      "p-last",
    ]);
  });

  it("ignores case and accents and keeps the original spelling in the row", () => {
    const [row] = find("ramon CAJAL").results;
    expect(row.entry.id).toBe("p-humours");
    expect(hits(row.body)).toEqual(["Ramón", "Cajal"]);
  });

  it("needs every word, in the title or the text", () => {
    expect(find("skull 1821").results.map((r) => r.entry.id)).toEqual([
      "p-box",
    ]);
    expect(find("skull 1999").total).toBe(0);
    // One word in the title, the other in the legend.
    expect(find("papyrus hieratic").results[0].entry.kind).toBe("figure");
  });

  it("finds a figure by its legend and a widget by its blurb", () => {
    expect(find("breasted").results[0].entry.tag).toBe("Fig 05");
    expect(find("gall claimed").results[0].entry.kind).toBe("widget");
  });

  it("shows a long paragraph as a window around the first match", () => {
    const long = buildSearchIndex({
      sections: [
        {
          id: "s",
          title: "Long",
          paragraphs: [
            {
              id: "p",
              text: `<p>${"lorem ipsum dolor sit amet ".repeat(12)}the pineal gland ${"consectetur adipiscing elit ".repeat(12)}</p>`,
            },
          ],
        },
      ],
    });
    const [row] = searchChapter(long, "pineal").results;
    const shown = plain(row.body);
    expect(shown.length).toBeLessThan(150);
    expect(shown.startsWith("…")).toBe(true);
    expect(shown.endsWith("…")).toBe(true);
    expect(hits(row.body)).toEqual(["pineal"]);
  });

  it("stops at the limit and still counts everything", () => {
    const { results, total } = find("the", { limit: 2 });
    expect(results).toHaveLength(2);
    expect(total).toBeGreaterThan(2);
  });
});

describe("container figure records", () => {
  it("indexes numbered subsection/group figures and fullscreen figures without duplicating a repeated record", () => {
    const chapter = {
      sections: [
        {
          id: "section",
          title: "Retinal development",
          paragraphs: [
            {
              subSection: [
                {
                  id: "waves",
                  title: "Waves",
                  animation: { id: "animationWaves", title: "Waves" },
                  paragraphs: [
                    { id: "p1", text: "Waves travel across the retina." },
                    {
                      id: "p2",
                      text: "The waves continue.",
                      animation: { id: "animationWaves" },
                    },
                    {
                      id: "group",
                      animation: { id: "animationGanglion" },
                      paragraphs: [
                        {
                          id: "widget-first",
                          type: "widget",
                          widget: { widgetId: "test", title: "Explore" },
                        },
                      ],
                    },
                    {
                      id: "full",
                      animationFull: true,
                      animationId: "animationGallery",
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
    const records = [
      {
        id: "animationWaves",
        title: "Spontaneous waves of activity",
        figureNumber: 20,
      },
      { id: "animationGanglion", title: "Ganglion cells", figureNumber: 17 },
      {
        id: "animationGallery",
        title: "Lateral organization",
        figureNumber: 5,
      },
    ];
    const entries = buildSearchIndex(chapter, { figures: records }).filter(
      (e) => e.kind === "figure"
    );
    expect(
      entries.map((e) => ({ id: e.id, tag: e.tag, title: e.title }))
    ).toEqual([
      { id: "p1", tag: "Fig 20", title: "Spontaneous waves of activity" },
      { id: "widget-first", tag: "Fig 17", title: "Ganglion cells" },
      { id: "full", tag: "Fig 05", title: "Lateral organization" },
    ]);
    expect(
      searchChapter(
        buildSearchIndex(chapter, { figures: records }),
        "Spontaneous waves"
      ).results[0].entry.tag
    ).toBe("Fig 20");
  });
});
