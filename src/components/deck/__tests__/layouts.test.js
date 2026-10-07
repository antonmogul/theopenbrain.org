/*
 * The deck data and the layout registry agree: every entry names a known
 * layout, ids are unique (they key the slides), and the funding numbers on
 * the trajectory slide add up.
 */
import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import { SLIDE_LAYOUTS, toSlides } from "../slides/layouts.js";
import TrajectorySlide from "../slides/TrajectorySlide.vue";
import { FUNDING_DECK } from "@/data/decks/funding.js";
import { DECK_TEMPLATES } from "@/data/decks/templates.js";

describe.each([
  ["funding", FUNDING_DECK],
  ["templates", DECK_TEMPLATES],
])("%s deck data", (_, entries) => {
  it("uses only registered layouts", () => {
    for (const e of entries) expect(SLIDE_LAYOUTS).toHaveProperty(e.layout);
    expect(() => toSlides(entries)).not.toThrow();
  });

  it("has unique slide ids", () => {
    const ids = entries.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("toSlides", () => {
  it("throws on an unknown layout", () => {
    expect(() => toSlides([{ id: "x", layout: "nope" }])).toThrow(/nope/);
  });
});

describe("trajectory slide", () => {
  const entry = FUNDING_DECK.find((e) => e.id === "trajectory");

  it("draws one bar per chapter, in status order", () => {
    const w = mount(TrajectorySlide, { props: entry.props });
    const bars = w.findAll(".trajectory__bar").map((b) => b.classes()[1]);
    const { live, inProgress, funded, unfunded } = entry.props.chapters;
    expect(bars).toHaveLength(live + inProgress + funded + unfunded);
    expect(bars.slice(0, live)).toEqual(Array(live).fill("is-live"));
    expect(bars.at(-1)).toBe("is-unfunded");
  });

  it("states the same unfunded count the strip shows", () => {
    const { chapters } = entry.props;
    const total = Object.values(chapters).reduce((a, b) => a + b, 0);
    expect(entry.props.summary).toBe(
      `${chapters.unfunded} of ${total} chapters still need funding`
    );
  });
});
