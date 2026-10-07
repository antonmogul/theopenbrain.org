import { describe, expect, it, vi } from "vitest";
import { defineComponent, h, provide, ref } from "vue";
import { mount } from "@vue/test-utils";

const narrow = ref(false);
vi.mock("@/composables/useMediaQuery", () => ({ useMediaQuery: () => narrow }));

import {
  FULL_BLEED_FLOATING,
  firstFigureBlocks,
  useInlineFigures,
} from "../useInlineFigures.js";

// Figures render inline on phones, and inside a floating breakout box, which
// covers the figure pane (OPENBRAIN-91).
describe("useInlineFigures", () => {
  function run(floating) {
    let result;
    const Child = defineComponent({
      setup() {
        result = useInlineFigures();
        return () => null;
      },
    });
    const Parent = defineComponent({
      setup() {
        if (floating) provide(FULL_BLEED_FLOATING, floating);
        return () => h(Child);
      },
    });
    mount(Parent);
    return result;
  }

  it("is inline below the two-column breakpoint", () => {
    narrow.value = true;
    expect(run(null).value).toBe(true);
  });

  it("uses the pane on wide screens outside a box", () => {
    narrow.value = false;
    expect(run(null).value).toBe(false);
    expect(run(ref(false)).value).toBe(false);
  });

  it("is inline inside a floating box on wide screens", () => {
    narrow.value = false;
    const floating = ref(true);
    const r = run(floating);
    expect(r.value).toBe(true);
    floating.value = false;
    expect(r.value).toBe(false);
  });
});

// A figure several paragraphs trigger (states of one Lottie) is drawn once
// inline, at its first block in reading order (OPENBRAIN-99).
describe("firstFigureBlocks", () => {
  const fig = (id) => ({ animation: { id } });
  const p1 = { id: "p1", ...fig("cells") };
  const p2 = { id: "p2", ...fig("cells") };
  const sub = { id: "s1", ...fig("circuits") };
  const p3 = { id: "p3", ...fig("circuits") };
  const wrapper = { ...fig("eye") }; // a wrapper without an id still counts
  const tree = {
    intro: [{ id: "i", paragraphs: [] }],
    sections: [
      { id: "a", paragraphs: [p1, { id: "x", subSection: [wrapper] }, p2] },
      { id: "b", paragraphs: [{ id: "y", subSection: [sub, p3] }] },
    ],
  };

  it("maps each figure to the first block that shows it", () => {
    const first = firstFigureBlocks(tree);
    expect(first.get("cells")).toBe(p1);
    expect(first.get("circuits")).toBe(sub);
    expect(first.get("eye")).toBe(wrapper);
    expect(first.size).toBe(3);
  });

  it("copes with an empty chapter", () => {
    expect(firstFigureBlocks(null).size).toBe(0);
  });
});
