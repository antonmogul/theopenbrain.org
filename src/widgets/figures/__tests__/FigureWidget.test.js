import { afterEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";

vi.mock("../registry.js", () => ({
  figureWidgetFor: (key) =>
    key === "animationBroken"
      ? {
          schema: { fields: [], defaults: {}, lottieVersion: "v9" },
          load: () => Promise.reject(new Error("chunk gone")),
        }
      : key === "animationFine"
        ? {
            schema: { fields: [], defaults: {}, lottieVersion: "v9" },
            load: () =>
              Promise.resolve({
                props: ["lottieUrl", "content", "schema"],
                template: '<p class="fine">{{ lottieUrl }}</p>',
              }),
          }
        : null,
}));

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

  it("renders nothing for a figure that isn't a widget", () => {
    const w = mount(FigureWidget, { props: { record: { id: "other" } } });
    expect(w.html()).toBe("<!--v-if-->");
  });
});
