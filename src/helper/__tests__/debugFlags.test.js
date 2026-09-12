import { describe, it, expect } from "vitest";
import { readSpeed, readScrub, readMarkers } from "@/helper/debugFlags";

/*
 * readMarkers gates the reader's scroll-trigger markers (OPENBRAIN-31). The
 * regression to defend: with no param the markers must NOT render — they were
 * the "dots in the middle of the page" readers saw in production.
 */
describe("readMarkers", () => {
  it("is off by default and on unrelated params", () => {
    expect(readMarkers("")).toBe(false);
    expect(readMarkers("?slow=3&scrub=1")).toBe(false);
    expect(readMarkers(undefined)).toBe(false);
  });

  it("turns on for ?markers and ?markers=1", () => {
    expect(readMarkers("?markers")).toBe(true);
    expect(readMarkers("?markers=1")).toBe(true);
    expect(readMarkers("?resume=1&markers=true")).toBe(true);
  });

  it("treats ?markers=0 as an explicit opt-out", () => {
    expect(readMarkers("?markers=0")).toBe(false);
  });
});

/*
 * These gates replaced two hardcoded constants in CaseCabinetView that shipped at
 * their tuning values (SPEED = 3, DEBUG_TIMELINE = true). The regression these
 * tests defend is "the default must be demo-clean" — hence the emphasis on what
 * happens with no param and with junk params.
 */

describe("readSpeed", () => {
  it("defaults to ship speed when no param is present", () => {
    expect(readSpeed("")).toBe(1);
    expect(readSpeed("?other=1")).toBe(1);
  });

  it("reads a positive multiplier", () => {
    expect(readSpeed("?slow=3")).toBe(3);
    expect(readSpeed("?slow=1.5")).toBe(1.5);
  });

  it("falls back to 1 rather than freezing or reversing on bad input", () => {
    // A zero multiplier would collapse every duration to 0; a negative one would
    // make GSAP durations invalid. Both must degrade to ship speed.
    expect(readSpeed("?slow=0")).toBe(1);
    expect(readSpeed("?slow=-2")).toBe(1);
    expect(readSpeed("?slow=abc")).toBe(1);
    expect(readSpeed("?slow=")).toBe(1);
    expect(readSpeed("?slow=Infinity")).toBe(1);
  });

  it("works with or without the leading question mark", () => {
    expect(readSpeed("slow=2")).toBe(2);
  });
});

describe("readScrub", () => {
  it("is off by default so the panel never ships accidentally", () => {
    expect(readScrub("")).toBe(false);
    expect(readScrub("?slow=3")).toBe(false);
  });

  it("turns on from presence alone", () => {
    expect(readScrub("?scrub")).toBe(true);
    expect(readScrub("?scrub=1")).toBe(true);
  });

  it("treats an explicit 0 as opt-out", () => {
    expect(readScrub("?scrub=0")).toBe(false);
  });
});
