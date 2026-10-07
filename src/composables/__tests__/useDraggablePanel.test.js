import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, ref } from "vue";
import { mount } from "@vue/test-utils";
import { useDraggablePanel } from "@/composables/useDraggablePanel";

// 1000×800 window; the panel is 380×620 with a 16px margin.
function mountPanel(opts = {}) {
  let api;
  const wrapper = mount(
    defineComponent({
      setup() {
        const panel = ref(null);
        const handle = ref(null);
        api = useDraggablePanel(panel, handle, {
          storageKey: "test.panelPos",
          width: 380,
          height: 620,
          margin: 16,
          ...opts,
        });
        return () => h("div", { ref: panel }, [h("span", { ref: handle })]);
      },
    })
  );
  return { wrapper, api };
}

beforeEach(() => {
  vi.stubGlobal("innerWidth", 1000);
  vi.stubGlobal("innerHeight", 800);
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe("useDraggablePanel", () => {
  it("starts bottom-right, 24px in from the edges", () => {
    const { api, wrapper } = mountPanel();
    expect(api.x.value).toBe(1000 - 380 - 24);
    expect(api.y.value).toBe(800 - 620 - 24);
    wrapper.unmount();
  });

  // The reader's timeline dock (OPENBRAIN-128) takes the bottom 20px.
  it("keeps the default and the clamp above a bottom inset", () => {
    const { api, wrapper } = mountPanel({ bottomInset: () => 20 });
    expect(api.y.value).toBe(800 - 20 - 620 - 24);

    api.y.value = 400;
    window.dispatchEvent(new Event("resize"));
    expect(api.y.value).toBe(800 - 20 - 620 - 16);
    wrapper.unmount();
  });

  // The dock peeks to PEEK_H (104px) with its map button at the right end,
  // under the panel's default spot (review of #119): the panel keeps clear
  // of the peek and of the 64px top bar, shrinking to fit between them.
  it("shrinks to fit between a top and a bottom inset instead of covering either", () => {
    const { api, wrapper } = mountPanel({
      topInset: () => 64,
      bottomInset: () => 104,
    });
    const room = 800 - 64 - 104 - 2 * 16;
    expect(api.height.value).toBe(room);
    expect(api.y.value).toBe(64 + 16);
    expect(api.y.value + api.height.value).toBe(800 - 104 - 16);

    // Dragged onto the dock or under the bar, it comes back between them.
    api.y.value = 500;
    window.dispatchEvent(new Event("resize"));
    expect(api.y.value + api.height.value).toBeLessThanOrEqual(800 - 104);
    api.y.value = 0;
    window.dispatchEvent(new Event("resize"));
    expect(api.y.value).toBe(64 + 16);
    wrapper.unmount();
  });

  it("keeps its full height when there is room, and refits when an inset changes", () => {
    vi.stubGlobal("innerHeight", 1000);
    let dock = 0;
    const { api, wrapper } = mountPanel({
      topInset: () => 64,
      bottomInset: () => dock,
    });
    expect(api.height.value).toBe(620);
    expect(api.y.value).toBe(1000 - 620 - 24);

    dock = 104;
    api.refit();
    expect(api.height.value).toBe(620);
    expect(api.y.value + 620).toBe(1000 - 104 - 16);
    wrapper.unmount();
  });

  it("does not shrink below minHeight on a very short window", () => {
    vi.stubGlobal("innerHeight", 390);
    const { api, wrapper } = mountPanel({
      topInset: () => 64,
      bottomInset: () => 104,
      minHeight: 240,
    });
    expect(api.height.value).toBe(240);
    // Pinned under the top bar, so the drag handle stays reachable.
    expect(api.y.value).toBe(64 + 16);
    wrapper.unmount();
  });

  it("moves a saved position that now sits on the inset up off it", () => {
    localStorage.setItem("test.panelPos", JSON.stringify({ x: 40, y: 164 }));
    const { api, wrapper } = mountPanel({ bottomInset: () => 20 });
    expect(api.x.value).toBe(40);
    expect(api.y.value).toBe(800 - 20 - 620 - 16);
    wrapper.unmount();
  });
});
