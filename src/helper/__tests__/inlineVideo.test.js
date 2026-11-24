import { describe, expect, it, vi } from "vitest";
import { primeInlineLoop } from "@/helper/inlineVideo";

// Every component of the reader, as source.
const sources = import.meta.glob("/src/components/chapter/**/*.vue", {
  query: "?raw",
  import: "default",
  eager: true,
});

/*
 * Reader videos stay in the page (OPENBRAIN-74; Stuart, 20 Nov, on the
 * Retina's last figures: "The videos of the sheep/goats … keep popping up
 * randomly in full screen on mobile"). iPhone Safari opens a playing video
 * in its own full-screen player unless the element says playsinline.
 */
describe("reader videos", () => {
  it("marks a loop muted and inline as attributes, and starts it", () => {
    const video = document.createElement("video");
    video.play = vi.fn(() => Promise.reject(new Error("not allowed")));
    primeInlineLoop(video);
    for (const name of ["muted", "playsinline", "webkit-playsinline"])
      expect(video.hasAttribute(name)).toBe(true);
    expect(video.muted).toBe(true);
    expect(video.play).toHaveBeenCalled();
    expect(() => primeInlineLoop(null)).not.toThrow();
  });

  it("every <video> in the reader plays inline, and only a muted one starts itself", () => {
    const tags = Object.entries(sources)
      .filter(([path]) => !path.includes("__"))
      .flatMap(([, source]) => source.match(/<video\b[^>]*>/g) || []);
    expect(tags.length).toBe(4);
    for (const tag of tags) {
      expect(tag).toMatch(/\bplaysinline\b/);
      expect(tag).toMatch(/\bwebkit-playsinline\b/);
      if (/\bautoplay\b/.test(tag)) expect(tag).toMatch(/\bmuted\b/);
    }
  });

  it("only the expand button asks for the browser's full screen", () => {
    const callers = Object.entries(sources)
      .filter(([, source]) =>
        /requestFullscreen\(|webkitEnterFullscreen\(/.test(source)
      )
      .map(([path]) => path.split("/").pop());
    expect(callers).toEqual(["IllustrationPlaceholder.vue"]);
    const shell =
      sources["/src/components/chapter/Illus/IllustrationPlaceholder.vue"];
    // One call, inside openFullscreen, which only the button's click runs.
    expect(shell.match(/requestFullscreen\(/g)).toHaveLength(1);
    expect(shell.match(/openFullscreen\b/g)).toHaveLength(2);
    expect(shell).toMatch(/@click="openFullscreen"/);
  });
});
