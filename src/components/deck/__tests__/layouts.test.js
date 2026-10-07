/*
 * The deck data and the layout registry agree: every entry names a known
 * layout, ids are unique (they key the slides), and the funding numbers on
 * the trajectory slide add up. safeSlides (OPENBRAIN-129) turns entries from
 * the database into slides without ever throwing.
 */
import { afterEach, describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { SLIDE_LAYOUTS, safeSlides, toSlides } from "../slides/layouts.js";
import TrajectorySlide from "../slides/TrajectorySlide.vue";
import SectionSlide from "../slides/SectionSlide.vue";
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

describe("safeSlides", () => {
  afterEach(() => vi.restoreAllMocks());

  const good = (id, extra = {}) => ({
    id,
    label: id,
    layout: "section",
    props: { title: id },
    ...extra,
  });

  it("gives the same slides as toSlides for the bundled decks", () => {
    for (const entries of [FUNDING_DECK, DECK_TEMPLATES]) {
      const { slides, problems } = safeSlides(entries);
      expect(problems).toEqual([]);
      expect(slides).toEqual(toSlides(entries));
    }
  });

  it("skips hidden slides in both modes", () => {
    const entries = [good("a"), good("b", { hidden: true }), good("c")];
    for (const mode of ["public", "draft"])
      expect(safeSlides(entries, { mode }).slides.map((s) => s.id)).toEqual([
        "a",
        "c",
      ]);
  });

  it("skips what it can't show in public mode, with a warning", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const error = vi.spyOn(console, "error");
    const { slides, problems } = safeSlides([
      good("a"),
      { id: "x", label: "X", layout: "nope", props: {} },
      null,
      "junk",
      good("b"),
    ]);
    expect(slides.map((s) => s.id)).toEqual(["a", "b"]);
    expect(problems).toEqual([
      { slideId: "x", index: 1, message: 'Unknown slide layout "nope"' },
      { slideId: null, index: 2, message: expect.any(String) },
      { slideId: null, index: 3, message: expect.any(String) },
    ]);
    expect(warn).toHaveBeenCalledTimes(3);
    expect(error).not.toHaveBeenCalled();
  });

  it("puts a problem slide in its place in draft mode", () => {
    const warn = vi.spyOn(console, "warn");
    const { slides, problems } = safeSlides(
      [good("a"), { id: "x", label: "X", layout: "nope" }],
      { mode: "draft" }
    );
    expect(problems).toHaveLength(1);
    expect(slides[1]).toEqual({
      id: "x",
      label: "X",
      component: SectionSlide,
      props: {
        eyebrow: "Problem",
        title: "Slide 2 can't be shown",
        lead: 'Unknown slide layout "nope"',
      },
    });
    expect(warn).not.toHaveBeenCalled();
  });

  it("normalises props and keeps slide ids unique", () => {
    const { slides } = safeSlides([
      good("a", { props: { title: 7, junk: true } }),
      good("a"),
      { label: "No id", layout: "section", props: { title: "T" } },
    ]);
    expect(slides[0].props).toEqual({ title: "7" });
    expect(slides.map((s) => s.id)).toEqual(["a", "a-2", "slide-3"]);
  });

  it("never throws", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    for (const input of [undefined, null, "x", 3, {}, [undefined], [[]], [{}]])
      for (const mode of ["public", "draft"])
        expect(() => safeSlides(input, { mode })).not.toThrow();
    expect(safeSlides(undefined)).toEqual({ slides: [], problems: [] });
  });
});
