import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("@/stores", () => ({ useGeneral: () => ({ animationActive: true }) }));
import { addH, removeH } from "../general";
afterEach(() => {
  document.body.innerHTML = "";
});
describe("figure hover events during citation navigation", () => {
  it("ignores a pointer event outside the current figure's highlighting nodes", () => {
    const target = document.createElement("sup");
    target.className = "citation-ref";
    document.body.appendChild(target);
    expect(() => addH({ target })).not.toThrow();
    expect(() => removeH({ target })).not.toThrow();
  });
  it("still highlights matching prose and art in both directions, even if the prose is gone", () => {
    document.body.innerHTML =
      '<span id="optic">Optic nerve</span><svg><g class="opticHighlight highlighterIllu"><path /></g></svg>';
    const text = document.getElementById("optic");
    const group = document.querySelector("g");
    addH({ target: text });
    expect(group.classList.contains("highlightIllu")).toBe(true);
    expect(text.classList.contains("highlightText")).toBe(true);
    removeH({ target: document.querySelector("path") });
    expect(group.classList.contains("highlightIllu")).toBe(false);
    expect(text.classList.contains("highlightText")).toBe(false);
    text.remove();
    expect(() =>
      addH({ target: document.querySelector("path") })
    ).not.toThrow();
    expect(() =>
      removeH({ target: document.querySelector("path") })
    ).not.toThrow();
  });
});
