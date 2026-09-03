import { describe, expect, it } from "vitest";
import {
  generateChapterSql,
  inlineToHtml,
  htmlToBlocks,
  parseChapterMarkdown,
  toSlug,
} from "../../scripts/seed/gen-chapter-from-markdown.mjs";

// A miniature chapter exercising every construct the Attention seed relies
// on: H2/H3/H4 nesting, a citation, a figure line, and a BREAK OUT BOX.
const FIXTURE = `<!--
  DRAFT — not final
-->

# Ignored Title

## Introduction

Opening paragraph with a citation<sup>1</sup> and *emphasis*.

Figure 1. A caption with **bold**

## Measuring attention

Top-level paragraph in the second section[^2].

### Signal detection theory

Subsection body, mentioning c_p and c_n without italics.

### BREAK OUT BOX: Signal detection theory

Box prose stays at the subsection level.

#### One stimulus

Deeper prose under an H4 inside the box.

<!-- end breakout box -->

### Another subsection

Back to level one.

(Figure 2)

## References

1. Cherry, E. C. (1953). Some experiments on the recognition of speech.
2. Broadbent, D. E. (1958). Perception and communication.
`;

const OPTS = {
  inPath: "content/fixture.md",
  slug: "attention-and-working-memory",
  title: "Attention and Working Memory",
  order: 4,
  status: "draft",
  author: "Arjun Krishnaswamy",
  version: "1.0",
};

describe("gen-chapter-from-markdown: markdown -> rows", () => {
  const chapter = parseChapterMarkdown(FIXTURE, {
    author: OPTS.author,
    placementPrefix: "attention",
  });
  const [intro, measuring, refs] = chapter.sections;

  it("maps H2 headings to sections with slugs and contiguous order", () => {
    expect(chapter.sections.map((s) => s.slug)).toEqual([
      "introduction",
      "measuring-attention",
      "references",
    ]);
    expect(chapter.sections.map((s) => s.order_index)).toEqual([0, 1, 2]);
    for (const s of chapter.sections) {
      expect(s.paragraphs.map((p) => p.order_index)).toEqual(
        s.paragraphs.map((_, i) => i)
      );
    }
  });

  it("emits text + citation_ref blocks and a bounded content_text", () => {
    const [p] = intro.paragraphs;
    expect(p.blocks).toEqual([
      { type: "text", content: "Opening paragraph with a citation" },
      { type: "citation_ref", number: 1 },
      { type: "text", content: " and <em>emphasis</em>." },
    ]);
    expect(p.content_text).toBe(
      "Opening paragraph with a citation and emphasis."
    );
    expect(p.subsection_level).toBe(0);
    expect(p.is_subsection_header).toBe(false);
  });

  it("turns a figure line into a figure_placeholder row bound to an animation", () => {
    const fig = intro.paragraphs[1];
    expect(fig.kind).toBe("figure");
    expect(fig.figure).toEqual({
      number: 1,
      caption: "A caption with bold",
    });
    expect(fig.blocks[0]).toEqual({
      type: "figure_placeholder",
      number: 1,
      caption: "A caption with bold",
    });
    expect(fig.blocks[1].content).toBe(
      ". A caption with <strong>bold</strong>"
    );
    expect(fig.content_text).toBe("Figure 1. A caption with bold");
    expect(chapter.figures.map((f) => f.number)).toEqual([1, 2]);
  });

  it("nests H3 -> level-1 header, H4 -> level-2 header, body rows follow the open level", () => {
    const rows = measuring.paragraphs.map((p) => [
      p.kind,
      p.subsection_level,
      p.is_subsection_header,
    ]);
    expect(rows).toEqual([
      ["text", 0, false], // top-level paragraph
      ["header", 1, true], // ### Signal detection theory
      ["text", 1, false],
      ["widget", 1, false], // ### BREAK OUT BOX
      ["text", 1, false], // box prose
      ["header", 2, true], // #### One stimulus
      ["text", 2, false],
      ["header", 1, true], // ### Another subsection (after box end)
      ["text", 1, false],
      ["figure", 1, false], // (Figure 2) on its own line
    ]);
    const header = measuring.paragraphs[1];
    expect(header.blocks).toEqual([
      { type: "heading", level: 3, content: "Signal detection theory" },
    ]);
    // reconstructNesting() uses content_text as the subsection title.
    expect(header.content_text).toBe("Signal detection theory");
    expect(measuring.paragraphs[5].blocks[0]).toEqual({
      type: "heading",
      level: 4,
      content: "One stimulus",
    });
  });

  it("emits the widget block shape useChapter.js consumes", () => {
    const widget = measuring.paragraphs[3];
    expect(widget.blocks).toEqual([
      {
        type: "widget",
        widgetId: "sdt",
        kind: "breakout",
        title: "Signal Detection Theory",
        blurb:
          "Drag the criterion, adjust d′, and watch the ROC curve respond. Demonstrates how sensitivity and bias are independent.",
        credit: "Arjun Krishnaswamy",
        route: "/sdt",
        placementId: "attention-sdt",
      },
    ]);
    expect(widget.content_text).toBe("Interactive: Signal Detection Theory");
  });

  it("maps the normalization box to the route-less normalization-model widget", () => {
    const { sections } = parseChapterMarkdown(
      "## S\n\n### BREAK OUT BOX: The normalization model of attention\n\nProse.\n",
      { author: "A", placementPrefix: "attention" }
    );
    const [widget] = sections[0].paragraphs;
    expect(widget.blocks[0]).toMatchObject({
      type: "widget",
      widgetId: "normalization-model",
      route: "",
      placementId: "attention-normalization-model",
    });
  });

  it("keeps intraword underscores and [^N] citations apart", () => {
    const body = measuring.paragraphs[2];
    expect(body.blocks).toEqual([
      {
        type: "text",
        content: "Subsection body, mentioning c_p and c_n without italics.",
      },
    ]);
    const cited = measuring.paragraphs[0];
    expect(cited.blocks[1]).toEqual({ type: "citation_ref", number: 2 });
  });

  it("makes References its own section with an ordered list block", () => {
    expect(refs.title).toBe("References");
    expect(refs.paragraphs).toHaveLength(1);
    expect(refs.paragraphs[0].blocks[0]).toMatchObject({
      type: "list",
      ordered: true,
    });
    expect(refs.paragraphs[0].blocks[0].items).toHaveLength(2);
  });

  it("demotes an H4 with no enclosing H3 and says so", () => {
    const out = parseChapterMarkdown("## S\n\n#### Orphan\n\nBody.\n");
    expect(out.sections[0].paragraphs[0]).toMatchObject({
      is_subsection_header: true,
      subsection_level: 1,
    });
    expect(out.warnings[0]).toMatch(/Orphan/);
  });

  it("numbers unnumbered and duplicate figures after the highest explicit one", () => {
    const out = parseChapterMarkdown(
      "## S\n\nFigure 2. Two\n\nFigure: Unnumbered\n\nFigure 2. Dup\n"
    );
    expect(out.figures.map((f) => f.number)).toEqual([2, 3, 4]);
    expect(out.warnings).toEqual(['duplicate "Figure 2" — renumbered']);
  });
});

describe("gen-chapter-from-markdown: inline helpers", () => {
  it("converts emphasis, code, links and escapes; keeps <sup>", () => {
    expect(inlineToHtml("**b** *i* _u_ `c` [t](http://x) a<sup>3</sup>")).toBe(
      '<strong>b</strong> <em>i</em> <em>u</em> <code>c</code> <a href="http://x">t</a> a<sup>3</sup>'
    );
    expect(inlineToHtml("\\[not a link\\] 2 < 3 & 4")).toBe(
      "[not a link] 2 &lt; 3 &amp; 4"
    );
  });

  it("splits multi-number superscripts and bracket citations", () => {
    expect(htmlToBlocks("a<sup>2, 3</sup> b [4] c")).toEqual([
      { type: "text", content: "a" },
      { type: "citation_ref", number: 2 },
      { type: "citation_ref", number: 3 },
      { type: "text", content: " b " },
      { type: "citation_ref", number: 4 },
      { type: "text", content: " c" },
    ]);
  });

  it("slugs like the app helper", () => {
    expect(toSlug("Neural Correlates of Visual Attention.")).toBe(
      "neural-correlates-of-visual-attention"
    );
  });
});

describe("gen-chapter-from-markdown: SQL", () => {
  const { sql, chapter } = generateChapterSql(FIXTURE, OPTS);

  it("is one idempotent DO block guarded on the module slug", () => {
    expect(sql.match(/^DO \$\$/gm)).toHaveLength(1);
    expect(sql).toContain(
      "SELECT id INTO v_existing_module_id FROM modules WHERE slug = $ob$attention-and-working-memory$ob$ LIMIT 1;"
    );
    expect(sql).toMatch(
      /IF v_existing_module_id IS NOT NULL THEN\s+RAISE NOTICE/
    );
    expect(sql).toMatch(/RAISE NOTICE[^\n]*skipping seed[^\n]*\n\s+RETURN;/);
    // No destructive statements (comments may mention the word).
    expect(sql).not.toMatch(/^\s*(DELETE|TRUNCATE|DROP)\b/im);
    expect(sql).toContain("gen_random_uuid()");
  });

  it("joins the requested content version and writes the module row", () => {
    expect(sql).toContain("WHERE version_number = $ob$1.0$ob$");
    expect(sql).toContain("$ob$Attention and Working Memory$ob$");
    expect(sql).toMatch(/4, \$ob\$draft\$ob\$, v_creator_id/);
    expect(sql).toContain("-- Author: Arjun Krishnaswamy");
  });

  it("emits one placeholder animation per figure, keyed and upserted", () => {
    expect(sql).toContain("$ob$animationAttentionFig1$ob$");
    expect(sql).toContain("$ob$animationAttentionFig2$ob$");
    expect(sql.match(/ON CONFLICT \(animation_key\) DO UPDATE/g)).toHaveLength(
      2
    );
    expect(sql).toContain('"placeholder":true');
    expect(sql).toContain("'image', 'static_image', 'IllustrationPlaceholder'");
    expect(sql).toMatch(/true, v_fig_1, 'auto', false, 0\);/);
  });

  it("writes every paragraph row with contiguous order per section", () => {
    const total = chapter.sections.reduce((n, s) => n + s.paragraphs.length, 0);
    expect(sql.match(/INSERT INTO paragraphs/g)).toHaveLength(total);
    expect(sql.match(/INSERT INTO sections/g)).toHaveLength(3);
    expect(sql).toContain('"type":"widget","widgetId":"sdt"');
    expect(sql).toContain('"type":"heading","level":4');
  });

  it("refuses content that would break dollar quoting", () => {
    expect(() =>
      generateChapterSql("## S\n\nCosts $ob$ dollars\n", OPTS)
    ).toThrow(/dollar-quote/);
  });
});
