import { afterEach, describe, expect, it } from "vitest";
import { prefersReducedMotion } from "../shared/motion.js";

afterEach(() => {
  delete document.documentElement.dataset.reduceMotion;
  delete window.matchMedia;
});

describe("prefersReducedMotion", () => {
  it("follows the reader's own setting first", () => {
    window.matchMedia = () => ({ matches: false });
    document.documentElement.dataset.reduceMotion = "1";
    expect(prefersReducedMotion()).toBe(true);
    window.matchMedia = () => ({ matches: true });
    document.documentElement.dataset.reduceMotion = "0";
    expect(prefersReducedMotion()).toBe(false);
  });

  it("falls back to the operating system's", () => {
    window.matchMedia = () => ({ matches: true });
    expect(prefersReducedMotion()).toBe(true);
    window.matchMedia = () => ({ matches: false });
    expect(prefersReducedMotion()).toBe(false);
  });
});
