import { describe, expect, it } from "vitest";
import { mobileMode } from "@/helper/illustrationMobile";

describe("mobileMode", () => {
  it("opens a widget figure as its breakout card (OPENBRAIN-70 B5)", () => {
    expect(
      mobileMode({ id: "widget-phrenology", widgetId: "phrenology" })
    ).toBe("widget");
  });
  it("keeps the other modes", () => {
    expect(mobileMode(null)).toBe("skip");
    expect(mobileMode({ id: "a", isTransition: true })).toBe("skip");
    expect(mobileMode({ id: "a", youtubeID: "x" })).toBe("static");
    expect(mobileMode({ id: "a", fullscreen: true })).toBe("scroll");
    expect(mobileMode({ id: "a" })).toBe("interactive");
  });
});
