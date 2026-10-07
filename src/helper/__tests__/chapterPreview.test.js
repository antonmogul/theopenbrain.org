import { describe, expect, it } from "vitest";
import { transformModuleToChapterFormat } from "@/composables/chapterTransform.mjs";
import {
  buildChapterPreview,
  sourcePlainText,
  speechChunks,
} from "../chapterPreview";

const chapter = {
  title: "A source chapter",
  intro: [
    {
      title: "A source chapter",
      paragraphs: [{ text: "The <strong>original</strong> introduction." }],
    },
  ],
  sections: [
    {
      title: "First section",
      paragraphs: [
        { text: "Opening source paragraph." },
        {
          subSection: [
            {
              title: "Nested heading",
              paragraphs: [
                { text: "Nested source text." },
                { subSubSection: [{ text: "Deeper source text." }] },
              ],
            },
          ],
        },
        { text: "After the nested source." },
        { type: "widget", title: "Interactive controls", text: "Not prose" },
        { img: "/image.png", imgCap: "Not a narrated caption" },
      ],
    },
  ],
  footNotes: { notes: [{ text: "Not a narrated footnote" }] },
  furtherReading: { title: "Not a narrated reference list" },
};

describe("providerless source previews", () => {
  it("extracts source text without executing or showing active markup", () => {
    expect(
      sourcePlainText(
        "<p>First <b>source</b>.</p><p>Next &amp; last.<br>Final.</p><script>bad()</script><style>bad</style><iframe>bad</iframe>"
      )
    ).toBe("First source. Next & last. Final.");
    expect(sourcePlainText(null)).toBe("");
  });

  it("preserves word boundaries on both sides of nested blocks and table cells", () => {
    expect(sourcePlainText("Before<div>inside</div>after")).toBe(
      "Before inside after"
    );
    expect(
      sourcePlainText("Before<div>middle<p>nested</p>end</div>after")
    ).toBe("Before middle nested end after");
    expect(
      sourcePlainText(
        "<table><tr><th>First</th><th>Second</th></tr><tr><td>One</td><td>Two</td></tr></table>"
      )
    ).toBe("First Second One Two");
    expect(
      sourcePlainText("Neuro<strong>science</strong> combines <em>ideas</em>.")
    ).toBe("Neuroscience combines ideas.");
  });

  it("keeps nested prose and heading order without mutating the loaded chapter", () => {
    const before = JSON.stringify(chapter);
    const result = buildChapterPreview(chapter);
    expect(result.passages).toEqual([
      "A source chapter",
      "The original introduction.",
      "First section",
      "Opening source paragraph.",
      "Nested heading",
      "Nested source text.",
      "Deeper source text.",
      "After the nested source.",
    ]);
    expect(result.sections.map((section) => section.heading)).toEqual([
      "A source chapter",
      "First section",
      "Nested heading",
    ]);
    expect(JSON.stringify(chapter)).toBe(before);
  });

  it("excludes back matter retained in the actual transformed section shape without dropping narrative references", () => {
    const row = (id, text) => ({
      id,
      order_index: 0,
      content: { blocks: [{ type: "text", content: text }] },
    });
    const transformed = transformModuleToChapterFormat({
      title: "History",
      sections: [
        {
          id: "intro",
          slug: "introduction",
          title: "Introduction",
          order_index: 0,
          paragraphs: [row("intro-p", "Source prose.")],
        },
        {
          id: "body",
          slug: "references-in-neuroscience",
          title: "References in neuroscience",
          order_index: 1,
          paragraphs: [row("body-p", "Genuine narrative about references.")],
        },
        {
          id: "ref",
          slug: "references",
          title: "References",
          order_index: 2,
          paragraphs: [row("ref-p", "Bibliography must not be narrated.")],
        },
        {
          id: "reading",
          slug: "further-reading",
          title: "Further reading",
          order_index: 3,
          paragraphs: [row("reading-p", "Reading list must not be narrated.")],
        },
        {
          id: "footnote",
          slug: "footnotes",
          title: "Footnotes",
          order_index: 4,
          paragraphs: [row("footnote-p", "Footnote must not be narrated.")],
        },
      ],
    });
    expect(
      transformed.sections.some((section) => section.slug === "references")
    ).toBe(true);
    const result = buildChapterPreview(transformed);
    expect(result.passages).toEqual([
      "History",
      "Source prose.",
      "References in neuroscience",
      "Genuine narrative about references.",
    ]);
    expect(result.sections.map((section) => section.heading)).toEqual([
      "History",
      "References in neuroscience",
    ]);
    expect(result.podcastTranscript).toContain(
      "Genuine narrative about references."
    );
    expect(result.podcastTranscript).not.toContain("must not be narrated");
  });

  it.each(["references", "bibliography", "further-reading", "footnotes"])(
    "skips the exact %s subtree even if supplied in sections",
    (slug) => {
      const result = buildChapterPreview({
        sections: [
          {
            slug,
            title: "Back matter",
            paragraphs: [
              { text: "Hidden list." },
              {
                subSection: [
                  {
                    title: "Nested back matter",
                    paragraphs: [{ text: "Hidden nested list." }],
                  },
                ],
              },
            ],
          },
          {
            slug: `narrative-${slug}`,
            title: "Preserved narrative",
            paragraphs: [{ text: "Exact narrative passage." }],
          },
        ],
      });
      expect(result.passages).toEqual([
        "Preserved narrative",
        "Exact narrative passage.",
      ]);
      expect(result.podcastTranscript).not.toContain("Hidden");
    }
  );

  it("labels scripted podcast structure and only quotes current source openings", () => {
    const result = buildChapterPreview(chapter);
    expect(result.podcastTranscript).toContain("NOT AI-GENERATED");
    expect(result.podcastTranscript).toContain("HOST: First section");
    expect(result.podcastTranscript).toContain(
      "READER (opening excerpt): Opening source paragraph."
    );
    expect(result.podcastTranscript).not.toContain("Not prose");
    expect(result.podcastTranscript).not.toContain("Not a narrated");
  });

  it("uses labelled prefix excerpts and caps the podcast preview at four sections", () => {
    const paragraph = "Exact source wording. ".repeat(80).trim();
    const result = buildChapterPreview({
      sections: Array.from({ length: 8 }, (_, i) => ({
        title: `Heading ${i}`,
        paragraphs: [{ text: paragraph }],
      })),
    });
    expect(result.sections).toHaveLength(8);
    const excerpt = result.sections[0].excerpt;
    expect(excerpt.shortened).toBe(true);
    expect(excerpt.text.length).toBeLessThanOrEqual(560);
    expect(paragraph.startsWith(excerpt.text)).toBe(true);
    expect(result.podcastTranscript).toContain("HOST: Heading 3");
    expect(result.podcastTranscript).not.toContain("HOST: Heading 4");
  });

  it.each([
    null,
    {},
    { intro: {} },
    { sections: {} },
    { intro: [{ title: "Heading only" }] },
  ])("has no playable or invented content for %s", (input) => {
    const result = buildChapterPreview(input);
    expect(result.sections).toEqual([]);
    expect(result.passages).toEqual([]);
    expect(result.podcastTranscript).toBe("");
  });

  it("splits long narration into bounded chunks without rewriting words", () => {
    const text = "Original source sentence. ".repeat(100).trim();
    const chunks = speechChunks([text]);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((chunk) => chunk.length <= 600)).toBe(true);
    expect(chunks.join(" ")).toBe(text);
    expect(speechChunks(["", " "])).toEqual([]);
  });
  it("does not split Unicode surrogate pairs in no-space excerpts or utterances", () => {
    const source = "A" + "🧠".repeat(400);
    const preview = buildChapterPreview({
      sections: [{ title: "Source", paragraphs: [{ text: source }] }],
    });
    const excerpt = preview.sections[0].excerpt.text;
    expect(source.startsWith(excerpt)).toBe(true);
    expect(() => encodeURIComponent(preview.podcastTranscript)).not.toThrow();
    const chunks = speechChunks([source]);
    expect(chunks.join("")).toBe(source);
    for (const chunk of chunks)
      expect(() => encodeURIComponent(chunk)).not.toThrow();
  });
});
