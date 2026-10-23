import { describe, expect, it } from "vitest";
import { explorePairIds } from "../explorePairs";

const p = (id, explore = true) => ({
  id,
  ...(explore ? { explore: { title: id } } : {}),
});
describe("breakout Explore pairs", () => {
  it("pairs only adjacent disclosures, never across prose, and leaves odd cards alone", () => {
    expect([
      ...explorePairIds({
        kind: "box",
        paragraphs: [p("a"), p("b"), p("prose", false), p("c"), p("d"), p("e")],
      }),
    ]).toEqual(["a", "b", "c", "d"]);
    expect([
      ...explorePairIds({
        kind: "box",
        paragraphs: [p("a"), p("prose", false), p("b")],
      }),
    ]).toEqual([]);
  });
  it("does not impose a layout on ordinary chapter sections or missing data", () => {
    expect(
      explorePairIds({ kind: "section", paragraphs: [p("a"), p("b")] }).size
    ).toBe(0);
    expect(explorePairIds({ kind: "box" }).size).toBe(0);
    expect(explorePairIds(null).size).toBe(0);
  });
});
