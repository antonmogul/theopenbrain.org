import { describe, it, expect } from "vitest";
import {
  FIGURE_LINE,
  HEADING_IN,
  HEADING_UP,
  MIN_RUN,
  START_LINE,
  cardState,
  titleShare,
} from "@/helper/sectionCard";

/*
 * When a section's card is in the pane (OPENBRAIN-174). A 900px screen: the
 * card comes in when the last section's text passes 675 (START_LINE) and
 * leaves when the section's first figure reaches 450 (FIGURE_LINE, where
 * the pane's own trigger starts).
 */

const SCREEN = 900;
// A section 320 below the last one's text (the gap), its first figure 400
// below its top, the whole thing `y` down the screen.
const at = (y, run = 400) => ({
  gapStart: y,
  top: y + 320,
  end: y + 320 + run,
});

describe("cardState", () => {
  it("is off until the last section's text reaches the start line", () => {
    expect(cardState(at(SCREEN * START_LINE + 1), SCREEN).on).toBe(false);
    expect(cardState(at(SCREEN + 400), SCREEN)).toEqual({
      on: false,
      progress: 0,
    });
  });

  it("comes in at the start line, at progress 0", () => {
    const state = cardState(at(SCREEN * START_LINE), SCREEN);
    expect(state.on).toBe(true);
    expect(state.progress).toBe(0);
  });

  it("stays through the gap and the heading", () => {
    // The heading is at mid-screen: still the card's.
    const state = cardState(at(SCREEN * FIGURE_LINE - 320), SCREEN);
    expect(state.on).toBe(true);
    expect(state.progress).toBeGreaterThan(0.4);
    expect(state.progress).toBeLessThan(1);
  });

  it("leaves when the first figure reaches the figure line", () => {
    const line = SCREEN * FIGURE_LINE;
    expect(cardState(at(line - 720 + 1), SCREEN).on).toBe(true);
    expect(cardState(at(line - 720), SCREEN)).toEqual({
      on: false,
      progress: 1,
    });
    expect(cardState(at(-5000), SCREEN).on).toBe(false);
  });

  it("runs its progress evenly from arrival to leaving", () => {
    const start = SCREEN * START_LINE;
    const leave = SCREEN * FIGURE_LINE - 720;
    const half = cardState(at((start + leave) / 2), SCREEN);
    expect(half.progress).toBeCloseTo(0.5, 5);
  });

  it("skips a section whose first figure follows its heading at once", () => {
    // A figure held to the section's top would leave the card only this.
    expect(cardState(at(400, MIN_RUN - 1), SCREEN).on).toBe(false);
    expect(cardState(at(400, MIN_RUN), SCREEN).on).toBe(true);
  });

  it("is off for anything it cannot measure", () => {
    expect(cardState(null, SCREEN).on).toBe(false);
    expect(cardState(at(400), 0).on).toBe(false);
    expect(cardState({ gapStart: NaN, top: 100, end: 900 }, SCREEN).on).toBe(
      false
    );
  });
});

describe("titleShare", () => {
  it("is whole while the heading is low on the screen", () => {
    expect(titleShare(SCREEN, SCREEN)).toBe(1);
    expect(titleShare(SCREEN * HEADING_IN, SCREEN)).toBe(1);
  });

  it("is gone once the heading has come up", () => {
    expect(titleShare(SCREEN * HEADING_UP, SCREEN)).toBe(0);
    expect(titleShare(0, SCREEN)).toBe(0);
    expect(titleShare(-300, SCREEN)).toBe(0);
  });

  it("goes evenly between the two", () => {
    const mid = (SCREEN * (HEADING_IN + HEADING_UP)) / 2;
    expect(titleShare(mid, SCREEN)).toBeCloseTo(0.5, 5);
  });

  it("shows the title when it cannot tell", () => {
    expect(titleShare(NaN, SCREEN)).toBe(1);
    expect(titleShare(100, 0)).toBe(1);
  });
});
