/**
 * The shared chapter-editor schema (OPENBRAIN-59, plan Phase 1).
 *
 * One TipTap/ProseMirror schema for every block the reader renders, so the
 * admin block page and the in-reader editor can open any paragraph and save
 * it back without dropping anything. `src/editor/blocks.js` converts between
 * `paragraphs.content.blocks` and a document in this schema.
 *
 * Mapping (see blocks.js):
 *   text / paragraph runs  → one `paragraph` node of inline content, with
 *   citation_ref           →   `citationRef` inline atoms and
 *   figure_placeholder     →   `figureRef` inline atoms between the runs
 *   heading / blockquote / list → StarterKit heading / blockquote / lists
 *   image                  → `imageBlock`   (src, alt, caption, closed)
 *   widget                 → `widgetBlock`  (widgetId, kind, title, …)
 *   anything else          → `blockAtom`    (the block JSON, kept verbatim)
 *
 * Inline HTML inside text runs uses two custom marks beyond bold/italic/link:
 * `<sup data-sup='…'>` (in-text citation numbers) and `<span id class>`
 * (hover images and figure scroll anchors).
 */
import { Mark, Node, mergeAttributes } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";

/** `<sup>` in prose, optionally carrying data-sup (Retina citation numbers). */
export const SupMark = Mark.create({
  name: "sup",
  excludes: "",
  addAttributes() {
    return {
      dataSup: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-sup"),
        renderHTML: (attrs) =>
          attrs.dataSup == null ? {} : { "data-sup": attrs.dataSup },
      },
    };
  },
  parseHTML() {
    // citation_ref blocks render as sup.citation-ref; those are atoms.
    return [{ tag: "sup:not(.citation-ref)" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["sup", HTMLAttributes, 0];
  },
});

/**
 * `<span id class>` in prose: hover images (`class='hoverImg'`, HoverImg.vue)
 * and figure scroll anchors (`class='animationMarker'`, the Retina's
 * accommodation/vergence). Keeps whatever id and class the span has.
 */
export const SpanMark = Mark.create({
  name: "span",
  excludes: "",
  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (el) => el.getAttribute("id"),
        renderHTML: (attrs) => (attrs.id ? { id: attrs.id } : {}),
      },
      class: {
        default: null,
        parseHTML: (el) => el.getAttribute("class"),
        renderHTML: (attrs) => (attrs.class ? { class: attrs.class } : {}),
      },
      // A hover picture carried by the link itself (OPENBRAIN-70 D1); older
      // hoverImg spans name a picture by their id instead.
      hoverSrc: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-hover-src"),
        renderHTML: (attrs) =>
          attrs.hoverSrc ? { "data-hover-src": attrs.hoverSrc } : {},
      },
      hoverText: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-hover-text"),
        renderHTML: (attrs) =>
          attrs.hoverText ? { "data-hover-text": attrs.hoverText } : {},
      },
    };
  },
  parseHTML() {
    // figure-ref spans are atoms (FigureRef), not marks.
    return [
      { tag: "span[id]" },
      { tag: "span[class]:not(.figure-ref)" },
      { tag: "span[data-hover-src]" },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ["span", HTMLAttributes, 0];
  },
});

/** A `citation_ref` block: an inline reference number. */
export const CitationRef = Node.create({
  name: "citationRef",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  addAttributes() {
    return {
      number: {
        default: null,
        parseHTML: (el) => {
          const v = el.getAttribute("data-ref");
          if (v === null || v === "") return null;
          return /^-?\d+(\.\d+)?$/.test(v) ? Number(v) : v;
        },
        renderHTML: (attrs) => ({ "data-ref": attrs.number }),
      },
    };
  },
  parseHTML() {
    return [{ tag: "sup.citation-ref", priority: 60 }];
  },
  renderHTML({ node, HTMLAttributes }) {
    return [
      "sup",
      mergeAttributes(HTMLAttributes, { class: "citation-ref" }),
      String(node.attrs.number ?? ""),
    ];
  },
});

/** A `figure_placeholder` block: the inline "Figure N" callout. */
export const FigureRef = Node.create({
  name: "figureRef",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  addAttributes() {
    return {
      number: {
        default: null,
        // Numbers or letters ("Figure F" in Foundations): keep the type.
        parseHTML: (el) => {
          const v = el.getAttribute("data-figure");
          if (v === null || v === "") return null;
          return /^-?\d+(\.\d+)?$/.test(v) ? Number(v) : v;
        },
        renderHTML: (attrs) => ({ "data-figure": attrs.number ?? "" }),
      },
      caption: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-caption"),
        renderHTML: (attrs) =>
          attrs.caption == null ? {} : { "data-caption": attrs.caption },
      },
    };
  },
  parseHTML() {
    return [{ tag: "span.figure-ref" }];
  },
  renderHTML({ node, HTMLAttributes }) {
    const n = node.attrs.number;
    return [
      "span",
      mergeAttributes(HTMLAttributes, { class: "figure-ref" }),
      n == null ? "Figure" : `Figure ${n}`,
    ];
  },
});

/** An `image` block. */
export const ImageBlock = Node.create({
  name: "imageBlock",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      src: { default: null },
      alt: { default: null },
      caption: { default: null },
      closed: { default: null },
    };
  },
  parseHTML() {
    return [{ tag: "figure[data-block='image']" }];
  },
  renderHTML({ node }) {
    const { src, alt, caption } = node.attrs;
    return [
      "figure",
      { "data-block": "image" },
      ["img", { src: src || "", alt: alt || "" }],
      ["figcaption", {}, caption || ""],
    ];
  },
});

export const WIDGET_ATTRS = [
  "widgetId",
  "kind",
  "title",
  "blurb",
  "credit",
  "placementId",
  "route",
];

/** A `widget` block (an interactive from src/widgets). */
export const WidgetBlock = Node.create({
  name: "widgetBlock",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes() {
    return Object.fromEntries(WIDGET_ATTRS.map((k) => [k, { default: null }]));
  },
  parseHTML() {
    return [{ tag: "div[data-block='widget']" }];
  },
  renderHTML({ node }) {
    return [
      "div",
      { "data-block": "widget", "data-widget-id": node.attrs.widgetId || "" },
      node.attrs.title || node.attrs.widgetId || "Widget",
    ];
  },
});

/**
 * Any other block (footnote, further_reading, break_video, break_section,
 * animation_full, code, types added later), kept verbatim as JSON so a save
 * never alters it. The editors show it as a card.
 */
export const BlockAtom = Node.create({
  name: "blockAtom",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes() {
    return { block: { default: null } };
  },
  parseHTML() {
    return [
      {
        tag: "div[data-block='atom']",
        getAttrs: (el) => {
          try {
            return {
              block: JSON.parse(el.getAttribute("data-json") || "null"),
            };
          } catch {
            return false;
          }
        },
      },
    ];
  },
  renderHTML({ node }) {
    return [
      "div",
      {
        "data-block": "atom",
        "data-json": JSON.stringify(node.attrs.block),
      },
      node.attrs.block?.type || "block",
    ];
  },
});

/**
 * The extension list both editors and the converters use. Pass overrides for
 * editor-only behaviour (placeholder, node views) on top of this.
 */
export function chapterExtensions() {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3, 4, 5, 6] },
      codeBlock: false,
      code: false,
      horizontalRule: false,
      strike: false,
      underline: false,
      link: { openOnClick: false },
    }),
    SupMark,
    SpanMark,
    CitationRef,
    FigureRef,
    ImageBlock,
    WidgetBlock,
    BlockAtom,
  ];
}
