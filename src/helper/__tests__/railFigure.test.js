/*
 * railFigure (OPENBRAIN-194): which figures a side-scrolling box draws as
 * plates (just the images, each with its expand button), what they are
 * called, and how wide a row of plates is for the height it has.
 */
import { describe, expect, it } from "vitest";
import {
  RAIL_PLATES_MAX,
  platesAreFigures,
  railFigureLabel,
  railPlatesHeight,
  railPlatesOf,
  railPlatesWidth,
} from "../railFigure";

describe("railPlatesOf", () => {
  it("is an image figure's stills, up to three", () => {
    expect(RAIL_PLATES_MAX).toBe(3);
    expect(
      railPlatesOf({ placeholder: true, images: ["/a.jpg", "/b.jpg"] })
    ).toEqual([
      { src: "/a.jpg", caption: "", alt: "" },
      { src: "/b.jpg", caption: "", alt: "" },
    ]);
    // The single-image shorthand.
    expect(railPlatesOf({ imageUrl: "/a.jpg" })).toHaveLength(1);
    expect(
      railPlatesOf({ images: ["/a.jpg", "/b.jpg", "/c.jpg"] })
    ).toHaveLength(3);
  });

  it("leaves everything else to the figure shell", () => {
    expect(railPlatesOf(null)).toBeNull();
    // A larger set is a gallery.
    expect(
      railPlatesOf({ images: ["/a.jpg", "/b.jpg", "/c.jpg", "/d.jpg"] })
    ).toBeNull();
    // A video the reader plays, and a silent loop.
    expect(
      railPlatesOf({
        images: [{ src: "/p.jpg", youtube: "WgkAR-vrJpM", play: "player" }],
      })
    ).toBeNull();
    expect(
      railPlatesOf({ images: [{ src: "/p.jpg", youtube: "WgkAR-vrJpM" }] })
    ).toBeNull();
    // Artwork pending, a widget, a Lottie, a transition.
    expect(railPlatesOf({ placeholder: true })).toBeNull();
    expect(
      railPlatesOf({ widgetId: "upload:x", images: ["/a.jpg"] })
    ).toBeNull();
    expect(railPlatesOf({ id: "animationEye" })).toBeNull();
    expect(railPlatesOf({ isTransition: true, images: ["/a.jpg"] })).toBeNull();
  });
});

describe("railFigureLabel", () => {
  it("is FIG and the number or letter, as the figure shell writes it", () => {
    expect(railFigureLabel({ figureNumber: 3 })).toBe("FIG 03");
    expect(railFigureLabel({ figureNumber: "12" })).toBe("FIG 12");
    expect(railFigureLabel({ figureNumber: "E" })).toBe("FIG E");
  });

  it("is empty for a figure with no number", () => {
    expect(railFigureLabel({})).toBe("");
    expect(railFigureLabel({ figureNumber: "" })).toBe("");
    expect(railFigureLabel(null)).toBe("");
  });
});

describe("a row of plates", () => {
  it("is as wide as its images at one height, and the gaps", () => {
    expect(railPlatesWidth([0.6], 500)).toBe(300);
    expect(railPlatesWidth([1.5, 0.75], 400, 16)).toBe(916);
  });

  it("is as tall as its width allows, never over the room it has", () => {
    expect(railPlatesHeight([1.5, 0.75], 916, 16)).toBe(400);
    expect(railPlatesHeight([1.5], 420, 0, 500)).toBe(280);
    expect(railPlatesHeight([0.6], 900, 0, 500)).toBe(500);
  });

  it("is nothing until every image's size is known", () => {
    expect(railPlatesWidth([1.5, 0], 400, 16)).toBe(0);
    expect(railPlatesWidth([], 400)).toBe(0);
    expect(railPlatesWidth([1], 0)).toBe(0);
    expect(railPlatesHeight([1.5, NaN], 400)).toBe(0);
    expect(railPlatesHeight([1], 0)).toBe(0);
  });
});

describe("platesAreFigures (OPENBRAIN-202)", () => {
  it("is true when every plate of a set carries its own figure number", () => {
    expect(
      platesAreFigures([
        { src: "/a.jpg", figureNumber: "D" },
        { src: "/b.jpg", figureNumber: "E" },
      ])
    ).toBe(true);
  });
  it("is false for one plate, a set with an unnumbered plate, or nothing", () => {
    expect(platesAreFigures([{ src: "/a.jpg", figureNumber: "D" }])).toBe(
      false
    );
    expect(
      platesAreFigures([
        { src: "/a.jpg", figureNumber: "D" },
        { src: "/b.jpg" },
      ])
    ).toBe(false);
    expect(platesAreFigures(null)).toBe(false);
  });
});
