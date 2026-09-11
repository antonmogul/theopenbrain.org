import { describe, it, expect } from "vitest";
import {
  rampForModule,
  applyChapterRamp,
  clearChapterRamp,
  isRamp,
  RAMPS,
  RAMP_BY_SLUG,
} from "@/helper/chapterTheme";

/*
 * brand.css defines ramps only for [data-chapter="fund|perc|move|lear|deve"].
 * Anything else must resolve to null (attribute removed → neutral :root ramp)
 * — a stray value left on <html> would silently kill every chapter token.
 *
 * Ramps are subjects, not chapter numbers (OPENBRAIN-30): the resolver must
 * never look at order_index or the route.
 */

describe("rampForModule", () => {
  it("prefers the module's own ramp column when it is a known ramp", () => {
    for (const ramp of RAMPS) {
      expect(rampForModule({ slug: "the-retina", ramp })).toBe(ramp);
    }
  });

  it("falls back to the slug map when the column is absent (pre-migration)", () => {
    expect(rampForModule({ slug: "the-retina" })).toBe("perc");
    expect(rampForModule({ slug: "foundations-of-neuroscience" })).toBe("fund");
    expect(rampForModule({ slug: "attention-and-working-memory" })).toBe(
      "lear"
    );
  });

  it("falls back to the slug map when the column holds junk", () => {
    expect(rampForModule({ slug: "the-retina", ramp: "purple" })).toBe("perc");
    expect(rampForModule({ slug: "the-retina", ramp: null })).toBe("perc");
    expect(rampForModule({ slug: "the-retina", ramp: 2 })).toBe("perc");
  });

  it("ignores order_index entirely — ramps are subjects, not positions", () => {
    // Retina is chapter 1 in the DB but Perception (2nd ramp) by subject.
    expect(rampForModule({ slug: "the-retina", order_index: 1 })).toBe("perc");
    expect(
      rampForModule({ slug: "foundations-of-neuroscience", order_index: 3 })
    ).toBe("fund");
  });

  it("returns null for unknown slugs, missing modules and junk", () => {
    expect(rampForModule({ slug: "stress" })).toBe(null);
    expect(rampForModule({})).toBe(null);
    expect(rampForModule(null)).toBe(null);
    expect(rampForModule(undefined)).toBe(null);
    expect(rampForModule("perc")).toBe(null);
  });

  it("only maps to ramps brand.css defines", () => {
    for (const ramp of Object.values(RAMP_BY_SLUG)) {
      expect(isRamp(ramp)).toBe(true);
    }
  });
});

describe("applyChapterRamp / clearChapterRamp", () => {
  const stubEl = (initial) => {
    const attrs = initial ? { "data-chapter": initial } : {};
    return {
      attrs,
      setAttribute(k, v) {
        attrs[k] = v;
      },
      removeAttribute(k) {
        delete attrs[k];
      },
    };
  };

  it("sets the attribute from the module", () => {
    const el = stubEl();
    expect(applyChapterRamp({ slug: "the-retina" }, el)).toBe("perc");
    expect(el.attrs["data-chapter"]).toBe("perc");
  });

  it("DB ramp overrides the slug fallback on the element too", () => {
    const el = stubEl();
    applyChapterRamp({ slug: "the-retina", ramp: "move" }, el);
    expect(el.attrs["data-chapter"]).toBe("move");
  });

  it("removes a stale attribute when the module has no ramp", () => {
    const el = stubEl("lear");
    expect(applyChapterRamp({ slug: "unknown" }, el)).toBe(null);
    expect("data-chapter" in el.attrs).toBe(false);
  });

  it("removes the attribute for null (non-chapter routes)", () => {
    const el = stubEl("perc");
    applyChapterRamp(null, el);
    expect("data-chapter" in el.attrs).toBe(false);
    const el2 = stubEl("perc");
    clearChapterRamp(el2);
    expect("data-chapter" in el2.attrs).toBe(false);
  });
});
