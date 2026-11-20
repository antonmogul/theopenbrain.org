import { describe, expect, it, vi } from "vitest";
import { holdVideoFullscreen, videoFullscreenHeld } from "../videoFullscreen";

function setup() {
  const doc = new EventTarget();
  const win = new EventTarget();
  const frames = new Map();
  const timers = new Map();
  let id = 0;
  win.scrollY = 1000;
  win.setTimeout = (fn) => {
    timers.set(++id, fn);
    return id;
  };
  win.clearTimeout = (key) => timers.delete(key);
  win.requestAnimationFrame = (fn) => {
    frames.set(++id, fn);
    return id;
  };
  win.cancelAnimationFrame = (key) => frames.delete(key);
  win.scrollTo = vi.fn(({ top }) => (win.scrollY = top));
  const returned = vi.fn();
  const guard = holdVideoFullscreen(returned, doc, win);
  const nextFrame = () => {
    const pending = [...timers.values()];
    timers.clear();
    pending.forEach((fn) => fn());
    const batch = [...frames.values()];
    frames.clear();
    batch.forEach((fn) => fn());
  };
  const video = document.createElement("div");
  video.className = "ve";
  return { doc, win, returned, guard, nextFrame, video };
}

describe("native video fullscreen reader position", () => {
  it("holds through fullscreen reflow and restores the last reading position after exit settles", () => {
    const { doc, win, guard, returned, nextFrame, video } = setup();
    win.scrollY = 62000;
    win.dispatchEvent(new Event("scroll"));
    doc.fullscreenElement = video;
    // A resize/refresh may happen before the fullscreenchange listener.
    expect(guard.held()).toBe(true);
    doc.dispatchEvent(new Event("fullscreenchange"));
    win.scrollY = 35000;
    win.dispatchEvent(new Event("scroll"));
    win.dispatchEvent(new Event("resize"));
    expect(returned).not.toHaveBeenCalled();
    doc.fullscreenElement = null;
    doc.dispatchEvent(new Event("fullscreenchange"));
    nextFrame();
    win.dispatchEvent(new Event("resize"));
    nextFrame();
    expect(guard.held()).toBe(true);
    expect(videoFullscreenHeld(doc)).toBe(true);
    nextFrame();
    expect(guard.held()).toBe(false);
    expect(videoFullscreenHeld(doc)).toBe(false);
    expect(win.scrollY).toBe(62000);
    expect(returned).toHaveBeenCalledOnce();
    guard.stop();
  });

  it("does not interfere with widgets that own their fullscreen lifecycle", () => {
    const { doc, win, guard, returned, nextFrame } = setup();
    doc.fullscreenElement = document.createElement("div");
    doc.dispatchEvent(new Event("fullscreenchange"));
    expect(guard.held()).toBe(false);
    doc.fullscreenElement = null;
    doc.dispatchEvent(new Event("fullscreenchange"));
    nextFrame();
    nextFrame();
    expect(returned).not.toHaveBeenCalled();
    expect(win.scrollTo).not.toHaveBeenCalled();
    guard.stop();
  });

  it("cancels pending return work and listeners when the reader unmounts", () => {
    const { doc, win, guard, returned, nextFrame, video } = setup();
    doc.fullscreenElement = video;
    doc.dispatchEvent(new Event("fullscreenchange"));
    doc.fullscreenElement = null;
    doc.dispatchEvent(new Event("fullscreenchange"));
    nextFrame();
    guard.stop();
    nextFrame();
    win.dispatchEvent(new Event("resize"));
    doc.dispatchEvent(new Event("fullscreenchange"));
    nextFrame();
    nextFrame();
    expect(returned).not.toHaveBeenCalled();
    expect(win.scrollTo).not.toHaveBeenCalled();
  });
});
