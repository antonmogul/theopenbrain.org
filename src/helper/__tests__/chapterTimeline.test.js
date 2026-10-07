import { describe, expect, it } from "vitest";
import {
  PEEK_H,
  READING_LINE,
  REST_H,
  barHeight,
  buildTimeline,
  layoutBars,
  monotonic,
  plainText,
  positionForY,
  scrollYForIndex,
  sectionIndexOf,
} from "@/helper/chapterTimeline";
import retina from "@/assets/json_backend/text.json";

// Words, as a paragraph's HTML.
const words = (n, word = "word") =>
  `<p>${Array.from({ length: n }, () => word).join(" ")}</p>`;
const para = (id, n = 10, extra = {}) => ({ id, text: words(n), ...extra });
const ids = (model) => model.items.map((i) => i.id);

describe("timeline constants", () => {
  it("publishes the reading line and the dock heights", () => {
    expect(READING_LINE).toBe(0.4);
    expect(REST_H).toBe(20);
    expect(PEEK_H).toBe(104);
  });
});

describe("plainText", () => {
  it("strips tags, decodes entities and collapses whitespace", () => {
    expect(
      plainText(
        "<p><strong>Rhodopsin</strong>: in the&nbsp;mid-1870s</p>\n<p>Boll &amp; Kühne&#8217;s &#x2014; work &lt;1878&gt;</p>"
      )
    ).toBe("Rhodopsin: in the mid-1870s Boll & Kühne’s — work <1878>");
  });

  it("leaves an entity it doesn't know as written", () => {
    expect(plainText("K&uuml;hne &#0; &bogus;")).toBe(
      "K&uuml;hne &#0; &bogus;"
    );
  });

  it("keeps words apart across block tags and line breaks", () => {
    expect(plainText("one<br>two</p><p>three<li>four")).toBe(
      "one two three four"
    );
  });

  it("is empty for missing input", () => {
    expect(plainText(undefined)).toBe("");
    expect(plainText(42)).toBe("");
  });

  it("drops citation and footnote markers instead of gluing their numbers on", () => {
    // The Retina (text.json, imported as is).
    expect(
      plainText(
        "are amacrine cells<sup data-sup='17'>17,</sup><sup data-sup='21'>21</sup>. These are"
      )
    ).toBe("are amacrine cells. These are");
    expect(plainText('signal<sup data-sup="28 29">28,29</sup>. By')).toBe(
      "signal. By"
    );
    // citation_ref blocks (chapterTransform).
    expect(
      plainText(
        'non-lethal<sup class="citation-ref" data-ref="2">2</sup>. Then'
      )
    ).toBe("non-lethal. Then");
    // A bare <sup> number after punctuation is a citation too.
    expect(plainText("disquiet in the animal.<sup>31</sup>” Next")).toBe(
      "disquiet in the animal.” Next"
    );
  });

  it("keeps the text of other superscripts", () => {
    expect(
      plainText(
        "In 5<sup>th</sup> century BCE, Na<sup>+</sup> at ~40mm<sup>2</sup>"
      )
    ).toBe("In 5th century BCE, Na+ at ~40mm2");
  });
});

describe("buildTimeline: render order", () => {
  it("returns an empty model for no chapter", () => {
    for (const text of [null, undefined, {}]) {
      const model = buildTimeline(text);
      expect(model.items).toEqual([]);
      expect(model.sections).toEqual([]);
      expect(model.subsections).toEqual([]);
      expect(model.maxWords).toBe(1);
      expect(model.byId.size).toBe(0);
    }
  });

  it("walks the intro, then the top-level sections, with their labels", () => {
    const model = buildTimeline(
      {
        intro: [
          {
            id: "intro",
            title: "The Retina",
            sectionTitle: "Introduction",
            paragraphs: [para("i1"), para("i2")],
          },
        ],
        sections: [
          { id: "s1", title: "Story of the eye", paragraphs: [para("p1")] },
          { id: "s2", title: "Cell types", paragraphs: [para("p2")] },
        ],
      },
      { labels: { intro: "0", s1: "1", s2: "2" } }
    );
    expect(ids(model)).toEqual(["i1", "i2", "p1", "p2"]);
    expect(model.items.map((i) => i.index)).toEqual([0, 1, 2, 3]);
    expect(model.items.map((i) => i.sectionKey)).toEqual([
      "intro",
      "intro",
      "s1",
      "s2",
    ]);
    expect(model.sections).toEqual([
      {
        key: "intro",
        label: "",
        title: "Introduction",
        kind: "intro",
        anchorId: "intro",
        start: 0,
        end: 2,
        continued: false,
      },
      {
        key: "s1",
        label: "1",
        title: "Story of the eye",
        kind: "section",
        anchorId: "s1",
        start: 2,
        end: 3,
        continued: false,
      },
      {
        key: "s2",
        label: "2",
        title: "Cell types",
        kind: "section",
        anchorId: "s2",
        start: 3,
        end: 4,
        continued: false,
      },
    ]);
  });

  it("keys a section without an id by its title and labels it ''", () => {
    const model = buildTimeline({
      sections: [{ title: "Untracked", paragraphs: [para("p1")] }],
    });
    expect(model.sections[0]).toMatchObject({
      key: "Untracked",
      label: "",
      anchorId: null,
    });
    expect(model.items[0].sectionKey).toBe("Untracked");
  });

  it("drops sections with no items", () => {
    const model = buildTimeline({
      sections: [
        { id: "empty", title: "Empty", paragraphs: [{ id: "x", text: "" }] },
        { id: "s1", title: "One", paragraphs: [para("p1")] },
      ],
    });
    expect(model.sections.map((s) => s.key)).toEqual(["s1"]);
  });

  it("walks subsection wrappers and records each titled header", () => {
    const model = buildTimeline({
      sections: [
        {
          id: "s1",
          title: "Organization",
          paragraphs: [
            para("p1"),
            {
              subSection: [
                {
                  id: "sub-a",
                  title: " Cross-sectional anatomy ",
                  paragraphs: [para("a1"), para("a2")],
                },
                // Untitled: a figure wrapper, not a heading in the contents.
                { id: "sub-b", paragraphs: [para("b1")] },
                // A heading with nothing under it has no bar to point at.
                { id: "sub-c", title: "Empty", paragraphs: [] },
                {
                  id: "sub-d",
                  title: "Cell classes",
                  paragraphs: [para("d1")],
                },
              ],
            },
            para("p2"),
          ],
        },
      ],
    });
    expect(ids(model)).toEqual(["p1", "a1", "a2", "b1", "d1", "p2"]);
    expect(model.subsections).toEqual([
      {
        title: "Cross-sectional anatomy",
        anchorId: "sub-a",
        sectionKey: "s1",
        start: 1,
      },
      { title: "Cell classes", anchorId: "sub-d", sectionKey: "s1", start: 4 },
    ]);
  });

  it("walks sub-subsection leaves and groups in order", () => {
    const model = buildTimeline({
      sections: [
        {
          id: "s1",
          title: "Photoreceptors",
          paragraphs: [
            {
              subSection: [
                {
                  id: "sub",
                  title: "Synaptic architecture",
                  paragraphs: [
                    para("a1"),
                    {
                      subSubSection: [
                        para("leaf1"),
                        {
                          paragraphs: [
                            para("g1"),
                            // A bare { paragraphs } wrapper inside a group.
                            { paragraphs: [para("g2")] },
                          ],
                        },
                        {
                          id: "video",
                          type: "breakVideo",
                          title: "John Dowling",
                          text: "Retinal cell types.",
                        },
                      ],
                    },
                    para("a2"),
                  ],
                },
              ],
            },
          ],
        },
      ],
    });
    expect(ids(model)).toEqual(["a1", "leaf1", "g1", "g2", "video", "a2"]);
    expect(model.items[4].kind).toBe("break");
  });

  it("places an anchored box right after its paragraph, as its own section", () => {
    const box = {
      id: "box-1",
      title: "Phrenology",
      kind: "box",
      parentId: "s1",
      anchorParagraphId: "p1",
      anchored: true,
      paragraphs: [para("x1"), para("x2")],
    };
    const model = buildTimeline(
      {
        sections: [
          {
            id: "s1",
            title: "History",
            kind: "section",
            paragraphs: [para("p1"), para("p2")],
          },
          box,
          {
            id: "s2",
            title: "Next",
            kind: "section",
            paragraphs: [para("q1")],
          },
        ],
      },
      { labels: { s1: "1", "box-1": "A", s2: "2" } }
    );
    expect(ids(model)).toEqual(["p1", "x1", "x2", "p2", "q1"]);
    expect(model.items.map((i) => i.sectionKey)).toEqual([
      "s1",
      "box-1",
      "box-1",
      "s1",
      "s2",
    ]);
    // The interrupted section resumes as a continued run.
    expect(
      model.sections.map(({ key, label, kind, start, end, continued }) => ({
        key,
        label,
        kind,
        start,
        end,
        continued,
      }))
    ).toEqual([
      {
        key: "s1",
        label: "1",
        kind: "section",
        start: 0,
        end: 1,
        continued: false,
      },
      {
        key: "box-1",
        label: "A",
        kind: "box",
        start: 1,
        end: 3,
        continued: false,
      },
      {
        key: "s1",
        label: "1",
        kind: "section",
        start: 3,
        end: 4,
        continued: true,
      },
      {
        key: "s2",
        label: "2",
        kind: "section",
        start: 4,
        end: 5,
        continued: false,
      },
    ]);
  });

  it("walks an unanchored box in section order", () => {
    const model = buildTimeline({
      sections: [
        { id: "s1", title: "One", paragraphs: [para("p1")] },
        {
          id: "box-a",
          title: "Aside",
          kind: "box",
          paragraphs: [para("x1")],
        },
      ],
    });
    expect(model.sections.map((s) => [s.key, s.kind])).toEqual([
      ["s1", "section"],
      ["box-a", "box"],
    ]);
  });

  it("places a box after a widget paragraph too, and walks it once", () => {
    const model = buildTimeline({
      sections: [
        {
          id: "s1",
          title: "One",
          paragraphs: [
            {
              id: "w1",
              type: "widget",
              text: "",
              widget: { widgetId: "sdt", title: "SDT" },
            },
            para("p2"),
          ],
        },
        {
          id: "box-1",
          title: "Aside",
          kind: "box",
          anchored: true,
          anchorParagraphId: "w1",
          // Bad data: a paragraph with its anchor's id. Visiting it must not
          // walk the box again.
          paragraphs: [para("x1"), para("w1", 3)],
        },
      ],
    });
    expect(ids(model)).toEqual(["w1", "x1", "w1", "p2"]);
    expect(model.byId.get("w1")).toBe(0);
  });
});

describe("buildTimeline: items", () => {
  it("makes a widget paragraph a widget item", () => {
    const model = buildTimeline({
      sections: [
        {
          id: "s1",
          title: "Attention",
          paragraphs: [
            {
              id: "widget-sdt-in-attention",
              type: "widget",
              text: "",
              widget: {
                placementId: "sdt-in-attention",
                widgetId: "sdt",
                kind: "inline",
                title: "Signal detection",
                blurb: "<em>Drag</em> the criterion.",
                credit: "Adapted from Tyler",
                route: "/sdt",
              },
            },
          ],
        },
      ],
    });
    expect(model.items[0]).toEqual({
      index: 0,
      id: "widget-sdt-in-attention",
      kind: "widget",
      sectionKey: "s1",
      words: 0,
      excerpt: "Drag the criterion.",
      title: "Signal detection",
      marks: [{ type: "widget", title: "Signal detection" }],
      widget: {
        widgetId: "sdt",
        placementId: "sdt-in-attention",
        kind: "inline",
        title: "Signal detection",
        blurb: "<em>Drag</em> the criterion.",
        credit: "Adapted from Tyler",
      },
    });
    expect(model.byId.get("widget-sdt-in-attention")).toBe(0);
  });

  it("falls back to the widget's title and id, and a breakout kind", () => {
    const model = buildTimeline({
      sections: [
        {
          id: "s1",
          title: "One",
          paragraphs: [
            { id: "w1", type: "widget", widget: { widgetId: "posner" } },
            { id: "w2", type: "widget", widget: { widgetId: "x", title: "X" } },
          ],
        },
      ],
    });
    expect(model.items[0]).toMatchObject({
      title: "posner",
      excerpt: "posner",
      marks: [{ type: "widget", title: "posner" }],
      widget: { widgetId: "posner", placementId: "posner", kind: "breakout" },
    });
    expect(model.items[1].excerpt).toBe("X");
  });

  it("makes break videos and break sections break items", () => {
    const model = buildTimeline({
      sections: [
        {
          id: "s1",
          title: "One",
          paragraphs: [
            {
              id: "v",
              type: "breakVideo",
              title: "Tom Baden",
              text: "discussing 'Is our retina really upside down?'",
            },
            {
              id: "b",
              type: "breakSection",
              title: "Blind spot",
              steps: ["Close your left eye."],
              text: "Due to the optic nerve, each retina has a blind spot.",
            },
            // Untitled: the Retina's "Counting photons" box.
            {
              id: "c",
              type: "breakSection",
              text: "<strong>Counting photons:</strong> The photoreceptor…",
            },
          ],
        },
      ],
    });
    const [video, section, untitled] = model.items;
    expect(video).toMatchObject({
      kind: "break",
      words: 0,
      title: "Tom Baden",
      excerpt: "Tom Baden",
      marks: [{ type: "video", title: "Tom Baden" }],
    });
    expect(section).toMatchObject({
      kind: "break",
      title: "Blind spot",
      excerpt: "Blind spot",
      marks: [{ type: "break", title: "Blind spot" }],
    });
    expect(untitled).toMatchObject({
      title: "Break",
      excerpt: "Counting photons: The photoreceptor…",
      marks: [{ type: "break", title: "Break" }],
    });
  });

  it("counts words and clips the excerpt to 140 characters", () => {
    const long = `<p>${"Lorem ipsum dolor sit amet, ".repeat(10)}</p>`;
    const model = buildTimeline({
      sections: [
        {
          id: "s1",
          title: "One",
          paragraphs: [
            { id: "p1", text: long },
            { id: "p2", text: "<p>Short <em>and</em> sweet.</p>" },
          ],
        },
      ],
    });
    const [p1, p2] = model.items;
    expect(p1.words).toBe(50);
    expect(p1.excerpt.length).toBeLessThanOrEqual(140);
    expect(p1.excerpt.endsWith("…")).toBe(true);
    expect(p1.excerpt.startsWith("Lorem ipsum dolor sit amet,")).toBe(true);
    expect(p1.excerpt).not.toMatch(/\s…$/);
    expect(p2).toMatchObject({ words: 3, excerpt: "Short and sweet." });
    expect(p2.title).toBeUndefined();
  });

  it("collects the content marks a paragraph carries", () => {
    const model = buildTimeline({
      sections: [
        {
          id: "s1",
          title: "One",
          paragraphs: [
            para("fig", 5, {
              animation: { name: "EyeStructur", id: "animationEyeStructur" },
            }),
            para("titled", 5, {
              animation: {
                name: "Pupil",
                id: "animationPupil",
                title: "Pupillary reflex",
              },
            }),
            para("img", 5, {
              img: "GABAergic",
              imgCap: "<em>Starburst</em> amacrine cells",
            }),
            para("bare-img", 5, { img: "x" }),
            para("yt", 5, { video: { youtubeId: "abc", title: "" } }),
            {
              id: "full",
              animationFull: true,
              animationId: "animationPhototransduction",
              text: "",
            },
            {
              id: "full-titled",
              animationFull: true,
              animationId: "animationPLR",
              title: "Pathway for the pupillary light reflex",
            },
          ],
        },
      ],
    });
    expect(model.items.map((i) => i.marks)).toEqual([
      [{ type: "figure", title: "EyeStructur" }],
      [{ type: "figure", title: "Pupillary reflex" }],
      [{ type: "image", title: "Starburst amacrine cells" }],
      [{ type: "image", title: "Image" }],
      [{ type: "video", title: "Video" }],
      [{ type: "figure", title: "Phototransduction" }],
      [{ type: "figure", title: "Pathway for the pupillary light reflex" }],
    ]);
  });

  it("marks the first item under a section, subsection or group with its figure", () => {
    const model = buildTimeline({
      intro: [
        {
          id: "intro",
          animation: { name: "dragon" },
          paragraphs: [para("i1")],
        },
      ],
      sections: [
        {
          id: "s1",
          title: "One",
          animation: {
            name: "Cells",
            id: "animationCells",
            title: "Cell types",
          },
          paragraphs: [
            {
              subSection: [
                {
                  id: "a",
                  title: "A",
                  animation: { name: "Cells", id: "animationCells" },
                  paragraphs: [para("a1"), para("a2")],
                },
                {
                  id: "b",
                  title: "B",
                  animation: { name: "Synapse", id: "animationSynapse" },
                  paragraphs: [
                    {
                      subSubSection: [
                        {
                          animation: { name: "Rods", id: "animationRods" },
                          paragraphs: [para("g1")],
                        },
                      ],
                    },
                  ],
                },
                // Its figure has no item to land on: it lapses.
                {
                  id: "c",
                  title: "C",
                  animation: { name: "Lost", id: "animationLost" },
                  paragraphs: [],
                },
              ],
            },
            para("p2"),
          ],
        },
        {
          id: "s2",
          title: "Looking forward",
          animation: { name: "Placeholder" },
          paragraphs: [para("q1")],
        },
      ],
    });
    const marks = Object.fromEntries(model.items.map((i) => [i.id, i.marks]));
    expect(marks.i1).toEqual([{ type: "figure", title: "dragon" }]);
    // The section's figure; subsection A repeats it, so once.
    expect(marks.a1).toEqual([{ type: "figure", title: "Cell types" }]);
    expect(marks.a2).toEqual([]);
    expect(marks.g1).toEqual([
      { type: "figure", title: "Synapse" },
      { type: "figure", title: "Rods" },
    ]);
    expect(marks.p2).toEqual([]);
    // A placeholder trigger is not a figure.
    expect(marks.q1).toEqual([]);
  });

  it("adds a subsection's full-screen figure to its last item", () => {
    const model = buildTimeline({
      sections: [
        {
          id: "s1",
          title: "One",
          paragraphs: [
            {
              subSection: [
                {
                  id: "a",
                  title: "Waves",
                  animationFull: true,
                  paragraphs: [para("a1"), para("a2")],
                },
              ],
            },
          ],
        },
      ],
    });
    expect(model.items[1].marks).toEqual([{ type: "figure", title: "Waves" }]);
  });

  it("skips further reading, footnotes, the references list and empty text", () => {
    const model = buildTimeline({
      sections: [
        {
          id: "s1",
          title: "One",
          paragraphs: [
            para("p1"),
            { id: "fr", _isFurtherReading: true, text: words(20) },
            { id: "fn", _isFootnote: true, text: words(20) },
            { id: "blank", text: "<p> &nbsp; </p>" },
            // No words, but an image: keeps a (minimum-height) bar.
            { id: "picture", text: "", img: "retina" },
          ],
        },
        {
          id: "r1",
          slug: "references",
          title: "Sources",
          paragraphs: [para("r")],
        },
        { id: "r2", title: " References ", paragraphs: [para("r2p")] },
        { id: "r3", title: "Footnotes", paragraphs: [para("r3p")] },
      ],
    });
    expect(ids(model)).toEqual(["p1", "picture"]);
    expect(model.items[1]).toMatchObject({ kind: "text", words: 0 });
    expect(barHeight(model.items[1], model.maxWords)).toBe(0.15);
  });

  it("maps every paragraph id to its item, and names items without one", () => {
    const model = buildTimeline({
      sections: [
        {
          id: "s1",
          title: "One",
          paragraphs: [para("p1"), { text: words(5) }, para("p3")],
        },
      ],
    });
    expect(ids(model)).toEqual(["p1", "tl-1", "p3"]);
    expect([...model.byId]).toEqual([
      ["p1", 0],
      ["p3", 2],
    ]);
  });

  it("uses the 95th percentile of text words as the full-height reference", () => {
    const paragraphs = Array.from({ length: 20 }, (_, i) =>
      para(`p${i}`, i + 1)
    );
    paragraphs.push({ id: "w", type: "widget", widget: { widgetId: "x" } });
    const model = buildTimeline({
      sections: [{ id: "s1", title: "One", paragraphs }],
    });
    // Words 1..20: the nearest-rank 95th percentile is 19.
    expect(model.maxWords).toBe(19);
    const onlyWidgets = buildTimeline({
      sections: [
        {
          id: "s1",
          title: "One",
          paragraphs: [{ id: "w", type: "widget", widget: { widgetId: "x" } }],
        },
      ],
    });
    expect(onlyWidgets.maxWords).toBe(1);
  });
});

describe("buildTimeline over the Retina (text.json)", () => {
  const sections = retina.sections;
  const model = buildTimeline(retina, {
    labels: Object.fromEntries(sections.map((s, i) => [s.id, String(i + 1)])),
  });

  it("has items in render order, each with an id", () => {
    expect(model.items.length).toBeGreaterThan(50);
    model.items.forEach((item, i) => {
      expect(item.index).toBe(i);
      expect(typeof item.id).toBe("string");
      expect(item.id.length).toBeGreaterThan(0);
      expect(["text", "widget", "break"]).toContain(item.kind);
    });
    // The intro opens the chapter; the Tom Baden break follows the blind spot.
    expect(model.items[0].sectionKey).toBe(retina.intro[0].id);
    const baden = model.items.findIndex((i) => i.title === "Tom Baden");
    const blindSpot = model.items.findIndex((i) => i.title === "Blind spot");
    expect(blindSpot).toBeGreaterThan(0);
    expect(baden).toBe(blindSpot + 1);
  });

  it("partitions the items into contiguous section runs", () => {
    expect(model.sections[0]).toMatchObject({ kind: "intro", start: 0 });
    let next = 0;
    for (const section of model.sections) {
      expect(section.start).toBe(next);
      expect(section.end).toBeGreaterThan(section.start);
      for (let i = section.start; i < section.end; i++)
        expect(model.items[i].sectionKey).toBe(section.key);
      next = section.end;
    }
    expect(next).toBe(model.items.length);
    expect(model.sections.map((s) => s.label)).toEqual([
      "",
      ...sections.map((_, i) => String(i + 1)),
    ]);
  });

  it("maps ids to items and lists titled subsections in order", () => {
    for (const [id, index] of model.byId)
      expect(model.items[index].id).toBe(id);
    expect(model.subsections.length).toBeGreaterThan(10);
    let last = -1;
    for (const sub of model.subsections) {
      expect(sub.title).toBe(sub.title.trim());
      expect(sub.title.length).toBeGreaterThan(0);
      expect(sub.start).toBeGreaterThanOrEqual(last);
      expect(model.items[sub.start].sectionKey).toBe(sub.sectionKey);
      last = sub.start;
    }
  });

  it("has a sane full-height reference and content marks", () => {
    expect(model.maxWords).toBeGreaterThanOrEqual(1);
    const types = new Set(
      model.items.flatMap((i) => i.marks.map((m) => m.type))
    );
    for (const t of ["figure", "image", "video", "break"])
      expect(types).toContain(t);
    for (const item of model.items) {
      expect(item.excerpt.length).toBeLessThanOrEqual(140);
      const h = barHeight(item, model.maxWords);
      expect(h).toBeGreaterThanOrEqual(0.15);
      expect(h).toBeLessThanOrEqual(1);
    }
  });
});

describe("barHeight", () => {
  it("scales text by words and clamps to 0.15..1", () => {
    expect(barHeight({ kind: "text", words: 50 }, 100)).toBe(0.5);
    expect(barHeight({ kind: "text", words: 1 }, 100)).toBe(0.15);
    expect(barHeight({ kind: "text", words: 400 }, 100)).toBe(1);
    expect(barHeight({ kind: "text", words: 3 }, 0)).toBe(1);
  });

  it("draws widgets and breaks full height", () => {
    expect(barHeight({ kind: "widget", words: 0 }, 100)).toBe(1);
    expect(barHeight({ kind: "break", words: 0 }, 100)).toBe(1);
  });
});

describe("layoutBars", () => {
  // Items in sections of the given sizes, `words` each.
  function fixture(sizes, extra = () => ({})) {
    const items = [];
    const sections = [];
    sizes.forEach((size, s) => {
      sections.push({
        key: `s${s}`,
        start: items.length,
        end: items.length + size,
      });
      for (let i = 0; i < size; i++)
        items.push({
          index: items.length,
          kind: "text",
          words: 50,
          sectionKey: `s${s}`,
          ...extra(items.length),
        });
    });
    return { items, sections };
  }
  const right = (bars) => bars[bars.length - 1].x + bars[bars.length - 1].w;

  it("draws one equal bar per item with 1px gaps and 4px before a section", () => {
    const { items, sections } = fixture([3, 2]);
    const { bars } = layoutBars(items, sections, 106);
    expect(bars).toHaveLength(5);
    // 106 - 3 bar gaps - 1 section gap = 99 → 19.8 each.
    for (const bar of bars) expect(bar.w).toBeCloseTo(19.8);
    expect(bars.map((b) => b.x)).toEqual(
      [0, 20.8, 41.6, 65.4, 86.2].map((x) => expect.closeTo(x, 6))
    );
    expect(right(bars)).toBeCloseTo(106);
    expect(bars.map((b) => [b.from, b.to])).toEqual([
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
    ]);
    expect(bars.map((b) => b.sectionStart)).toEqual([
      true,
      false,
      false,
      true,
      false,
    ]);
    expect(bars.map((b) => b.sectionKey)).toEqual([
      "s0",
      "s0",
      "s0",
      "s1",
      "s1",
    ]);
  });

  it("gives each bar its height and kind", () => {
    const { items, sections } = fixture([3]);
    items[1].words = 25;
    items[2] = { ...items[2], kind: "widget", words: 0 };
    const { bars } = layoutBars(items, sections, 300, 50);
    expect(bars.map((b) => b.height)).toEqual([1, 0.5, 1]);
    expect(bars.map((b) => b.kind)).toEqual(["text", "text", "block"]);
  });

  it("derives the reference from the items when none is passed", () => {
    // 20 items of 1..20 words: the reference is 19, as buildTimeline's.
    const { items, sections } = fixture([20], (i) => ({ words: i + 1 }));
    const { bars } = layoutBars(items, sections, 400);
    expect(bars[18].height).toBe(1);
    expect(bars[9].height).toBeCloseTo(10 / 19);
  });

  it("merges neighbours of the same section when items get narrower than 3px", () => {
    const { items, sections } = fixture([100, 7, 93]);
    items[150].kind = "break";
    const width = 300;
    const { bars } = layoutBars(items, sections, width);
    expect(bars.length).toBeLessThan(items.length);
    for (const bar of bars) {
      expect(bar.w).toBeGreaterThanOrEqual(2);
      // A bucket never spans two sections.
      expect(items[bar.from].sectionKey).toBe(items[bar.to - 1].sectionKey);
    }
    // Buckets tile the items with no hole or overlap.
    let next = 0;
    for (const bar of bars) {
      expect(bar.from).toBe(next);
      expect(bar.to).toBeGreaterThan(bar.from);
      next = bar.to;
    }
    expect(next).toBe(items.length);
    expect(right(bars)).toBeCloseTo(width);
    expect(bars.find((b) => b.from <= 150 && 150 < b.to).kind).toBe("block");
    expect(bars.filter((b) => b.sectionStart).map((b) => b.from)).toEqual([
      0, 100, 107,
    ]);
  });

  it("keeps one bar per item while there is room", () => {
    const { items, sections } = fixture([50]);
    const { bars } = layoutBars(items, sections, 150);
    expect(bars).toHaveLength(50);
    expect(bars[0].w).toBeCloseTo((150 - 49) / 50);
  });

  it("splits runs on a change of section key even without sections", () => {
    const { items } = fixture([2, 2]);
    const { bars } = layoutBars(items, [], 200);
    expect(bars.map((b) => b.sectionStart)).toEqual([true, false, true, false]);
  });

  it("finds the item under x, the nearer bar in a gap, clamped at the ends", () => {
    const { items, sections } = fixture([3, 2]);
    const { bars, indexAtX } = layoutBars(items, sections, 106);
    expect(indexAtX(10)).toBe(0);
    expect(indexAtX(bars[2].x + 1)).toBe(2);
    // The 4px section gap between bar 2 (ends 61.4) and bar 3 (starts 65.4).
    expect(indexAtX(62)).toBe(2);
    expect(indexAtX(65)).toBe(3);
    expect(indexAtX(-50)).toBe(0);
    expect(indexAtX(1e6)).toBe(4);
    expect(indexAtX(NaN)).toBe(0);
  });

  it("answers with a bucket's first item", () => {
    const { items, sections } = fixture([400]);
    const { bars, indexAtX } = layoutBars(items, sections, 200);
    const bar = bars[10];
    expect(bar.to - bar.from).toBeGreaterThan(1);
    expect(indexAtX(bar.x + bar.w / 2)).toBe(bar.from);
  });

  it("is empty without items or width", () => {
    expect(layoutBars([], [], 300).bars).toEqual([]);
    expect(layoutBars([], [], 300).indexAtX(10)).toBe(-1);
    const { items, sections } = fixture([3]);
    const zero = layoutBars(items, sections, 0);
    expect(zero.bars).toEqual([]);
    expect(zero.indexAtX(10)).toBe(0);
  });
});

describe("scroll geometry", () => {
  it("monotonic: cumulative max, gaps take the previous value", () => {
    expect(monotonic([100, 250, 200, NaN, undefined, 400])).toEqual([
      100, 250, 250, 250, 250, 400,
    ]);
    expect(monotonic([NaN, 50, null, 30])).toEqual([0, 50, 50, 50]);
    expect(monotonic([])).toEqual([]);
    expect(monotonic(undefined)).toEqual([]);
  });

  it("positionForY: a fractional item index for the reading line", () => {
    const tops = [100, 200, 400];
    expect(positionForY(tops, 50, 600)).toBe(0);
    expect(positionForY(tops, 100, 600)).toBe(0);
    expect(positionForY(tops, 150, 600)).toBe(0.5);
    expect(positionForY(tops, 300, 600)).toBe(1.5);
    expect(positionForY(tops, 500, 600)).toBe(2.5);
    expect(positionForY(tops, 600, 600)).toBe(3);
    expect(positionForY(tops, 9000, 600)).toBe(3);
  });

  it("positionForY: repeated tops (unmeasured items) and a bad end", () => {
    // Item 1 wasn't measured and took item 0's top.
    const tops = [100, 100, 300];
    expect(positionForY(tops, 200, 500)).toBe(1.5);
    // No usable end: the last item is read once its top passes.
    expect(positionForY(tops, 300, NaN)).toBe(3);
    expect(positionForY(tops, 299, 200)).toBeCloseTo(1.995);
    expect(positionForY([], 100, 200)).toBe(0);
    expect(positionForY(tops, NaN, 500)).toBe(0);
  });

  it("scrollYForIndex: the item's top at the inset, never above 0", () => {
    const tops = [100, 900, 2000];
    expect(scrollYForIndex(tops, 1, 80)).toBe(820);
    expect(scrollYForIndex(tops, 0, 160)).toBe(0);
    expect(scrollYForIndex(tops, 1.7, 0)).toBe(900);
    expect(scrollYForIndex(tops, 99, 0)).toBe(2000);
    expect(scrollYForIndex(tops, -3, 0)).toBe(100);
    expect(scrollYForIndex([], 0, 0)).toBe(0);
    expect(scrollYForIndex([NaN], 0, 0)).toBe(0);
  });

  it("sectionIndexOf: the run holding an item", () => {
    const sections = [
      { start: 0, end: 2 },
      { start: 2, end: 5 },
    ];
    expect(sectionIndexOf(sections, 0)).toBe(0);
    expect(sectionIndexOf(sections, 1.9)).toBe(0);
    expect(sectionIndexOf(sections, 2)).toBe(1);
    expect(sectionIndexOf(sections, 4)).toBe(1);
    expect(sectionIndexOf(sections, 5)).toBe(-1);
    expect(sectionIndexOf(sections, -1)).toBe(-1);
    expect(sectionIndexOf(sections, NaN)).toBe(-1);
    expect(sectionIndexOf(null, 0)).toBe(-1);
  });
});
