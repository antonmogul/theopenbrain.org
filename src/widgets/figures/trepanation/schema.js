/*
 * Methods of trepanation (OPENBRAIN-87): History Figure 2. The skull from
 * Lisowski (1967) with its four healed openings; pointing at one brings in
 * the hand that made it, holding its tool.
 *
 * The artwork and its places are the designers' November sketch (OPENBRAIN-173,
 * Figma Yv7WvZSoabK2t5fNtsChvf, component set 2875:35801): a 720-wide frame
 * with the skull low in it and four long arms that reach in from past the
 * frame's top (the fourth from its right). `art` is in that frame's units;
 * the stage is its top 800 (the figure's toolbar is below, outside it).
 *
 * The five images are alpha WebPs cut to their painted area, so each box
 * below is where that cut sits in the frame. An arm ends where its image
 * does, above the frame's top (or right of it): the widget clips at its own
 * edge, so an arm always reads as coming in from outside. Their file names
 * carry `-v2` because the boxes changed with the artwork; a browser holding
 * the older files would otherwise draw them in the new places.
 */
const DIR = "/publicAssets/images/foundations/trepanation/";

/** The stage, in frame units. Everything in `art` is measured in these. */
export const STAGE = Object.freeze({ width: 720, height: 800 });

export default {
  id: "trepanation",
  name: "Methods of trepanation",
  animationKey: "animationFoundationsFig2",
  art: {
    width: STAGE.width,
    height: STAGE.height,
    /** The stage may lose this much off its top in a short pane: arms only. */
    spare: 150,
    skull: { src: `${DIR}skull-v2.webp`, x: 120.9, y: 284.8, w: 479, h: 422.9 },
    /**
     * One per method, in the legend's order.
     * - `hand`: the cut-out's box.
     * - `at`: the opening on the skull, where the tool works and the
     *   number's leader line ends.
     * - `disc`: the centre of the numbered disc.
     * - `zone`: the ellipse a pointer shows the method from (centre, radii,
     *   `turn` in degrees clockwise). Where two zones meet, openingAt gives
     *   the spot to the nearer opening.
     * - `from`: where the hand comes in from, a share of its own size.
     * - `work`: the small movement it repeats once there: a slide (frame
     *   units) and a turn (degrees) about `at`, each way from rest.
     */
    methods: [
      {
        hand: {
          src: `${DIR}hand-1-v2.webp`,
          x: 31.5,
          y: 0,
          w: 281.9,
          h: 465.5,
        },
        at: { x: 165.5, y: 402.1 },
        disc: { x: 115, y: 356 },
        zone: { x: 161.9, y: 411.3, rx: 61.45, ry: 116.45, turn: -43.02 },
        from: { x: -16, y: -14 },
        work: { x: 5, y: 5, turn: 1.2 },
      },
      {
        hand: {
          src: `${DIR}hand-2-v2.webp`,
          x: 153.7,
          y: -68,
          w: 287.6,
          h: 444.1,
        },
        at: { x: 275, y: 326 },
        disc: { x: 273, y: 257 },
        zone: { x: 278, y: 304, rx: 53, ry: 97, turn: 0 },
        from: { x: -4, y: -20 },
        work: { x: 4, y: 0, turn: 2 },
      },
      {
        hand: {
          src: `${DIR}hand-3-v2.webp`,
          x: 390.6,
          y: -123,
          w: 384.1,
          h: 467.7,
        },
        at: { x: 396, y: 330.6 },
        disc: { x: 424, y: 268 },
        zone: { x: 396, y: 306, rx: 67, ry: 92, turn: 0 },
        from: { x: 8, y: -18 },
        work: { x: 0, y: 2, turn: 3 },
      },
      {
        hand: {
          src: `${DIR}hand-4-v2.webp`,
          x: 478.5,
          y: 105,
          w: 328.5,
          h: 323.5,
        },
        at: { x: 485, y: 400.7 },
        disc: { x: 543, y: 360 },
        zone: { x: 505.1, y: 401.45, rx: 87.5, ry: 59.5, turn: -51.57 },
        from: { x: 20, y: -7 },
        work: { x: 6, y: -2, turn: 0.6 },
      },
    ],
  },
  fields: [
    {
      key: "figureLabel",
      label: "Figure label",
      type: "text",
      hint: "The amber label before the title, e.g. Fig 02.",
    },
    { key: "title", label: "Title", type: "text" },
    {
      key: "labels",
      label: "Method names",
      type: "list",
      artwork: true,
      itemLabels: ["Opening 1", "Opening 2", "Opening 3", "Opening 4"],
      hint: "One or two words, set large under the skull while a method shows.",
    },
    {
      key: "methods",
      label: "Methods, in full",
      type: "list",
      artwork: true,
      itemLabels: ["Opening 1", "Opening 2", "Opening 3", "Opening 4"],
      hint: "Read out by screen readers for each numbered opening.",
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
    figureLabel: "Fig 02",
    title: "Methods of trepanation",
    labels: ["Scraping", "Grooving", "Drilling", "Cutting"],
    methods: [
      "Scraping",
      "Grooving",
      "Drilling a perimeter around the hole",
      "Cutting a rectangular opening",
    ],
    prompt: "Choose an opening to see how it was made.",
    caption:
      "Different trepanation methods, including scraping (1), grooving (2), drilling a perimeter around the hole (3) and cutting a rectangular opening (4) (Lisowski, 1967).",
  },
};
