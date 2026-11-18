import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  ANCHOR_KINDS,
  anchorFor,
  anchorHash,
  closestAcross,
  figureName,
  findAnchorElement,
  pickTarget,
  pointIn,
  sameAnchor,
  selectorFor,
  shorten,
  targetAt,
} from "@/helper/reviewAnchor.mjs";

/*
 * A reader in miniature, built from the DOM the real one renders (probed
 * on History and the Retina at 1440 and 390, 18 Nov): the top bar, the
 * figure pane, an intro, a section with a subsection, a breakout box that
 * floats in the stage layer with a side-scrolling track (an Explore part
 * with an unnumbered picture; a part whose figure is two plates, each a
 * figure of its own), an upload widget band floating over its slot, an
 * inline figure, the references, the contents and the timeline dock.
 */
const READER = `
<div class="reader-top-bar" data-testid="reader-top-bar"><button id="menu">menu</button></div>
<div class="chapter-reader">
  <div class="figure-pane figure-pane--dark" data-ground="dark" data-figure-key="animationfoundationsfig6">
    <div class="fig-pane"><figure class="fig-shell"><p class="fig-heading"><span class="fig-label">FIG 08</span><span class="fig-name">Dom title</span></p><img id="pane-img"></figure></div>
  </div>
  <div class="chapter-opener" data-chapter-opener>
    <section class="opener-hero"><div id="cover-art"></div></section>
    <section id="chapter-toc" class="otoc"><h1 id="opener-toc-title">Contents</h1>
      <nav><li class="otoc__section" data-index="1"><span id="toc-row-text">1. Where is my mind?</span></li></nav>
    </section>
  </div>
  <main id="text">
    <section id="intro-id" class="reader-section">
      <h1 id="intro-id-heading">Introduction</h1>
      <div id="p-intro" class="P" data-paragraph-id="11111111-0000-4000-8000-000000000001">Intro text.</div>
    </section>
    <section id="s1" class="reader-section" data-section-slug="where-is-my-mind">
      <h2 class="TN">1</h2>
      <h2 class="T subChapter">Where is my mind?</h2>
      <span id="triggerAnimationFoundationsFig6" class="animationTrigger active">
        <div id="p1" class="P" data-paragraph-id="11111111-0000-4000-8000-000000000002">First paragraph about <b id="p1-bold">ventricles</b>.</div>
        <figure class="illu-inline" data-figure-key="animationFoundationsFig6"><figure class="fig-shell"><img id="inline-img"></figure></figure>
      </span>
      <div id="p2" class="P" data-paragraph-id="11111111-0000-4000-8000-000000000003">Second paragraph.</div>
      <span id="synaptic-architecture"></span>
      <h3 id="sub-h" class="subT">Synaptic architecture</h3>
      <div id="p3" class="subP" data-paragraph-id="11111111-0000-4000-8000-000000000004">Under the subsection.</div>
      <div id="p4" class="subP" data-paragraph-id="11111111-0000-4000-8000-000000000005">Second under it.</div>
      <div class="fb-slot fb-slot--vacated" data-fb-slot="v-1"></div>
      <aside class="wb wb--inline" data-widget-breakout="upload:history-penfield-binder" data-timeline-id="22222222-0000-4000-8000-000000000001">
        <div class="fb-slot fb-slot--vacated" data-fb-slot="v-2"></div>
      </aside>
    </section>
  </main>
  <div id="chapter-back" data-reader-end>
    <div class="cr" data-section-slug="references" data-chapter-references>
      <ol class="ref-list"><li id="ref-12" class="ref-list__item" value="12"><span class="ref-list__text" id="ref-12-text">Finger, S. Origins of Neuroscience.</span></li></ol>
    </div>
  </div>
</div>
<div id="reader-stage-layer">
  <div class="fb-stage fb-stage--floating" data-fb-stage="v-1" data-breakout-box="box-uuid">
    <div class="bx-pause" data-rail-pause>
      <aside id="box-uuid" class="bx" data-section-slug="box-descartes">
        <header class="bx-intro"><p class="sr-only" data-box-label>Box A</p><h2 id="box-title" class="bx-title">Separating mind from body</h2></header>
        <div class="bx-body" data-rail-scroller data-rail-mode="track" data-rail-pinned="1">
          <div class="bx-rail-row">
            <div id="part-1" class="rp" data-rail-part data-explore="33333333-0000-4000-8000-000000000001">
              <figure id="explore-pic" class="rf" data-rail-figure><div class="rf-plate" data-rail-plate><img id="explore-img"></div></figure>
              <div class="rp-text"><h3 id="part-1-title" class="rp-title">Hippocrates’ view</h3>
                <div id="bp1" class="P" data-paragraph-id="33333333-0000-4000-8000-000000000001">Box text one.</div>
              </div>
            </div>
            <div id="part-2" class="rp" data-rail-part>
              <figure id="figA" class="rf" data-rail-figure data-rail-figure-id="animationFoundationsFigA">
                <div id="plate-0" class="rf-plate" data-rail-plate><img><p class="rf-plate-name" data-rail-plate-label><span class="rf-label">FIG D</span><span class="rf-name">Descartes' skull</span></p></div>
                <div id="plate-1" class="rf-plate" data-rail-plate><img id="plate-1-img"><p class="rf-plate-name" data-rail-plate-label><span class="rf-label">FIG E</span><span class="rf-name">Piece of the skull</span></p></div>
              </figure>
              <div class="rp-text" id="part-2-text">
                <span id="triggerAnimationFoundationsFigA" class="animationTrigger"><div id="bp2" class="P" data-paragraph-id="33333333-0000-4000-8000-000000000002">Box text two.</div></span>
              </div>
            </div>
          </div>
        </div>
        <nav id="box-nav" class="bx-rail-nav"><button>Next</button></nav>
      </aside>
    </div>
  </div>
  <div class="fb-stage fb-stage--floating" data-fb-stage="v-2">
    <div class="wb-layout"><div class="wb-body wb-band">
      <header class="wb-head"><div class="wb-sr"><h3 class="wb-title">Find out what it was like to be Dr. Wilder Penfield</h3></div></header>
      <div id="wb-stage" class="wb-stage" data-widget-stage="upload:history-penfield-binder"><iframe id="upload-frame" sandbox="allow-scripts"></iframe></div>
      <footer id="wb-foot" class="wb-foot"></footer>
    </div></div>
  </div>
</div>
<div class="ctl"><div id="ctl-bars" class="ctl-bars"></div></div>
<div data-review-ui id="review-overlay"></div>
`;

const RECORDS = [
  {
    id: "animationFoundationsFig6",
    figureNumber: 8,
    title: "The cell doctrine (ventricular theory)",
  },
  {
    id: "animationFoundationsFigA",
    figureNumber: "D",
    title: "Descartes' skull, Musée de l'homme",
  },
];
const recordFor = (key) =>
  RECORDS.find((r) => r.id.toLowerCase() === String(key).toLowerCase()) || null;
const PAGE = {
  scrollY: 4200,
  docHeight: 70000,
  viewport: { w: 1440, h: 900, dpr: 2 },
  layout: "two-column",
  theme: "light",
  reduceMotion: false,
};
const ctx = { recordFor, page: PAGE };

const $ = (sel) => document.querySelector(sel);
/** Every element gets a 100×100 box at (0,0) unless a test says otherwise. */
function box(el, { left = 0, top = 0, width = 100, height = 100 } = {}) {
  el.getBoundingClientRect = () => ({
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
  });
}
/** The elementsFromPoint stack for a hit on `sel`: it and its ancestors. */
function stackAt(sel) {
  const out = [$("#review-overlay")];
  for (let el = $(sel); el; el = el.parentElement) out.push(el);
  return out;
}

beforeEach(() => {
  document.body.innerHTML = READER;
  for (const el of document.querySelectorAll("*")) box(el);
});
afterEach(() => {
  document.body.innerHTML = "";
});

describe("pickTarget: the meaningful thing, not the innermost element", () => {
  const cases = [
    ["#menu", "chrome", ".reader-top-bar"],
    ["#ctl-bars", "chrome", ".ctl"],
    ["#upload-frame", "widget", "#upload-frame"],
    ["#wb-foot", "widget", ".wb-body"],
    ["#plate-1-img", "rail-figure", "#plate-1"],
    ["#explore-img", "rail-figure", "[data-rail-plate]"],
    ["#pane-img", "figure-pane", ".figure-pane"],
    ["#inline-img", "element", ".illu-inline"],
    ["#p1-bold", "paragraph", "#p1"],
    ["#bp2", "paragraph", "#bp2"],
    ["#sub-h", "heading", "#sub-h"],
    ["#s1 > h2.T", "heading", "#s1 > h2.T"],
    ["#box-title", "heading", "#box-title"],
    ["#part-1-title", "rail-part", "#part-1"],
    ["#part-2-text", "rail-part", "#part-2"],
    ["#box-nav", "box", "#box-uuid"],
    ["#ref-12-text", "references", "#ref-12"],
    ["#toc-row-text", "toc", ".otoc__section"],
    ["#cover-art", "opener", "[data-chapter-opener]"],
    ["#s1", "element", "#s1"],
  ];
  it.each(cases)("%s → %s", (hit, kind, el) => {
    const t = pickTarget(stackAt(hit));
    expect(t.kind).toBe(kind);
    expect(t.el).toBe($(el));
    expect(ANCHOR_KINDS).toContain(t.kind);
  });

  it("skips the review widget's own elements", () => {
    expect(pickTarget([$("#review-overlay")])).toBeNull();
  });

  it("takes the empty pane by geometry when the pane takes no pointer events", () => {
    const pane = $(".figure-pane");
    const t = pickTarget(stackAt("main#text"), { paneHit: () => true, pane });
    expect(t).toEqual({ el: pane, kind: "figure-pane" });
  });
});

describe("closestAcross: a floating stage leads back to its slot", () => {
  it("finds the section a floating box sits in", () => {
    expect(closestAcross($("#bp2"), "section.reader-section")).toBe($("#s1"));
    expect(closestAcross($("#upload-frame"), "[data-widget-breakout]")).toBe(
      $("aside.wb")
    );
  });
});

describe("anchorFor", () => {
  const anchor = (sel, point) =>
    anchorFor(pickTarget(stackAt(sel)), point, ctx);

  it("a paragraph: ids, excerpt, page state and its ordinal", () => {
    const a = anchor("#p1-bold", { clientX: 25, clientY: 50 });
    expect(a).toMatchObject({
      v: 1,
      kind: "paragraph",
      label: "¶ 1 in “Where is my mind?”",
      paragraphId: "11111111-0000-4000-8000-000000000002",
      sectionSlug: "where-is-my-mind",
      textExcerpt: "First paragraph about ventricles.",
      point: { x: 0.25, y: 0.5 },
      scrollY: 4200,
      layout: "two-column",
      viewport: { w: 1440, h: 900, dpr: 2 },
      paneFigureKey: "animationfoundationsfig6",
    });
    expect(a.selector).toBe("#p1");
  });

  it("a paragraph under a subsection is counted from that heading", () => {
    const a = anchor("#p4");
    expect(a.label).toBe("¶ 2 in “Synaptic architecture”");
    expect(a.subsectionId).toBe("synaptic-architecture");
  });

  it("a subsection heading", () => {
    const a = anchor("#sub-h");
    expect(a.kind).toBe("heading");
    expect(a.label).toBe("Subsection heading “Synaptic architecture”");
    expect(a.subsectionId).toBe("synaptic-architecture");
  });

  it("the pane: the record's key, number and title, and its paragraph", () => {
    const a = anchor("#pane-img", { clientX: 62, clientY: 40 });
    expect(a).toMatchObject({
      kind: "figure-pane",
      figureKey: "animationFoundationsFig6",
      figureNumber: "8",
      figureTitle: "The cell doctrine (ventricular theory)",
      paragraphId: "11111111-0000-4000-8000-000000000002",
      sectionSlug: "where-is-my-mind",
      label:
        "Fig 08 · The cell doctrine (ventricular theory), at 62% across, 40% down",
    });
  });

  it("the pane falls back to its own label when there is no record", () => {
    const a = anchorFor(pickTarget(stackAt("#pane-img")), {}, { page: PAGE });
    expect(a.figureNumber).toBe("08");
    expect(a.figureTitle).toBe("Dom title");
  });

  it("a plate that is a figure of its own, on a floating box's track", () => {
    const a = anchor("#plate-1-img");
    expect(a).toMatchObject({
      kind: "rail-figure",
      figureKey: "animationFoundationsFigA",
      figureNumber: "E",
      figureTitle: "Piece of the skull",
      plateIndex: 1,
      railPart: { index: 1, count: 2 },
      boxSlug: "box-descartes",
      sectionSlug: "where-is-my-mind",
      paragraphId: "33333333-0000-4000-8000-000000000002",
      label: "Fig E · Piece of the skull in “Separating mind from body”",
    });
  });

  it("an Explore part's unnumbered picture is named by its part", () => {
    const a = anchor("#explore-img");
    expect(a.label).toBe(
      "Picture for “Hippocrates’ view” in “Separating mind from body”"
    );
    expect(a.railPart).toEqual({
      index: 0,
      count: 2,
      title: "Hippocrates’ view",
    });
  });

  it("a rail part", () => {
    expect(anchor("#part-1-title").label).toBe(
      "Part 1 of 2 · Hippocrates’ view in “Separating mind from body”"
    );
  });

  it("a paragraph in a box is counted in the box", () => {
    expect(anchor("#bp2").label).toBe(
      "¶ 2 in “Separating mind from body”, part 2 of 2"
    );
  });

  it("an upload's iframe: the frame, its widget and where on it", () => {
    const a = anchor("#upload-frame", { clientX: 62, clientY: 40 });
    expect(a).toMatchObject({
      kind: "widget",
      widgetId: "upload:history-penfield-binder",
      timelineId: "22222222-0000-4000-8000-000000000001",
      sectionSlug: "where-is-my-mind",
      point: { x: 0.62, y: 0.4 },
      label:
        "Find out what it was like to be Dr. Wilder Penfield widget, at 62% across, 40% down",
    });
    expect(a.selector).toBe("#upload-frame");
  });

  it("an inline figure carries its figure", () => {
    const a = anchor("#inline-img");
    expect(a).toMatchObject({
      kind: "element",
      figureKey: "animationFoundationsFig6",
      figureNumber: "8",
    });
    expect(a.label).toMatch(/^Fig 08 · The cell doctrine .*\(in the text\)/);
  });

  it("the references, the contents, the cover, the chrome", () => {
    expect(anchor("#ref-12-text").label).toBe(
      "Reference 12 · Finger, S. Origins of Neuroscience."
    );
    expect(anchor("#toc-row-text").label).toBe(
      "Contents · 1. Where is my mind?"
    );
    expect(anchor("#cover-art").kind).toBe("opener");
    expect(anchor("#ctl-bars", { clientX: 35, clientY: 50 }).label).toBe(
      "Chapter timeline, at 35% across"
    );
  });
});

describe("the way back", () => {
  const roundTrip = [
    ["#p1-bold", "#p1"],
    ["#p4", "#p4"],
    ["#sub-h", "#sub-h"],
    ["#s1 > h2.T", "#s1 > h2.T"],
    ["#box-title", "#box-title"],
    ["#plate-1-img", "#plate-1"],
    ["#explore-img", "#explore-pic [data-rail-plate]"],
    ["#part-2-text", "#part-2"],
    ["#pane-img", ".figure-pane"],
    ["#upload-frame", "#upload-frame"],
    ["#wb-foot", "#wb-stage"],
    ["#box-nav", "#box-uuid"],
    ["#ref-12-text", "#ref-12"],
    ["#toc-row-text", ".otoc__section"],
    ["#inline-img", ".illu-inline"],
  ];
  it.each(roundTrip)("%s is found again as %s", (hit, sel) => {
    const a = anchorFor(pickTarget(stackAt(hit)), {}, ctx);
    // Through JSON, as the database stores it.
    const stored = JSON.parse(JSON.stringify(a));
    expect(findAnchorElement(stored, document)).toBe($(sel));
  });

  it("falls back to the selector when the ids find nothing", () => {
    expect(
      findAnchorElement({ kind: "element", selector: "#ctl-bars" }, document)
    ).toBe($("#ctl-bars"));
  });

  it("anchorHash: what readerJump lands on first", () => {
    const a = (sel) => anchorFor(pickTarget(stackAt(sel)), {}, ctx);
    expect(anchorHash(a("#p1"))).toBe("11111111-0000-4000-8000-000000000002");
    expect(anchorHash(a("#sub-h"))).toBe("synaptic-architecture");
    expect(anchorHash(a("#box-title"))).toBe("box-descartes");
    expect(anchorHash(a("#plate-1-img"))).toBe(
      "33333333-0000-4000-8000-000000000002"
    );
    expect(anchorHash(a("#upload-frame"))).toBe(
      "22222222-0000-4000-8000-000000000001"
    );
    expect(anchorHash(a("#ref-12-text"))).toBe("ref-12");
    expect(anchorHash(a("#toc-row-text"))).toBe("chapter-toc");
    expect(anchorHash(a("#cover-art"))).toBeNull();
    expect(anchorHash(null)).toBeNull();
  });

  it("sameAnchor: the same thing, wherever on it", () => {
    const a = anchorFor(pickTarget(stackAt("#plate-1-img")), {}, ctx);
    const again = anchorFor(
      pickTarget(stackAt("#plate-1-img")),
      { clientX: 90, clientY: 10 },
      { page: PAGE }
    );
    expect(sameAnchor(a, again)).toBe(true);
    const other = anchorFor(pickTarget(stackAt("#plate-0")), {}, ctx);
    expect(sameAnchor(a, other)).toBe(false);
    expect(
      sameAnchor(
        { kind: "figure-pane", figureKey: "AnimationX" },
        {
          kind: "figure-pane",
          figureKey: "animationx",
        }
      )
    ).toBe(true);
    expect(sameAnchor(a, null)).toBe(false);
  });
});

describe("targetAt", () => {
  it("is the pane when the point is on it and nothing covers it", () => {
    const pane = $(".figure-pane");
    box(pane, { left: 0, top: 64, width: 720, height: 800 });
    document.elementsFromPoint = () => stackAt("main#text");
    expect(targetAt(300, 400).kind).toBe("figure-pane");
    // A floating box over the pane wins.
    document.elementsFromPoint = () => stackAt("#box-nav");
    expect(targetAt(300, 400).kind).toBe("box");
    // Off the pane, the text.
    document.elementsFromPoint = () => stackAt("#p2");
    expect(targetAt(900, 400).kind).toBe("paragraph");
    delete document.elementsFromPoint;
  });
});

describe("small helpers", () => {
  it("pointIn clamps and rounds", () => {
    const r = { left: 100, top: 100, width: 200, height: 50 };
    expect(pointIn(r, 150, 125)).toEqual({ x: 0.25, y: 0.5 });
    expect(pointIn(r, 0, 999)).toEqual({ x: 0, y: 1 });
    expect(pointIn(null, 1, 1)).toEqual({ x: 0.5, y: 0.5 });
  });

  it("shorten cuts on a word", () => {
    expect(shorten("short")).toBe("short");
    expect(shorten("aaaa bbbb cccc dddd", 12)).toBe("aaaa bbbb…");
    // No word break late enough: a hard cut.
    expect(shorten("a".repeat(30), 10)).toBe(`${"a".repeat(9)}…`);
  });

  it("figureName pads numbers, keeps letters", () => {
    expect(figureName({ figureNumber: 7, figureTitle: "Galen" })).toBe(
      "Fig 07 · Galen"
    );
    expect(figureName({ figureNumber: "K" })).toBe("Fig K");
    expect(figureName({ figureTitle: "Untitled" })).toBe("Untitled");
  });

  it("selectorFor stops at the nearest id or paragraph", () => {
    expect(selectorFor($("#p1-bold"))).toBe("#p1-bold");
    const span = document.createElement("span");
    $("#p2").appendChild(span);
    expect(selectorFor(span)).toBe("#p2 > span");
  });
});
