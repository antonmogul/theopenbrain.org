import { describe, it, expect, vi } from "vitest";
import {
  resolveAnimationRecord,
  isConfigBearing,
  resolveAnimationConfig,
} from "@/helper/animationResolve";

/*
 * The failure mode these defend is silent-empty: a figure that resolves to
 * nothing renders nothing, with no error (see docs/chapter1-parity/). Every
 * miss must warn; every partial source must still fall through per-record.
 */

const DB = [
  { id: "animationEye", title: "Eye (DB)", loop: true },
  { id: "animationDbOnly", title: "DB only" },
];
const JSON_LIST = [
  { id: "animationEye", title: "Eye (JSON)", loop: false },
  { id: "animationJsonOnly", title: "JSON only", multiple: true },
];

describe("resolveAnimationRecord", () => {
  it("prefers the DB record when both sources have it", () => {
    const r = resolveAnimationRecord("animationEye", DB, JSON_LIST);
    expect(r.title).toBe("Eye (DB)");
  });

  it("falls back per-record to JSON when the DB lacks that id", () => {
    // Other DB rows existing must NOT block the JSON fallback for this one.
    const r = resolveAnimationRecord("animationJsonOnly", DB, JSON_LIST);
    expect(r.title).toBe("JSON only");
  });

  it("resolves from JSON when the DB list is empty or absent", () => {
    expect(resolveAnimationRecord("animationEye", [], JSON_LIST).title).toBe(
      "Eye (JSON)"
    );
    expect(resolveAnimationRecord("animationEye", null, JSON_LIST).title).toBe(
      "Eye (JSON)"
    );
  });

  it("warns and returns null when neither source has the id", () => {
    const warn = vi.fn();
    const r = resolveAnimationRecord("animationMissing", DB, JSON_LIST, warn);
    expect(r).toBe(null);
    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0][0]).toContain("animationMissing");
  });

  it("returns null quietly for a missing id (non-animation paragraph)", () => {
    const warn = vi.fn();
    expect(resolveAnimationRecord(undefined, DB, JSON_LIST, warn)).toBe(null);
    expect(warn).not.toHaveBeenCalled();
  });
});

describe("isConfigBearing", () => {
  it("recognises DB-shaped objects by any config flag", () => {
    expect(isConfigBearing({ id: "a", loop: false })).toBe(true);
    expect(isConfigBearing({ id: "a", switch: true })).toBe(true);
    expect(isConfigBearing({ id: "a", flip: false })).toBe(true);
  });

  it("rejects Chapter 1's bare {name,id,title,transition} stubs", () => {
    expect(
      isConfigBearing({ name: "Eye", id: "animationEye", transition: false })
    ).toBe(false);
    expect(isConfigBearing(null)).toBe(false);
  });
});

describe("resolveAnimationConfig", () => {
  it("returns the prop untouched when it is config-bearing (DB path)", () => {
    const prop = { id: "animationEye", loop: true, states: ["a"] };
    expect(resolveAnimationConfig(prop, JSON_LIST)).toBe(prop);
  });

  it("looks up the JSON record for bare legacy stubs", () => {
    const prop = { name: "Eye", id: "animationEye", title: "Eye" };
    expect(resolveAnimationConfig(prop, JSON_LIST).title).toBe("Eye (JSON)");
  });

  it("keeps the bare prop (renders something) and warns when JSON misses too", () => {
    const warn = vi.fn();
    const prop = { name: "X", id: "animationUnknown", title: "X" };
    expect(resolveAnimationConfig(prop, JSON_LIST, warn)).toBe(prop);
    expect(warn).toHaveBeenCalledOnce();
  });
});
