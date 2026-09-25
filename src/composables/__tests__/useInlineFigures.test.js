import { describe, expect, it, vi } from "vitest";
import { defineComponent, h, provide, ref } from "vue";
import { mount } from "@vue/test-utils";

const narrow = ref(false);
vi.mock("@/composables/useMediaQuery", () => ({ useMediaQuery: () => narrow }));

import { FULL_BLEED_FLOATING, useInlineFigures } from "../useInlineFigures.js";

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
