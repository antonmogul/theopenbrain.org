import { describe, expect, it } from "vitest";
import { mobileMode } from "@/helper/illustrationMobile";

describe("mobileMode", () => {
  it("opens a widget figure as its breakout card (OPENBRAIN-70 B5)", () => {
    expect(
      mobileMode({ id: "widget-phrenology", widgetId: "phrenology" })
    ).toBe("widget");
  });
  it("draws a panel figure widget inline (OPENBRAIN-82)", () => {
    expect(
      mobileMode({ id: "animationRodVsConeCircuits", switch: true, loop: true })
    ).toBe("figure-widget");
    // Full-screen figure widgets already render in the text.
    expect(
      mobileMode({ id: "animationImpairedVision", fullscreen: true })
    ).toBe("scroll");
  });
  it("keeps the other modes", () => {
    expect(mobileMode(null)).toBe("skip");
    expect(mobileMode({ id: "a", isTransition: true })).toBe("skip");
    expect(mobileMode({ id: "a", youtubeID: "x" })).toBe("static");
    expect(mobileMode({ id: "a", fullscreen: true })).toBe("scroll");
    expect(mobileMode({ id: "a" })).toBe("interactive");
  });
  it("shows an image figure (or its placeholder) as the figure shell", () => {
    expect(
      mobileMode({
        id: "animationFoundationsFigA",
        placeholder: true,
        images: [{ src: "/a.jpg" }],
      })
    ).toBe("figure-shell");
    expect(mobileMode({ id: "animationStressFig1", placeholder: true })).toBe(
      "figure-shell"
    );
  });
});
