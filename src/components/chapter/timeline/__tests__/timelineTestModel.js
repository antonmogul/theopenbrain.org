/*
 * A small chapter for the timeline's component tests: an intro, two numbered
 * sections, a widget and a video break, so every bar kind and the section
 * keys are exercised with predictable indices:
 *
 *   0 p0  1 p1            intro       [0, 2)
 *   2 p2  3 w1  4 p3      section 1   [2, 5)   (w1: widget)
 *   5 p4  6 b1  7 p5      section 2   [5, 8)   (b1: video break)
 */
import { buildTimeline, layoutBars } from "@/helper/chapterTimeline";

const words = (n, lead = "word") =>
  Array.from({ length: n }, (_, i) => (i ? "word" : lead)).join(" ");

export const TEST_TEXT = {
  intro: [
    {
      id: "intro",
      title: "The Eye",
      paragraphs: [
        { id: "p0", text: `<p>${words(30, "Seeing")}</p>` },
        { id: "p1", text: words(10, "Light") },
      ],
    },
  ],
  sections: [
    {
      id: "s1",
      title: "Photoreceptors",
      paragraphs: [
        {
          id: "p2",
          text: words(40, "Rods"),
          animation: { id: "a1", name: "RodsAndCones" },
        },
        {
          id: "w1",
          type: "widget",
          widget: {
            widgetId: "color-vision",
            title: "Colour vision",
            blurb: "Mix the three cone signals.",
            credit: "Interactive by Stuart Trenholm",
          },
        },
        { id: "p3", text: words(20, "Cones") },
      ],
    },
    {
      id: "s2",
      title: "Circuits",
      paragraphs: [
        { id: "p4", text: words(25, "Bipolar") },
        { id: "b1", type: "breakVideo", title: "Tom Baden", text: "" },
        { id: "p5", text: words(15, "Ganglion") },
      ],
    },
  ],
};

export const testModel = () =>
  buildTimeline(TEST_TEXT, { labels: { s1: "1", s2: "2" } });

/** Layers on the test chapter: yours on p2, trending on p4. */
export const testLayers = () => ({
  highlights: new Map([[2, [{ id: "h1", color: "green", text: "Rods word" }]]]),
  notes: new Map([[2, [{ id: "n1", content: "Check the figure." }]]]),
  trending: new Map([
    [
      5,
      [
        { text: "Bipolar word word", count: 12 },
        { text: "word word", count: 3 },
      ],
    ],
  ]),
});

/** The bars layoutBars draws for the model at `width`. */
export const testBars = (model, width) =>
  layoutBars(model.items, model.sections, width, model.maxWords).bars;

/**
 * Give TimelineBars a width in happy-dom (which lays nothing out): its root
 * reports `width` as clientWidth. Returns the restore function.
 */
export function stubBarsWidth(width) {
  const proto = window.HTMLElement.prototype;
  const original = Object.getOwnPropertyDescriptor(proto, "clientWidth");
  Object.defineProperty(proto, "clientWidth", {
    configurable: true,
    get() {
      return this.classList?.contains("tl-bars")
        ? width
        : (original?.get?.call(this) ?? 0);
    },
  });
  return () => {
    if (original) Object.defineProperty(proto, "clientWidth", original);
    else delete proto.clientWidth;
  };
}
