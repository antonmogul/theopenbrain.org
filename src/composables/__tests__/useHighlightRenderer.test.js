import { describe, expect, it } from "vitest";
import { ref } from "vue";
import { useHighlightRenderer } from "../useHighlightRenderer.js";

// Stuart, 24 Sep: "highlighting text changes spacing of letters". A highlight
// crossing a link or a citation becomes several <mark>s, so any padding on
// them pushed the words that follow (OPENBRAIN-90).
describe("useHighlightRenderer marks", () => {
  function render(html, highlight) {
    document.body.innerHTML = `<p data-paragraph-id="p1">${html}</p>`;
    const byParagraph = ref({ p1: [highlight] });
    useHighlightRenderer(byParagraph).renderAllHighlights();
    return [...document.querySelectorAll("mark[data-hl-id]")];
  }

  it("wraps the highlighted text without adding space around it", () => {
    const marks = render("Light <a href='#'>hits</a> the retina.", {
      id: "h1",
      start_offset: 0,
      end_offset: 14,
      color: "yellow",
    });
    expect(marks.length).toBeGreaterThan(1); // split across the link
    for (const m of marks) {
      expect(m.style.padding).toBe("");
      expect(m.style.paddingLeft).toBe("");
      expect(m.style.paddingRight).toBe("");
      expect(m.style.margin).toBe("");
    }
    expect(document.querySelector("p").textContent).toBe(
      "Light hits the retina."
    );
  });
});
