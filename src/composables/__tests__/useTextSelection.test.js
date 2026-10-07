import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";
import { mount } from "@vue/test-utils";
import {
  createToolbarPosition,
  editToolbarPosition,
  useTextSelection,
} from "@/composables/useTextSelection";

// Placed above a highlight near the bottom of the window,
// the edit toolbar's top edge was guessed from the 40px pill (rect.top - 50),
// so the share row under the pill covered the passage. Above, the position
// is now the toolbar's bottom edge, and HighlightToolbar grows it upward by
// its real height (HighlightToolbar.placement.test.js).
const rect = (top, height = 24, left = 400, width = 200) => ({
  top,
  bottom: top + height,
  left,
  width,
  right: left + width,
  height,
});

beforeEach(() => {
  vi.stubGlobal("innerWidth", 1280);
  vi.stubGlobal("innerHeight", 800);
  vi.stubGlobal("scrollY", 1000);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("editToolbarPosition", () => {
  it("puts the toolbar under a highlight that has room below", () => {
    expect(editToolbarPosition(rect(300))).toEqual({
      x: 400 + 100 - 150,
      y: 300 + 24 + 8 + 1000,
      above: false,
    });
  });

  it("near the bottom, anchors the toolbar's bottom edge above the highlight", () => {
    const mark = rect(670);
    const pos = editToolbarPosition(mark);
    expect(pos.above).toBe(true);
    // Its bottom edge, in document px: everything it draws is above it.
    expect(pos.y).toBe(670 - 10 + 1000);
    expect(pos.y).toBeLessThan(mark.top + 1000);
  });

  it("stays under a tall highlight that has more room below than above", () => {
    const tall = { ...rect(100, 600), bottom: 700 };
    expect(editToolbarPosition(tall).above).toBe(false);
  });

  it("keeps the toolbar inside the window horizontally", () => {
    expect(editToolbarPosition(rect(300, 24, 1200, 60)).x).toBe(1280 - 310);
    expect(editToolbarPosition(rect(300, 24, 0, 40)).x).toBe(10);
  });
});

describe("createToolbarPosition", () => {
  it("sits above a fresh selection, anchored by its bottom edge", () => {
    expect(createToolbarPosition(rect(300))).toMatchObject({
      y: 300 - 10 + 1000,
      above: true,
    });
  });

  it("goes under a selection at the top of the window", () => {
    expect(createToolbarPosition(rect(40))).toMatchObject({
      y: 40 + 24 + 10 + 1000,
      above: false,
    });
  });
});

describe("useTextSelection highlight clicks", () => {
  it("opens the edit toolbar above a highlight near the bottom, by its bottom edge", () => {
    let api;
    const wrapper = mount(
      defineComponent({
        setup() {
          api = useTextSelection();
          return () => h("div");
        },
      }),
      { attachTo: document.body }
    );

    document.dispatchEvent(
      new CustomEvent("highlight-click", {
        detail: {
          id: "h1",
          color: "yellow",
          tags: [],
          paragraph_id: "p1",
          is_public: false,
          rect: rect(670),
        },
      })
    );

    expect(api.showToolbar.value).toBe(true);
    expect(api.toolbarMode.value).toBe("edit");
    expect(api.toolbarPosition.value).toMatchObject({
      y: 670 - 10 + 1000,
      above: true,
    });
    wrapper.unmount();
  });
});
