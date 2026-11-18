import { describe, it, expect, afterEach } from "vitest";
import {
  extractChapterSpeech,
  speechChunks,
  speechStartIndex,
} from "../chapterListen";

const chapter = (html) => {
  document.body.innerHTML = `<main id="text">${html}</main>`;
  return document.getElementById("text");
};
afterEach(() => {
  document.body.innerHTML = "";
});
describe("chapter speech extraction", () => {
  it("reads section headings and prose in order, without legends, citations, references or UI", () => {
    const root =
      chapter(`<h1>Introduction</h1><div data-paragraph-id="p1"><p>The <mark>brain</mark><sup><a href="#ref">1,2</a></sup> learns.</p></div>
      <figure><h1>Figure title</h1><p data-paragraph-id="legend">A legend</p></figure>
      <h2 class="TN">1</h2><h2 class="subChapter">Neurons</h2><h3 class="subT">Signals</h3>
      <div data-paragraph-id="p2">A<br>signal <button>Open</button><span aria-hidden="true">icon</span><sup>n</sup>.</div>
      <nav><p data-paragraph-id="ui">UI text</p></nav><div data-reader-end><h1>References</h1><div data-paragraph-id="ref">Citation entry</div></div>`);
    const before = root.innerHTML;
    expect(extractChapterSpeech(root).map((e) => e.text)).toEqual([
      "Introduction",
      "The brain learns.",
      "Neurons",
      "Signals",
      "A signal n.",
    ]);
    expect(root.innerHTML).toBe(before);
    expect(extractChapterSpeech(root)[1].element.dataset.paragraphId).toBe(
      "p1"
    );
  });
  it("reads a desktop teleported box at its prose slot, never the stage-layer order", () => {
    const root = chapter(
      `<div data-paragraph-id="before">Before.</div><div data-listen-box-slot="box"></div><div data-paragraph-id="after">After.</div>`
    );
    document.body.insertAdjacentHTML(
      "beforeend",
      `<div id="reader-stage-layer"><div data-breakout-box="box"><aside class="bx"><h2 class="bx-title">An aside</h2><div data-paragraph-id="box-p">Box text.</div></aside></div></div>`
    );
    expect(extractChapterSpeech(root).map((e) => e.text)).toEqual([
      "Before.",
      "An aside",
      "Box text.",
      "After.",
    ]);
    expect(
      extractChapterSpeech(root, { includeBoxes: false }).map((e) => e.text)
    ).toEqual(["Before.", "After."]);
  });
  it("includes mobile boxes once and can skip them", () => {
    const root = chapter(
      `<div data-listen-box-slot="box"><div data-breakout-box="box"><h2 class="bx-title">Box</h2><div data-paragraph-id="p">Text</div></div></div>`
    );
    expect(extractChapterSpeech(root)).toHaveLength(2);
    expect(extractChapterSpeech(root, { includeBoxes: false })).toEqual([]);
    expect(extractChapterSpeech(null)).toEqual([]);
  });
  it("chooses the passage crossing the reading line, the next in a gap, or last at the end", () => {
    const rects = [
      { top: 0, bottom: 100 },
      { top: 200, bottom: 500 },
      { top: 700, bottom: 900 },
    ];
    expect(speechStartIndex(rects, 400)).toBe(1);
    expect(speechStartIndex(rects, 600)).toBe(2);
    expect(speechStartIndex(rects, 1000)).toBe(2);
    expect(speechStartIndex(rects, -100)).toBe(0);
  });
  it("bounds long sentences and preserves every word, decimal and abbreviation", () => {
    const text = `Dr. Smith measured 3.14 units. ${"Long prose ".repeat(100)}Ends!`;
    const chunks = speechChunks(text);
    expect(chunks.every((c) => c.length <= 220)).toBe(true);
    expect(chunks.join(" ")).toBe(text.trim());
    expect(speechChunks("x".repeat(600)).map((c) => c.length)).toEqual([
      220, 220, 160,
    ]);
  });
});
