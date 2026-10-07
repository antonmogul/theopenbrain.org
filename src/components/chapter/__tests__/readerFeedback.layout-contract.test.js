import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
// These guard the layout contract in DOM-only CI. Pixel/viewport acceptance
// still requires a real browser at the supported desktop and phone widths.
const source = (file) => readFileSync(new URL(file, import.meta.url), "utf8");
describe("1 October reader layout contracts", () => {
  it("anchors gallery arrows to the viewport regardless of caption/image height", () => {
    const css = source("../Illus/FigureImages.vue");
    expect(css).toMatch(
      /\.figview-nav\s*\{[^}]*position: fixed;[^}]*top: 50dvh;/
    );
    expect(css).toMatch(/\.figview\s*\{[^}]*z-index: 1200;/);
  });
  it("removes every perimeter gap on wide interactive dialogs", () => {
    const css = source("../demos/DemoModal.vue");
    expect(css).toMatch(/\.demo-backdrop--wide\s*\{\s*padding: 0;/);
    expect(css).toMatch(
      /\.demo-panel--wide\s*\{[^}]*height: 100dvh;[^}]*margin: 0;[^}]*border-radius: 0;/
    );
    expect(css).toContain("overscroll-behavior: contain");
  });
  it("uses the same scrollbar-excluding origin for the reading dot and prose divider", () => {
    const text = source("../TextComp.vue");
    const css = source("../../../index.css");
    expect(text).toContain(
      "margin-left: calc(var(--app-w, 100vw) - var(--reader-prose-w))"
    );
    expect(css).toMatch(
      /\.reading-line\s*\{[^}]*left: calc\(var\(--app-w, 100vw\) - var\(--reader-prose-w\) - 0\.4375rem\)/
    );
    expect(text).toContain('class="absolute left-0 top-start');
  });
  it("lets a short breakout share one viewport with its text, without a title-only scroll hold", () => {
    const css = source("../text/BreakoutBox.vue");
    expect(css).toContain(
      "min-height: calc(100dvh - var(--reader-topbar-h, 4rem))"
    );
    expect(css).not.toContain("35vh");
    expect(css).not.toContain("position: sticky");
  });
  it("keeps figure references bold without link visual affordances", () => {
    const css = source("../../../index.css");
    expect(css).toMatch(
      /\.figure-ref\s*\{[^}]*font-weight: 700;[^}]*cursor: text;/
    );
    expect(css).not.toContain(".figure-ref:hover");
  });
});
