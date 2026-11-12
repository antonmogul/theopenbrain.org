import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { keepRefreshInstant } from "../refreshScroll.js";

/* A stand-in for ScrollTrigger: what keepRefreshInstant uses of it. */
function fakeScrollTrigger() {
  const listeners = {};
  return {
    addEventListener: vi.fn((type, fn) => {
      (listeners[type] ||= []).push(fn);
    }),
    // What ScrollTrigger.refresh() does first: dispatch refreshInit and
    // keep each listener's return value (it reverts any animation).
    refresh: () => (listeners.refreshInit || []).map((fn) => fn()),
  };
}

describe("keepRefreshInstant (OPENBRAIN-188)", () => {
  let frames;
  let root;
  beforeEach(() => {
    frames = [];
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((fn) => {
      frames.push(fn);
      return frames.length;
    });
    root = document.createElement("div");
  });
  afterEach(() => vi.restoreAllMocks());
  const nextFrame = () => frames.splice(0).forEach((fn) => fn());

  it("scrolls instantly for the length of a refresh, then gives the behaviour back", () => {
    const st = fakeScrollTrigger();
    root.style.scrollBehavior = "smooth";
    keepRefreshInstant(st, root);

    const returned = st.refresh();
    expect(root.style.scrollBehavior).toBe("auto");
    // Nothing for ScrollTrigger to revert.
    expect(returned).toEqual([undefined]);

    nextFrame();
    expect(root.style.scrollBehavior).toBe("smooth");
  });

  it("puts back an empty inline value, so the stylesheet decides again", () => {
    const st = fakeScrollTrigger();
    keepRefreshInstant(st, root);
    st.refresh();
    expect(root.style.scrollBehavior).toBe("auto");
    nextFrame();
    expect(root.style.scrollBehavior).toBe("");
  });

  it("shares one release between refreshes in the same frame", () => {
    const st = fakeScrollTrigger();
    root.style.scrollBehavior = "smooth";
    keepRefreshInstant(st, root);
    st.refresh();
    st.refresh();
    expect(frames).toHaveLength(1);
    expect(root.style.scrollBehavior).toBe("auto");
    nextFrame();
    // Not the "auto" the first refresh set.
    expect(root.style.scrollBehavior).toBe("smooth");
  });

  it("listens once however often it is called", () => {
    const st = fakeScrollTrigger();
    keepRefreshInstant(st, root);
    keepRefreshInstant(st, root);
    expect(st.addEventListener).toHaveBeenCalledTimes(1);
  });

  it("does nothing for a ScrollTrigger without events (a mock in a test)", () => {
    expect(() => keepRefreshInstant({}, root)).not.toThrow();
    expect(() => keepRefreshInstant(undefined, root)).not.toThrow();
  });
});
