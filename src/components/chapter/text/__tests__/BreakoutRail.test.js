import { describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import BreakoutRail from "../BreakoutRail.vue";

const mountRail = () => {
  const w = mount(BreakoutRail, {
    props: {
      label: "Descartes",
      panels: [
        { id: "a", title: "Mind" },
        { id: "b", title: "Body" },
      ],
    },
    slots: {
      a: '<a href="https://plato.stanford.edu/entries/descartes/">Descartes</a>',
      b: "Second part",
    },
  });
  const track = w.find('[role="region"]');
  Object.defineProperty(track.element, "clientWidth", { value: 500 });
  track.element.scrollTo = vi.fn();
  return { w, track };
};
describe("BreakoutRail review prototype", () => {
  it("keeps the complete document available and provides bounded explicit navigation", async () => {
    const { w, track } = mountRail();
    expect(w.findAll("article")).toHaveLength(2);
    expect(w.findAll("[hidden], [aria-hidden=true]")).toHaveLength(0);
    expect(w.findAll("button")[1].attributes("disabled")).toBeDefined();
    await w.findAll("button")[2].trigger("click");
    expect(track.element.scrollTo).toHaveBeenLastCalledWith({
      left: 500,
      behavior: "auto",
    });
    track.element.scrollLeft = 500;
    await track.trigger("scroll");
    expect(w.find('[role="status"]').text()).toBe("2 of 2");
    expect(w.findAll("button")[2].attributes("disabled")).toBeDefined();
    await track.trigger("keydown", { key: "Home" });
    expect(track.element.scrollTo).toHaveBeenLastCalledWith({
      left: 0,
      behavior: "auto",
    });
  });
  it("handles region keys without stealing link keys or page wheel events", async () => {
    const { w, track } = mountRail();
    await w.find("a").trigger("keydown", { key: "ArrowRight" });
    expect(track.element.scrollTo).not.toHaveBeenCalled();
    await track.trigger("keydown", { key: "End" });
    expect(track.element.scrollTo).toHaveBeenLastCalledWith({
      left: 500,
      behavior: "auto",
    });
    const wheel = new Event("wheel", { cancelable: true });
    track.element.dispatchEvent(wheel);
    expect(wheel.defaultPrevented).toBe(false);
  });
  it("offers a vertical reading option without removing text", async () => {
    const { w, track } = mountRail();
    await w.find("button").trigger("click");
    expect(w.classes()).toContain("br--vertical");
    expect(w.find("button").attributes("aria-pressed")).toBe("true");
    expect(w.findAll("button")).toHaveLength(1);
    expect(track.attributes("tabindex")).toBeUndefined();
    expect(w.findAll("article")).toHaveLength(2);
  });
});
