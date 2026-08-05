import { describe, it, expect } from "vitest";
import {
  chapterAttrFromParam,
  applyChapterAttr,
  CHAPTER_RAMP_MIN,
  CHAPTER_RAMP_MAX,
} from "@/helper/chapterTheme";

/*
 * brand.css defines ramps only for [data-chapter="1".."5"]. Anything outside
 * that must resolve to null (attribute removed → neutral :root ramp) — an
 * out-of-range value left on <html> would silently kill every chapter token.
 */

describe("chapterAttrFromParam", () => {
  it("maps in-range chapter numbers to their attribute value", () => {
    for (let n = CHAPTER_RAMP_MIN; n <= CHAPTER_RAMP_MAX; n++) {
      expect(chapterAttrFromParam(String(n))).toBe(String(n));
    }
  });

  it("normalises zero-padded params so they still hit a defined ramp", () => {
    expect(chapterAttrFromParam("03")).toBe("3");
  });

  it("returns null outside the defined ramp range", () => {
    expect(chapterAttrFromParam("0")).toBe(null);
    expect(chapterAttrFromParam("6")).toBe(null);
    expect(chapterAttrFromParam("999")).toBe(null);
  });

  it("returns null for absent or junk params (non-chapter routes)", () => {
    expect(chapterAttrFromParam(undefined)).toBe(null);
    expect(chapterAttrFromParam("")).toBe(null);
    expect(chapterAttrFromParam("abc")).toBe(null);
    expect(chapterAttrFromParam("1.5")).toBe(null);
    expect(chapterAttrFromParam("-1")).toBe(null);
  });
});

describe("applyChapterAttr", () => {
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

  it("sets the attribute on a chapter route", () => {
    const el = stubEl();
    applyChapterAttr("3", el);
    expect(el.attrs["data-chapter"]).toBe("3");
  });

  it("clears a stale attribute when leaving chapters", () => {
    const el = stubEl("2");
    applyChapterAttr(undefined, el);
    expect("data-chapter" in el.attrs).toBe(false);
  });

  it("clears rather than sets for out-of-range chapters", () => {
    const el = stubEl("1");
    applyChapterAttr("7", el);
    expect("data-chapter" in el.attrs).toBe(false);
  });
});
