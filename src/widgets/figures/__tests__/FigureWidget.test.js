import { afterEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";

// Stable entries, as the real registry returns the same object each time.
vi.mock("../registry.js", () => {
  const broken = {
    schema: {
      animationKey: "animationBroken",
      fields: [],
      defaults: {},
      lottieVersion: "v9",
    },
    load: () => Promise.reject(new Error("chunk gone")),
  };
  const fine = {
    schema: {
      animationKey: "animationFine",
      fields: [],
      defaults: {},
      lottieVersion: "v9",
    },
    load: () =>
      Promise.resolve({
        props: ["lottieUrl", "content", "schema"],
        template: '<p class="fine">{{ lottieUrl }}</p>',
      }),
  };
  return {
    figureWidgetFor: (key) =>
      key === "animationBroken"
        ? broken
        : key === "animationFine"
          ? fine
          : null,
  };
});

import FigureWidget from "../FigureWidget.vue";

afterEach(() => vi.restoreAllMocks());

describe("FigureWidget", () => {
  it("gives the widget its Lottie with the artwork version", async () => {
    const w = mount(FigureWidget, {
      props: { record: { id: "animationFine" } },
    });
    await flushPromises();
    expect(w.get(".fine").text()).toBe(
      "/publicAssets/animations/animationFine.json?v=v9"
    );
  });

  it("says the figure didn't load, and offers a reload, when its code fails", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const w = mount(FigureWidget, {
      props: { record: { id: "animationBroken" } },
    });
    await flushPromises();
    await flushPromises();
    expect(w.get("[role=alert]").text()).toContain("didn't load");
    expect(w.get("[role=alert] button").text()).toBe("Reload the page");
    expect(error.mock.calls.some((c) => /animationBroken/.test(c[0]))).toBe(
      true
    );
  });

  it("doesn't remount when the record is swapped for a fresher copy", async () => {
    const w = mount(FigureWidget, {
      props: { record: { id: "animationFine" } },
    });
    await flushPromises();
    const first = w.get(".fine").element;
    await w.setProps({ record: { id: "animationFine", title: "From the DB" } });
    await flushPromises();
    expect(w.get(".fine").element).toBe(first);
  });

  it("renders nothing for a figure that isn't a widget", () => {
    const w = mount(FigureWidget, { props: { record: { id: "other" } } });
    expect(w.html()).toBe("<!--v-if-->");
  });
});
