import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { mount } from "@vue/test-utils";
import PlayMark from "../PlayMark.vue";

describe("PlayMark, the reader's one play button (OPENBRAIN-87)", () => {
  it("is one drawing: a disc with the icon as a hole in it", () => {
    const w = mount(PlayMark);
    expect(w.attributes("aria-hidden")).toBe("true");
    expect(w.attributes("data-icon")).toBe("play");
    expect(w.findAll("path")).toHaveLength(1);
    const path = w.get("path");
    expect(path.attributes("fill-rule")).toBe("evenodd");
    expect(path.attributes("d")).toMatch(/^M100 50A50 50/);
    w.unmount();
  });

  it("draws pause in the same disc, and play for anything else", async () => {
    const w = mount(PlayMark, { props: { icon: "pause" } });
    const pause = w.get("path").attributes("d");
    expect(w.attributes("data-icon")).toBe("pause");
    await w.setProps({ icon: "play" });
    const play = w.get("path").attributes("d");
    expect(play).not.toBe(pause);
    await w.setProps({ icon: "stop" });
    expect(w.attributes("data-icon")).toBe("play");
    expect(w.get("path").attributes("d")).toBe(play);
    w.unmount();
  });

  it("can be cut out of the ink it is given", () => {
    const w = mount(PlayMark, { props: { cut: true } });
    expect(w.classes()).toContain("play-mark--cut");
    w.unmount();
  });

  // One style means no second drawing: the reader's components draw a play
  // control with PlayMark, never with the "▶" character or a triangle of
  // their own. (The figure placeholder's type glyph and the timeline's lane
  // marks are labels, not controls, and uploaded widgets are their authors'.)
  it("is the only play control drawn in the chapter's components", () => {
    const LABELS = new Set([
      "src/components/chapter/Illus/IllustrationPlaceholder.vue",
      "src/components/chapter/timeline/TimelineBars.vue",
      "src/components/chapter/timeline/TimelinePreview.vue",
    ]);
    const files = [];
    const walk = (dir) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) {
          if (!/^__(tests|stories)__$/.test(name)) walk(path);
        } else if (name.endsWith(".vue")) files.push(path);
      }
    };
    walk("src/components/chapter");
    expect(files.length).toBeGreaterThan(50);
    const glyphs = files.filter(
      (file) => !LABELS.has(file) && readFileSync(file, "utf8").includes("▶")
    );
    expect(glyphs).toEqual([]);
  });
});
