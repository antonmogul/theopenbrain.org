import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { nextTick } from "vue";
import ChapterTimeline from "@/components/chapter/timeline/ChapterTimeline.vue";
import { stubBarsWidth, testModel } from "./timelineTestModel";

// The map's chunk: missing (a deploy replaced it, or the reader is offline)
// until `fail` is cleared. Its own file, so the dock's async map hasn't
// already loaded it for another test.
const chunk = vi.hoisted(() => ({ fail: true }));
vi.mock(
  "@/components/chapter/timeline/TimelineMap.vue",
  async (importOriginal) => {
    if (chunk.fail)
      throw new TypeError("Failed to fetch dynamically imported module");
    return importOriginal();
  }
);
vi.mock("@/widgets/thumbnails", () => ({ widgetThumb: () => null }));

let restoreWidth;
let wrapper;

const isOpen = () =>
  wrapper.get('[data-testid="chapter-timeline"]').classes().includes("is-open");
const mapButton = () => wrapper.get('button[aria-label="Open chapter map"]');
const dialog = () => document.querySelector('[role="dialog"]');

/** A tap on touch: opens the peek at rest. */
async function tap(el) {
  await el.trigger("pointerdown", { pointerType: "touch", clientX: 4 });
  await el.trigger("click", { clientX: 4 });
}

beforeEach(() => {
  restoreWidth = stubBarsWidth(800);
  chunk.fail = true;
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  restoreWidth();
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

describe("ChapterTimeline — the map's code fails to load", () => {
  it("lets go of the map button and tries again on the next click", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    wrapper = mount(ChapterTimeline, {
      props: { model: testModel(), position: 2.5, readPercent: 42 },
      attachTo: document.body,
    });

    // On touch: the peek, then the map button.
    await tap(wrapper.get(".tl-bars"));
    expect(isOpen()).toBe(true);
    await mapButton().trigger("pointerdown", { pointerType: "touch" });
    await mapButton().trigger("click");
    expect(mapButton().attributes("aria-expanded")).toBe("true");

    await vi.waitFor(() => {
      if (mapButton().attributes("aria-expanded") !== "false")
        throw new Error("still waiting for the map");
    });
    expect(dialog()).toBeNull();
    expect(warn).toHaveBeenCalledWith(
      "[chapter timeline] the chapter map didn't load",
      expect.any(Error)
    );

    // Nothing is left waiting on the map: a tap outside folds the peek.
    await nextTick();
    document.body.dispatchEvent(
      new window.PointerEvent("pointerdown", { bubbles: true })
    );
    await nextTick();
    expect(isOpen()).toBe(false);

    // The chunk is back: the next click opens the map.
    chunk.fail = false;
    await tap(wrapper.get(".tl-bars"));
    await mapButton().trigger("click");
    await vi.waitFor(() => {
      if (!dialog()) throw new Error("no map yet");
    });
    await flushPromises();
    expect(mapButton().attributes("aria-expanded")).toBe("true");
    expect(dialog().textContent).toContain("Chapter map");
  });
});
