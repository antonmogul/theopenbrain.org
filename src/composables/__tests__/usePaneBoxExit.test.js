import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, ref } from "vue";
import { mount } from "@vue/test-utils";
import { usePaneBoxExit } from "../usePaneBoxExit";

const state = vi.hoisted(() => ({ reduced: false, locked: false }));
vi.mock("@/helper/readerJump", () => ({
  reducedMotionPreferred: () => state.reduced,
}));
vi.mock("@/helper/videoFullscreen", () => ({
  videoFullscreenHeld: () => state.locked,
}));
let wrapper;
afterEach(() => {
  wrapper?.unmount();
  vi.unstubAllGlobals();
  state.reduced = state.locked = false;
});

function scene() {
  let frames = [];
  vi.stubGlobal("requestAnimationFrame", (fn) => frames.push(fn));
  vi.stubGlobal("cancelAnimationFrame", () => {});
  wrapper = mount(
    defineComponent({
      setup() {
        const pane = ref(null);
        usePaneBoxExit(pane);
        return () =>
          h("div", { class: "chapter-reader" }, [
            h("div", { ref: pane, class: "figure-pane" }, [h("img")]),
            h("div", { "data-pane-box-exit": "" }),
          ]);
      },
    }),
    { attachTo: document.body }
  );
  const pane = wrapper.get(".figure-pane").element;
  pane.getBoundingClientRect = () => ({ top: 48, bottom: 980, height: 932 });
  const slot = wrapper.get("[data-pane-box-exit]").element;
  let top = 1100;
  slot.getBoundingClientRect = () => ({ top, bottom: top + 3000 });
  const move = (y) => {
    top = y;
    window.dispatchEvent(new Event("scroll"));
    const batch = frames;
    frames = [];
    batch.forEach((fn) => fn());
  };
  return { pane, move };
}

describe("pane departure at a rail box", () => {
  it("moves one pixel with the page and retraces the same position in reverse", () => {
    const { pane, move } = scene();
    move(1100);
    expect(pane.style.getPropertyValue("--pane-box-y")).toBe("0px");
    move(700);
    expect(pane.style.getPropertyValue("--pane-box-y")).toBe("-280px");
    move(500);
    expect(pane.style.getPropertyValue("--pane-box-y")).toBe("-480px");
    move(48);
    expect(pane.style.getPropertyValue("--pane-box-y")).toBe("-932px");
    move(700);
    expect(pane.style.getPropertyValue("--pane-box-y")).toBe("-280px");
    move(-3000);
    expect(pane.style.getPropertyValue("--pane-box-y")).toBe("0px");
  });
  it("cuts without translating under reduced motion and freezes during fullscreen", () => {
    const { pane, move } = scene();
    state.reduced = true;
    move(700);
    expect(pane.hasAttribute("data-box-cut")).toBe(true);
    expect(pane.style.getPropertyValue("--pane-box-y")).toBe("0px");
    state.locked = true;
    move(1100);
    expect(pane.hasAttribute("data-box-cut")).toBe(true);
    state.locked = false;
    move(1100);
    expect(pane.hasAttribute("data-box-cut")).toBe(false);
  });
});
