import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/*
 * Reader chrome, Stuart's October items (OPENBRAIN-145). Source contracts:
 * each one guards the CSS or markup a browser check found or fixed, so a
 * refactor can't quietly bring the symptom back.
 */
const read = (p) => readFileSync(resolve(__dirname, "../../../", p), "utf8");
const rule = (css, selector) => {
  const at = css.indexOf(`${selector} {`);
  return at < 0 ? "" : css.slice(at, css.indexOf("}", at));
};
// Every `@media <query> { ... }` block's body (to its closing brace at
// column 0); index.css has several for the same query.
const mediaBlocks = (css, query) => {
  const head = `@media ${query} {`;
  const out = [];
  let at = css.indexOf(head);
  while (at >= 0) {
    const end = css.indexOf("\n}", at);
    out.push(css.slice(at, end < 0 ? css.length : end + 2));
    at = css.indexOf(head, at + 1);
  }
  return out;
};

const app = read("App.vue");
const drawer = read("components/Navigation/NavDrawer.vue");
const indexCss = read("index.css");
const textComp = read("components/chapter/TextComp.vue");
const rail = read("components/chapter/ReadingRail.vue");

describe("the chapter menu keeps the reader's place (7 Oct, item 1)", () => {
  it("puts no filter on the page while the menu is open", () => {
    // A `filter` on the zero-height route root, with the drawer's overflow
    // lock on <html>, collapsed the document to one screen: scrollY went
    // to 0 and closing the menu left the reader at the top of the chapter.
    const routerView = app.slice(
      app.indexOf("<RouterView"),
      app.indexOf("</RouterView>")
    );
    expect(routerView).toContain("store.activeMenu");
    expect(routerView).not.toMatch(/blur-|grayscale|filter/);
  });

  it("softens the page from the drawer's backdrop instead", () => {
    expect(rule(drawer, ".nav-backdrop")).toMatch(/backdrop-filter:\s*blur/);
  });
});

describe("the divider, its dot and the figure marks share one x (1 Oct, item 3; 24 Sep marks)", () => {
  // The prose column's left edge is the divider: --app-w minus the prose
  // width. The reading-line dot, the figure marks (the reading rail) and the
  // dev centre marker must derive from the same two tokens, or they drift
  // apart on a wide
  // screen (the dot "lies about 1 cm to the left of the vertical center
  // line" was a 50vw dot beside an 890px-capped column).
  const divider = /calc\(var\(--app-w, 100vw\) - var\(--reader-prose-w\)/;

  it("the prose column starts at --app-w minus --reader-prose-w", () => {
    // The two-column rule (@media (min-width: 1024px) .ml-text).
    expect(textComp).toMatch(
      /\.ml-text\s*{[^}]*margin-left:\s*calc\(var\(--app-w, 100vw\) - var\(--reader-prose-w\)\)/
    );
  });

  it("the reading-line dot is centred on that edge", () => {
    const dot = rule(indexCss, ".reading-line");
    expect(dot).toMatch(divider);
    // 0.875rem wide, pulled back by half: its centre is the divider.
    expect(dot).toMatch(/width:\s*0\.875rem/);
    expect(dot).toMatch(/- 0\.4375rem\)/);
  });

  it("the figures' marks are the reading rail's, on the divider and out of the flow (OPENBRAIN-175)", () => {
    // The 24 Sep tick each trigger drew (::before) is gone: one layer on
    // the divider draws a mark per figure, the ribbon and the pulse.
    expect(indexCss).not.toContain(".animationTrigger[id]");
    const layer = rule(rail, ".reading-rail");
    expect(layer).toMatch(/position:\s*absolute/); // no layout shift
    expect(layer).toMatch(
      /left:\s*calc\(var\(--app-w, 100vw\) - var\(--reader-prose-w\)\);/
    );
    expect(layer).toMatch(/width:\s*0/);
    // The pulse is fixed at the reading point, on the same x.
    expect(rule(rail, ".rr-point")).toMatch(divider);
    expect(rule(rail, ".rr-point")).toMatch(/top:\s*50vh/);
    // It mounts before the reading point, which its state restyles.
    expect(textComp).toMatch(
      /<ReadingRail \/>\s*<div class="reading-line" aria-hidden="true" \/>/
    );
  });

  it("the figure that is on takes the chapter's colour: its mark, its ribbon, the reading point", () => {
    expect(rule(rail, ".rr-mark[data-showing] .rr-pill")).toMatch(
      /background:\s*rgb\(var\(--color-chapter-ground\)\)/
    );
    expect(rule(rail, ".rr-span")).toMatch(/rgb\(var\(--color-chapter\)\)/);
    expect(
      rule(indexCss, ".reading-rail[data-showing] ~ .reading-line")
    ).toMatch(/background:\s*rgb\(var\(--color-chapter\)\)/);
  });

  it("a mark's button is the gutter beside its pill, so a press on the pane's edge stays the pane's", () => {
    expect(rule(rail, ".rr-mark")).toMatch(
      /width:\s*calc\(var\(--reader-gutter-l\) - 0\.5rem\)/
    );
    expect(rule(rail, ".rr-mark")).toMatch(/pointer-events:\s*auto/);
    expect(rule(rail, ".rr-pill")).toMatch(/pointer-events:\s*none/);
  });

  it("the dot is desktop-only: hidden below the two-column breakpoint (the rail draws nothing there)", () => {
    const narrow = mediaBlocks(indexCss, "(max-width: 1023px)").find((b) =>
      b.includes(".reading-line")
    );
    expect(narrow).toBeDefined();
    expect(narrow).toMatch(/\.reading-line\s*{\s*display:\s*none/);
    expect(rail).toContain('<template v-if="wide">');
  });

  it("the dev centre marker (?markers=1) sits on the same line", () => {
    expect(rule(indexCss, ".marker-center")).toMatch(divider);
  });
});

describe("reference links are one colour, visited or not (1 Oct, item 4)", () => {
  const tooltip = read("components/chapter/CitationTooltip.vue");
  const refList = read("components/chapter/text/ReferenceList.vue");
  const further = read("components/chapter/text/FurtherReading.vue");

  it.each([
    ["CitationTooltip text links", tooltip, ".ct-text :deep(a:visited)"],
    ["CitationTooltip source link", tooltip, ".ct-doi:visited"],
    ["ReferenceList text links", refList, ".ref-list__text :deep(a:visited)"],
    ["ReferenceList source link", refList, ".ref-list__source:visited"],
    ["FurtherReading links", further, "a:visited"],
  ])("%s take the accent in the visited state too", (_, css, selector) => {
    const at = css.indexOf(selector);
    expect(at, selector).toBeGreaterThan(-1);
    const block = css.slice(at, css.indexOf("}", at));
    expect(block).toMatch(/color:\s*rgb\(var\(--color-accent\)\)/);
  });
});
