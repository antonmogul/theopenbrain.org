import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, inject } from "vue";
import { mount } from "@vue/test-utils";
import { useFigureTint } from "../useFigureTint";
import { FIGURE_TINT } from "@/helper/figureTint";

let wrapper;
let span;
let frames;
let seen;

const Child = defineComponent({
  setup() {
    seen = inject(FIGURE_TINT, null);
    return () => h("img", { "data-figure-wash": "" });
  },
});
const Pane = defineComponent({
  setup() {
    let el = null;
    const tint = useFigureTint({ pane: () => el, span: () => span });
    return () =>
      h("div", { ref: (node) => (el = node), onClick: tint.schedule }, [
        h(Child),
        h("div", { class: "fade-leave-active" }, [
          h("img", { "data-figure-wash": "", id: "leaving" }),
        ]),
      ]);
  },
});
const scrollTo = (y) => {
  Object.defineProperty(window, "scrollY", { value: y, configurable: true });
  window.dispatchEvent(new Event("scroll"));
};
const flush = () => frames.splice(0).forEach((fn) => fn());
const wash = () => wrapper.find("img:not(#leaving)").element.style.opacity;

describe("useFigureTint", () => {
  beforeEach(() => {
    frames = [];
    span = { start: 1000, end: 2000 };
    vi.stubGlobal("requestAnimationFrame", (fn) => frames.push(fn));
    vi.stubGlobal("cancelAnimationFrame", () => {});
    Object.defineProperty(window, "innerHeight", {
      value: 900,
      configurable: true,
    });
    wrapper = mount(Pane, { attachTo: document.body });
  });
  afterEach(() => {
    wrapper.unmount();
    vi.unstubAllGlobals();
  });

  it("scrubs the washed copies with the scroll, one frame per burst", () => {
    scrollTo(1100);
    scrollTo(1250);
    expect(frames).toHaveLength(1);
    flush();
    expect(Number(wash())).toBeCloseTo(0.5);
    scrollTo(1600);
    flush();
    expect(wash()).toBe("0");
    scrollTo(900);
    flush();
    expect(wash()).toBe("1");
  });

  it("gives a mounting copy the opacity of the moment", () => {
    scrollTo(1250);
    expect(seen.current()).toBeCloseTo(0.5);
    span = null;
    expect(seen.current()).toBe(0);
  });

  it("leaves a figure on its way out, and everything when no wash is on", () => {
    scrollTo(1250);
    flush();
    expect(wrapper.find("#leaving").element.style.opacity).toBe("");
    span = null;
    scrollTo(1900);
    flush();
    expect(Number(wash())).toBeCloseTo(0.5);
  });

  it("stops listening when the pane goes", () => {
    wrapper.unmount();
    scrollTo(1300);
    expect(frames).toHaveLength(0);
    wrapper = mount(Pane, { attachTo: document.body });
  });
});
