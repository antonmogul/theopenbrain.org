import { afterEach, describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { measureChapterRange } from "../measuredChapterRange";
import PagedBreakoutPreview from "../PagedBreakoutPreview.vue";
import MeasuredScrubberPreview from "../MeasuredScrubberPreview.vue";
import pagingStory from "../__stories__/PagedBreakoutPreview.stories";
import scrubberStory from "../__stories__/MeasuredScrubberPreview.stories";
let wrapper;
afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});
function rootFixture() {
  const root = document.createElement("main");
  root.id = "source-range";
  root.getBoundingClientRect = () => ({ top: 200, bottom: 2200, width: 700 });
  const figure = document.createElement("figure");
  figure.dataset.previewFigure = "Figure 6";
  figure.getBoundingClientRect = () => ({ top: 800, bottom: 1200, width: 600 });
  root.appendChild(figure);
  document.body.appendChild(root);
  return { root, figure };
}
const viewport = { scrollY: 300, height: 800, maxScroll: 3000 };
it("loads both isolated stories with the existing source fixture and bundled artwork", () => {
  expect(pagingStory.args.pages).toHaveLength(3);
  const state = scrubberStory.render(scrubberStory.args).setup();
  expect(state.prose).toContain("Flourens");
  expect(state.caption).toContain("Lindner");
  expect(state.plate).toContain("fig06-01");
});

describe("measured preview geometry", () => {
  it("uses actual document geometry and midpoint entry/exit intervals", () => {
    const { root } = rootFixture();
    expect(measureChapterRange(root, viewport)).toEqual({
      start: 100,
      end: 2100,
      intervals: [{ label: "Figure 6", entry: 700, exit: 1100 }],
    });
  });
  it("rejects disconnected, missing, zero-width and nonfinite measurements", () => {
    const { root } = rootFixture();
    expect(measureChapterRange(null, viewport)).toBeNull();
    expect(measureChapterRange(root, { ...viewport, height: NaN })).toBeNull();
    root.getBoundingClientRect = () => ({ top: 200, bottom: 2200, width: 0 });
    expect(measureChapterRange(root, viewport)).toBeNull();
    root.remove();
    expect(measureChapterRange(root, viewport)).toBeNull();
  });
  it("clips to reachable scroll positions and skips invalid figure intervals", () => {
    const { root, figure } = rootFixture();
    figure.getBoundingClientRect = () => ({
      top: 800,
      bottom: 800,
      width: 600,
    });
    expect(measureChapterRange(root, { ...viewport, maxScroll: 900 })).toEqual({
      start: 100,
      end: 900,
      intervals: [],
    });
  });
});
describe("paging preview", () => {
  it("defaults to vertical and retains every source paragraph in order while toggling", async () => {
    wrapper = mount(PagedBreakoutPreview, { props: pagingStory.args });
    const before = wrapper.findAll(".preview-page").map((page) => page.text());
    expect(before).toHaveLength(3);
    expect(before.every(Boolean)).toBe(true);
    expect(wrapper.find(".page-track--paged").exists()).toBe(false);
    await wrapper.get("button").trigger("click");
    expect(wrapper.findAll(".preview-page").map((page) => page.text())).toEqual(
      before
    );
    await wrapper.get("button").trigger("click");
    expect(wrapper.find(".page-track--paged").exists()).toBe(false);
    expect(wrapper.findAll(".preview-page")).toHaveLength(3);
  });
  it("moves only its local horizontal scroller, with bounded previous/next controls", async () => {
    const windowScroll = vi.spyOn(window, "scrollTo");
    wrapper = mount(PagedBreakoutPreview, { props: pagingStory.args });
    await wrapper.get("button").trigger("click");
    const track = wrapper.get(".page-track").element;
    Object.defineProperty(track, "clientWidth", { value: 600 });
    track.scrollTo = vi.fn();
    await wrapper.findAll(".page-controls button")[1].trigger("click");
    expect(track.scrollTo).toHaveBeenCalledWith({
      left: 600,
      behavior: "auto",
    });
    expect(windowScroll).not.toHaveBeenCalled();
  });
});
describe("scrubber preview lifecycle", () => {
  it("is inactive by default and rejects missing document geometry", async () => {
    const scroll = vi.spyOn(window, "scrollTo");
    wrapper = mount(MeasuredScrubberPreview, {
      props: { targetId: "missing" },
    });
    expect(wrapper.find("input").exists()).toBe(false);
    await wrapper.get("button").trigger("click");
    expect(wrapper.text()).toContain("No usable document measurements");
    expect(wrapper.find("input").exists()).toBe(false);
    expect(scroll).not.toHaveBeenCalled();
  });
  it("uses a native keyboard/pointer range and disables on navigation and unmount", async () => {
    rootFixture();
    vi.spyOn(document.documentElement, "scrollHeight", "get").mockReturnValue(
      4000
    );
    const scroll = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    const remove = vi.spyOn(window, "removeEventListener");
    wrapper = mount(MeasuredScrubberPreview, {
      props: { targetId: "source-range" },
    });
    await wrapper.get("button").trigger("click");
    const input = wrapper.get("input");
    expect(input.attributes("type")).toBe("range");
    expect(input.attributes("step")).toBe("1");
    input.element.value = "700";
    await input.trigger("input");
    expect(scroll).toHaveBeenCalledWith({ top: 700, behavior: "auto" });
    window.dispatchEvent(new PopStateEvent("popstate"));
    await flushPromises();
    expect(wrapper.find("input").exists()).toBe(false);
    await wrapper.get("button").trigger("click");
    wrapper.unmount();
    expect(remove.mock.calls.some(([event]) => event === "scroll")).toBe(true);
    expect(remove.mock.calls.some(([event]) => event === "popstate")).toBe(
      true
    );
  });
  it("cleans up repeated opt-in/out and deactivates if its document target changes", async () => {
    rootFixture();
    vi.spyOn(document.documentElement, "scrollHeight", "get").mockReturnValue(
      4000
    );
    wrapper = mount(MeasuredScrubberPreview, {
      props: { targetId: "source-range" },
    });
    for (let i = 0; i < 3; i++) {
      await wrapper.get("button").trigger("click");
      expect(wrapper.find("input").exists()).toBe(true);
      await wrapper.get("button").trigger("click");
      expect(wrapper.find("input").exists()).toBe(false);
    }
    await wrapper.get("button").trigger("click");
    await wrapper.setProps({ targetId: "different-chapter" });
    expect(wrapper.find("input").exists()).toBe(false);
    expect(wrapper.get("button").attributes("aria-pressed")).toBe("false");
  });

  it("rechecks geometry before seeking and never acts on a removed target", async () => {
    const { root } = rootFixture();
    vi.spyOn(document.documentElement, "scrollHeight", "get").mockReturnValue(
      4000
    );
    const scroll = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    wrapper = mount(MeasuredScrubberPreview, {
      props: { targetId: "source-range" },
    });
    await wrapper.get("button").trigger("click");
    const input = wrapper.get("input");
    root.remove();
    input.element.value = "700";
    await input.trigger("input");
    expect(scroll).not.toHaveBeenCalled();
  });
});
