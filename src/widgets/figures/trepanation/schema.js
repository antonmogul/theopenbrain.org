/*
 * Methods of trepanation (OPENBRAIN-87): History Figure 2. The skull from
 * Lisowski (1967) with its four healed openings; pointing at one brings in
 * the hand that made it, holding its tool.
 *
 * The artwork is Figma's "Fig 2 Animation" (Open-Brain-Chapters, node
 * 3:1929), cut apart: the skull and the four hands are separate images, and
 * `art` places them in the frame's own units (745 × 657, the size the
 * figure's earlier five-frame export was made at).
 *
 * Since OPENBRAIN-159 the images are the designer's cut-outs for the dark
 * treatment of the History redesign: alpha WebPs with no grey plate behind
 * the skull and none of the drawing's printed leader lines (the widget draws
 * its own numbered rings). The five were exported at one scale, so they sit
 * in the frame at their own pixel size (skull 487 × 427, hands 302 × 497,
 * 209 × 341, 236 × 354, 250 × 288); each `hole` is the opening measured on
 * the skull image, and each hand is placed so its tool's working end lands
 * on that opening. The arms are cut at the image's top (or, for the fourth,
 * its right) edge and sit just past the frame's, so a hand reads as coming
 * in from outside.
 */
const DIR = "/publicAssets/images/foundations/trepanation/";

export default {
  id: "trepanation",
  name: "Methods of trepanation",
  animationKey: "animationFoundationsFig2",
  art: {
    width: 745,
    height: 657,
    skull: { src: `${DIR}skull.webp`, x: 165, y: 224, w: 487 },
    /**
     * One per method, in the legend's order. `hand` is the cut-out (x, y, w
     * in frame units; its height follows the image), `hole` the opening it
     * works on, `callout` the numbered ring, `from` where the hand comes in
     * from (a share of its own size).
     *
     * A callout sits like a map label: just outside its opening's rim, on
     * whichever side is clearest for that opening and nearer to it than to
     * any other, and where no hand lands except (for 2) its own, since the
     * four hands cover every other side of the groove.
     */
    methods: [
      {
        hand: { src: `${DIR}hand-1.webp`, x: 133, y: -74, w: 302, h: 497 },
        hole: { x: 243, y: 376, r: 50 },
        callout: { x: 288, y: 432 },
        from: { x: -28, y: -14 },
      },
      {
        hand: { src: `${DIR}hand-2.webp`, x: 240, y: -51, w: 209, h: 341 },
        hole: { x: 318, y: 289, r: 40 },
        callout: { x: 312, y: 225 },
        from: { x: 0, y: -26 },
      },
      {
        hand: { src: `${DIR}hand-3.webp`, x: 356, y: -68, w: 236, h: 354 },
        hole: { x: 431, y: 280, r: 35 },
        callout: { x: 471, y: 240 },
        from: { x: 18, y: -20 },
      },
      {
        hand: { src: `${DIR}hand-4.webp`, x: 482, y: 105, w: 250, h: 288 },
        hole: { x: 517, y: 350, r: 34 },
        callout: { x: 556, y: 389 },
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
