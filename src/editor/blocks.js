/**
 * paragraphs.content.blocks ⇄ chapter-editor document (OPENBRAIN-59).
 *
 * blocksToDoc(blocks) → ProseMirror JSON in the schema from ./schema.js
 * docToBlocks(doc)    → blocks, the inverse
 *
 * Round trip: docToBlocks(blocksToDoc(b)) equals normalizeBlocks(b), where
 * normalizing only merges adjacent text runs, drops empty ones, and
 * re-serializes inline HTML (quote style, attribute order). Structured
 * blocks come back identical, key for key. Tested against every production
 * paragraph in __tests__/fixtures.
 */
import {
  getSchema,
  getHTMLFromFragment,
  elementFromString,
} from "@tiptap/core";
import { DOMParser as PMDOMParser, Node as PMNode } from "@tiptap/pm/model";
import { chapterExtensions, WIDGET_ATTRS } from "./schema.js";

let cached;
function schema() {
  if (!cached) cached = getSchema(chapterExtensions());
  return cached;
}

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

/** Inline HTML → an array of inline ProseMirror JSON nodes. */
export function htmlToInline(html) {
  if (!html) return [];
  const dom = elementFromString(`<p>${html}</p>`);
  const doc = PMDOMParser.fromSchema(schema()).parse(dom, {
    preserveWhitespace: "full",
  });
  const inline = [];
  doc.forEach((block) => {
    // A stray <p> inside a run parses as a second paragraph: keep its words.
    if (block.isTextblock) block.forEach((n) => inline.push(n.toJSON()));
  });
  return inline;
}

/** An array of inline ProseMirror JSON nodes → inline HTML. */
export function inlineToHtml(nodes) {
  if (!nodes?.length) return "";
  const s = schema();
  const para = s.nodeFromJSON({ type: "paragraph", content: nodes });
  return getHTMLFromFragment(para.content, s);
}

const INLINE_RUN = new Set(["text", "paragraph"]);

function inlineGroupHtml(group) {
  // One HTML string per group, with atoms as their tags, so whitespace
  // between a citation and the next words parses in context.
  return group
    .map((b) => {
      if (INLINE_RUN.has(b.type)) return b.content || "";
      if (b.type === "citation_ref")
        return `<sup class="citation-ref" data-ref="${esc(b.number)}">${esc(b.number)}</sup>`;
      const cap =
        b.caption === undefined ? "" : ` data-caption="${esc(b.caption)}"`;
      return `<span class="figure-ref" data-figure="${esc(b.number ?? "")}"${cap}>x</span>`;
    })
    .join("");
}

function pick(obj, keys) {
  const out = {};
  for (const k of keys) if (obj[k] !== undefined) out[k] = obj[k];
  return out;
}

/** paragraphs.content.blocks → editor document JSON. */
export function blocksToDoc(blocks) {
  const content = [];
  let group = [];
  const flush = () => {
    if (!group.length) return;
    content.push({
      type: "paragraph",
      content: htmlToInline(inlineGroupHtml(group)),
    });
    group = [];
  };

  for (const b of Array.isArray(blocks) ? blocks : []) {
    if (!b || typeof b !== "object") continue;
    if (
      INLINE_RUN.has(b.type) ||
      b.type === "citation_ref" ||
      b.type === "figure_placeholder"
    ) {
      group.push(b);
      continue;
    }
    flush();
    if (b.type === "heading") {
      content.push({
        type: "heading",
        attrs: { level: b.level || 2 },
        content: htmlToInline(b.content),
      });
    } else if (b.type === "blockquote") {
      content.push({
        type: "blockquote",
        content: [{ type: "paragraph", content: htmlToInline(b.content) }],
      });
    } else if (b.type === "list") {
      content.push({
        type: b.ordered ? "orderedList" : "bulletList",
        content: (b.items || []).map((item) => ({
          type: "listItem",
          content: [{ type: "paragraph", content: htmlToInline(item) }],
        })),
      });
    } else if (b.type === "image") {
      content.push({
        type: "imageBlock",
        attrs: pick(b, ["src", "alt", "caption", "closed"]),
      });
    } else if (b.type === "widget") {
      content.push({ type: "widgetBlock", attrs: pick(b, WIDGET_ATTRS) });
    } else {
      content.push({ type: "blockAtom", attrs: { block: b } });
    }
  }
  flush();
  if (!content.length) content.push({ type: "paragraph" });
  // Validate against the schema (throws on anything malformed).
  return PMNode.fromJSON(schema(), { type: "doc", content }).toJSON();
}

function firstParagraphInline(node) {
  const inline = [];
  for (const child of node.content || []) {
    if (child.type === "paragraph") inline.push(...(child.content || []));
  }
  return inline;
}

function compact(attrs) {
  const out = {};
  for (const [k, v] of Object.entries(attrs || {})) if (v !== null) out[k] = v;
  return out;
}

/** Editor document JSON → paragraphs.content.blocks. */
export function docToBlocks(doc) {
  const blocks = [];
  for (const node of doc?.content || []) {
    if (node.type === "paragraph") {
      let run = [];
      const flushRun = () => {
        const html = inlineToHtml(run);
        if (html) blocks.push({ type: "text", content: html });
        run = [];
      };
      for (const child of node.content || []) {
        if (child.type === "citationRef") {
          flushRun();
          blocks.push({ type: "citation_ref", number: child.attrs.number });
        } else if (child.type === "figureRef") {
          flushRun();
          blocks.push({
            type: "figure_placeholder",
            ...compact({
              number: child.attrs.number,
              caption: child.attrs.caption,
            }),
          });
        } else {
          run.push(child);
        }
      }
      flushRun();
    } else if (node.type === "heading") {
      blocks.push({
        type: "heading",
        level: node.attrs?.level || 2,
        content: inlineToHtml(node.content),
      });
    } else if (node.type === "blockquote") {
      blocks.push({
        type: "blockquote",
        content: inlineToHtml(firstParagraphInline(node)),
      });
    } else if (node.type === "bulletList" || node.type === "orderedList") {
      blocks.push({
        type: "list",
        ordered: node.type === "orderedList",
        items: (node.content || []).map((li) =>
          inlineToHtml(firstParagraphInline(li))
        ),
      });
    } else if (node.type === "imageBlock") {
      blocks.push({ type: "image", ...compact(node.attrs) });
    } else if (node.type === "widgetBlock") {
      blocks.push({ type: "widget", ...compact(node.attrs) });
    } else if (node.type === "blockAtom" && node.attrs?.block) {
      blocks.push(node.attrs.block);
    }
  }
  return blocks;
}

/** What a lossless round trip must return for `blocks` (see file header). */
export function normalizeBlocks(blocks) {
  const out = [];
  for (const b of Array.isArray(blocks) ? blocks : []) {
    if (!b || typeof b !== "object") continue;
    if (INLINE_RUN.has(b.type)) {
      const prev = out[out.length - 1];
      if (prev?.type === "text") prev.content += b.content || "";
      else out.push({ type: "text", content: b.content || "" });
      continue;
    }
    out.push(b);
  }
  return out
    .map((b) => {
      if (b.type === "text")
        return { type: "text", content: inlineToHtml(htmlToInline(b.content)) };
      if (b.type === "heading")
        return {
          type: "heading",
          level: b.level || 2,
          content: inlineToHtml(htmlToInline(b.content)),
        };
      if (b.type === "blockquote")
        return {
          type: "blockquote",
          content: inlineToHtml(htmlToInline(b.content)),
        };
      if (b.type === "list")
        return {
          type: "list",
          ordered: !!b.ordered,
          items: (b.items || []).map((i) => inlineToHtml(htmlToInline(i))),
        };
      return b;
    })
    .filter((b) => b.type !== "text" || b.content !== "");
}
