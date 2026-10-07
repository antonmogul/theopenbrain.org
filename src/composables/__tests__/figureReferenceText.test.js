import { describe, expect, it } from "vitest";
import { transformParagraph } from "@/composables/chapterTransform.mjs";

describe("figure references after Stuart's 1 October review", () => {
  it.each([1, 6, "A", "K", null])(
    "renders %s as bold non-interactive prose",
    (number) => {
      const p = transformParagraph({
        id: "figure-reference",
        content: {
          blocks: [
            { type: "text", content: "See (" },
            { type: "figure_placeholder", number },
            { type: "text", content: ")." },
          ],
        },
      });
      const label = number === null ? "Figure" : `Figure ${number}`;
      expect(p.text).toBe(
        `See (<strong class="figure-ref">${label}</strong>).`
      );
      expect(p.text).not.toMatch(/role=|tabindex=|data-figure=|<a\b/);
    }
  );

  it("keeps bibliography citations separate and interactive", () => {
    const p = transformParagraph({
      id: "citation",
      content: { blocks: [{ type: "citation_ref", number: 42 }] },
    });
    expect(p.text).toContain('class="citation-ref" data-ref="42"');
  });

  it("separates consecutive bibliography numbers without merging their targets", () => {
    const p = transformParagraph({
      id: "multiple-citations",
      content: {
        blocks: [
          { type: "citation_ref", number: 2 },
          { type: "citation_ref", number: 3 },
          { type: "text", content: ". Elsewhere" },
          { type: "citation_ref", number: 8 },
        ],
      },
    });
    const el = document.createElement("div");
    el.innerHTML = p.text;
    expect(el.textContent).toBe("2,3. Elsewhere8");
    expect(
      [...el.querySelectorAll("sup")].map((sup) => sup.dataset.ref)
    ).toEqual(["2", "3", "8"]);
  });
});
