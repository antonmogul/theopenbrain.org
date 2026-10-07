import { describe, expect, it } from "vitest";
import {
  blocksToDoc,
  docToBlocks,
  normalizeBlocks,
  htmlToInline,
  inlineToHtml,
} from "@/editor/blocks";
import {
  contentBlocksToHTML,
  extractChapter1Meta,
} from "@/composables/chapterTransform.mjs";
import published from "./fixtures/paragraphs.published.json";
import attention from "./fixtures/paragraphs.attention.json";

const ALL = [...published, ...attention];

// The visible words of a block list, for a "no words lost" check that
// doesn't depend on HTML serialization at all.
function words(blocks) {
  const el = document.createElement("div");
  el.innerHTML = blocks
    .map((b) =>
      [b.content, ...(b.items || [])].filter((v) => typeof v === "string")
    )
    .flat()
    .join(" ");
  return el.textContent.replace(/\s+/g, " ").trim();
}

// What the reader actually renders, independent of how the editor
// serializes: every visible character with the set of elements (tag plus
// attributes) around it — so a dropped tag, class or data attribute fails,
// while <em><b>a</b> <b>b</b></em> vs <em><b>a</b></em><em> …</em> doesn't —
// plus the metadata (figures, widgets, images) read from structured blocks.
function rendered(blocks) {
  const root = document.createElement("div");
  // A text run wrapped in <p> is invalid inside the reader's own <p>; the
  // editor unwraps it (one Foundations paragraph, from the old inline editor).
  root.innerHTML = contentBlocksToHTML(blocks).text.replace(/<\/?p>/g, "");
  const runs = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let t = walker.nextNode(); t; t = walker.nextNode()) {
    const around = [];
    for (let n = t.parentElement; n && n !== root; n = n.parentElement)
      around.push(
        n.tagName.toLowerCase() +
          [...n.attributes]
            .map((a) => `${a.name}=${a.value}`)
            .sort()
            .join("|")
      );
    const key = around.sort().join(" ");
    for (const ch of t.data) {
      const last = runs[runs.length - 1];
      if (last && last.key === key) last.text += ch;
      else runs.push({ key, text: ch });
    }
  }
  return { runs, meta: extractChapter1Meta(blocks) };
}

describe("block format round trip over every production paragraph (OPENBRAIN-59)", () => {
  it("covers every block type the reader renders", () => {
    const types = new Set(
      ALL.flatMap((r) => (r.content.blocks || []).map((b) => b.type))
    );
    for (const t of [
      "text",
      "citation_ref",
      "footnote",
      "figure_placeholder",
      "heading",
      "image",
      "widget",
      "blockquote",
      "animation_full",
      "break_section",
      "break_video",
      "further_reading",
      "list",
    ])
      expect(types, t).toContain(t);
  });

  it.each(ALL.map((r) => [r.chapter, r.id, r.content.blocks]))(
    "%s %s",
    (_chapter, _id, blocks) => {
      const back = docToBlocks(blocksToDoc(blocks));
      expect(back).toEqual(normalizeBlocks(blocks));
      expect(words(back)).toBe(words(normalizeBlocks(blocks)));
      // The reader renders the same thing from the original and the copy.
      expect(rendered(back)).toEqual(rendered(blocks));
    }
  );
});

describe("inline HTML the editor must keep", () => {
  it("keeps in-text citation sups, hover-image spans and figure anchors", () => {
    const html =
      "Rods<sup data-sup='35 36'>35 - 36</sup> and <span id='alcmeon' class='hoverImg'>Alcmeon</span>, <span id='accommodation' class='animationMarker'>accommodation</span>";
    const out = inlineToHtml(htmlToInline(html));
    expect(out).toContain('<sup data-sup="35 36">35 - 36</sup>');
    expect(out).toContain('<span id="alcmeon" class="hoverImg">Alcmeon</span>');
    expect(out).toContain(
      '<span id="accommodation" class="animationMarker">accommodation</span>'
    );
  });

  it("keeps the space after a citation", () => {
    const blocks = [
      { type: "text", content: "Rods" },
      { type: "citation_ref", number: 4 },
      { type: "text", content: " and cones" },
    ];
    expect(docToBlocks(blocksToDoc(blocks))).toEqual(blocks);
  });

  it("round-trips a widget and a captioned image key for key", () => {
    const blocks = [
      {
        type: "widget",
        widgetId: "sdt",
        kind: "breakout",
        title: "Signal Detection Theory",
        blurb: "",
        credit: "A",
        placementId: "p",
        route: "",
      },
      { type: "image", src: "/a.png", caption: "Fig 1", closed: true },
    ];
    expect(docToBlocks(blocksToDoc(blocks))).toEqual(blocks);
  });

  it("keeps unknown blocks verbatim", () => {
    const blocks = [{ type: "definition", term: "Rod", body: "<b>x</b>" }];
    expect(docToBlocks(blocksToDoc(blocks))).toEqual(blocks);
  });
});
