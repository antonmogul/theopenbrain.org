import { describe, expect, it } from "vitest";
import {
  FIGMA_BY_TITLE,
  FIGMA_FILE,
  figmaNode,
  figmaUrlForTitle,
} from "../../.storybook/figma";

describe("Storybook → Figma links (OPENBRAIN-116)", () => {
  it("builds a node URL in the design system file", () => {
    expect(figmaNode("1:161")).toBe(`${FIGMA_FILE}?node-id=1-161`);
  });

  it("matches a story title exactly, or as a prefix of a deeper title", () => {
    expect(figmaUrlForTitle("Foundations/Button")).toBe(figmaNode("1-161"));
    expect(figmaUrlForTitle("Foundations/Button/Sub")).toBe(figmaNode("1-161"));
    expect(figmaUrlForTitle("Foundations/ButtonGroup")).toBeNull();
    expect(figmaUrlForTitle("Nope/Nothing")).toBeNull();
    expect(figmaUrlForTitle(undefined)).toBeNull();
  });

  it("keeps every node id in the Figma URL form", () => {
    for (const id of Object.values(FIGMA_BY_TITLE)) {
      expect(id).toMatch(/^\d+-\d+$/);
    }
  });
});
