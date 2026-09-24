/*
 * Methods of trepanation (OPENBRAIN-87): History Figure 2. The skull from
 * Lisowski (1967) with its four healed openings; pointing at one brings in
 * the hand that made it, holding its tool.
 *
 * The artwork is Figma's "Fig 2 Animation" (Open-Brain-Chapters, node
 * 3:1929), cut apart: the skull and the four hands are separate images, and
 * `art` places them in the frame's own units (745 × 657, the size the
 * figure's earlier five-frame export was made at). Hands were placed by
 * matching each cut-out against those frames, so they land where Figma has
 * them.
 */
const DIR = "/publicAssets/images/foundations/trepanation/";

export default {
  id: "trepanation",
  name: "Methods of trepanation",
  animationKey: "animationFoundationsFig2",
  art: {
    width: 745,
    height: 657,
    skull: { src: `${DIR}skull.webp`, x: 0, y: 260, w: 559 },
    /**
     * One per method, in the legend's order. `hand` is the cut-out (x, y, w
     * in frame units; its height follows the image), `hole` the opening it
     * works on, `callout` the numbered ring at the end of the drawing's
     * leader line, `from` where the hand comes in from (a share of its own
     * size).
     */
    methods: [
      {
        hand: { src: `${DIR}hand-1.webp`, x: 6, y: 227, w: 170, h: 288 },
        hole: { x: 195, y: 432, r: 42 },
        callout: { x: 168, y: 324 },
        from: { x: -28, y: -14 },
      },
      {
        hand: { src: `${DIR}hand-2.webp`, x: 158, y: 19, w: 191, h: 326 },
        hole: { x: 250, y: 360, r: 34 },
        callout: { x: 245, y: 303 },
        from: { x: 0, y: -26 },
      },
      {
        hand: { src: `${DIR}hand-3.webp`, x: 336, y: 0, w: 319, h: 342 },
        hole: { x: 339, y: 356, r: 32 },
        callout: { x: 372, y: 308 },
        from: { x: 18, y: -20 },
      },
      {
        hand: { src: `${DIR}hand-4.webp`, x: 411, y: 210, w: 294, h: 213 },
        hole: { x: 403, y: 408, r: 34 },
        callout: { x: 458, y: 373 },
        from: { x: 26, y: -6 },
      },
    ],
  },
  fields: [
    { key: "title", label: "Title", type: "text" },
    {
      key: "methods",
      label: "Methods",
      type: "list",
      artwork: true,
      itemLabels: ["Opening 1", "Opening 2", "Opening 3", "Opening 4"],
      hint: "Shown when the reader points at each numbered opening.",
    },
    {
      key: "prompt",
      label: "Prompt",
      type: "text",
      hint: "Shown under the skull until the reader picks an opening.",
    },
    {
      key: "caption",
      label: "Legend",
      type: "textarea",
      hint: "The figure legend, with its source.",
    },
  ],
  defaults: {
    title: "Methods of trepanation",
    methods: [
      "Scraping",
      "Grooving",
      "Drilling a perimeter around the hole",
      "Cutting a rectangular opening",
    ],
    prompt: "Point at a numbered opening to see how it was made.",
    caption:
      "Different trepanation methods, including scraping (1), grooving (2), drilling a perimeter around the hole (3) and cutting a rectangular opening (4) (Lisowski, 1967).",
  },
};
