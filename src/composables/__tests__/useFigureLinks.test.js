import { describe, expect, it } from "vitest";
import { findFigureTrigger } from "../useFigureLinks.js";

// "(Figure N)" links (OPENBRAIN-91): find the paragraph that shows figure N.
describe("findFigureTrigger", () => {
  function page() {
    document.body.innerHTML = `
      <span id="triggerAnimationFoundationsFig3" class="animationTrigger"></span>
      <span id="triggerAnimationFoundationsFig4" class="animationTrigger"></span>
      <span id="triggerAnimationEyeStructur" class="animationTrigger"></span>`;
  }

  it("uses the figure's number from its record", () => {
    page();
    const records = [
      { id: "animationFoundationsFig4", figureNumber: 4 },
      { id: "animationEyeStructur", figureNumber: 12 },
    ];
    expect(findFigureTrigger("4", records).id).toBe(
      "triggerAnimationFoundationsFig4"
    );
    expect(findFigureTrigger(12, records).id).toBe(
      "triggerAnimationEyeStructur"
    );
  });

  it("falls back to the key's Fig number", () => {
    page();
    expect(findFigureTrigger("3", []).id).toBe(
      "triggerAnimationFoundationsFig3"
    );
  });

  it("finds nothing for a figure that isn't on the page", () => {
    page();
    expect(findFigureTrigger("9", [])).toBeNull();
    expect(findFigureTrigger("", [])).toBeNull();
  });
});
