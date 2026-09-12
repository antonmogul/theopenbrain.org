import { describe, it, expect, vi, afterEach } from "vitest";
import { mount } from "@vue/test-utils";

/*
 * ChapterOpener publishes its measured height as --opener-h on <html> so the
 * text column can start below it, and refreshes ScrollTrigger so figure
 * triggers re-measure against the moved prose (OPENBRAIN-32). These tests
 * pin the lifecycle: set on mount, refreshed only when the height changes,
 * removed on unmount so the next route does not inherit a stale offset.
 */

// vi.mock factories are hoisted above imports, so the spy they reference
// must be hoisted too.
const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("gsap", () => ({ gsap: { registerPlugin: vi.fn() } }));
vi.mock("gsap/ScrollTrigger", () => ({ default: { refresh } }));
vi.mock("../OpenerHero.vue", () => ({
  default: { name: "OpenerHero", template: "<div class='hero-stub' />" },
}));
vi.mock("../OpenerToc.vue", () => ({
  default: { name: "OpenerToc", template: "<div class='toc-stub' />" },
}));

import ChapterOpener from "../ChapterOpener.vue";

const rootStyle = () => document.documentElement.style;

function mountWithHeight(height) {
  const wrapper = mount(ChapterOpener, {
    props: { module: { slug: "the-retina", title: "The Retina" }, text: null },
    attachTo: document.body,
  });
  // happy-dom has no layout: stub the measurement the component takes.
  wrapper.vm.$el.getBoundingClientRect = () => ({ height });
  return wrapper;
}

afterEach(() => {
  refresh.mockClear();
  rootStyle().removeProperty("--opener-h");
});

describe("ChapterOpener --opener-h lifecycle", () => {
  it("publishes its height on mount and refreshes ScrollTrigger", async () => {
    const wrapper = mountWithHeight(2791);
    window.dispatchEvent(new Event("resize"));
    expect(rootStyle().getPropertyValue("--opener-h")).toBe("2791px");
    expect(refresh).toHaveBeenCalled();
    wrapper.unmount();
  });

  it("does not refresh again when the height is unchanged", async () => {
    const wrapper = mountWithHeight(1200);
    window.dispatchEvent(new Event("resize"));
    const calls = refresh.mock.calls.length;
    window.dispatchEvent(new Event("resize"));
    window.dispatchEvent(new Event("resize"));
    expect(refresh.mock.calls.length).toBe(calls);
    wrapper.unmount();
  });

  it("removes the property on unmount so the next chapter starts clean", () => {
    const wrapper = mountWithHeight(1500);
    window.dispatchEvent(new Event("resize"));
    expect(rootStyle().getPropertyValue("--opener-h")).toBe("1500px");
    wrapper.unmount();
    expect(rootStyle().getPropertyValue("--opener-h")).toBe("");
  });
});
