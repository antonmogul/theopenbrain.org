import { afterEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import IllustrationPlaceholder from "../IllustrationPlaceholder.vue";

let wrapper;
afterEach(() => {
  wrapper?.unmount();
  vi.useRealTimers();
});
const animation = {
  figureNumber: 19,
  title: "Galvani",
  caption: "Overall legend",
  images: [
    { src: "/one.jpg", caption: "Friction machine — Galvani, 1791" },
    { src: "/two.jpg", caption: "Atmospheric electricity — Galvani, 1791" },
  ],
};
const mountFigure = () =>
  (wrapper = mount(IllustrationPlaceholder, {
    props: { animation },
    global: {
      stubs: {
        DemoModal: {
          props: ["show"],
          template: '<div v-if="show" data-modal><slot /></div>',
        },
      },
    },
  }));

describe("figure shell selected legend", () => {
  it("updates the top legend automatically, manually, backwards and from the modal", async () => {
    vi.useFakeTimers();
    const w = mountFigure();
    expect(w.find(".fig-legend").text()).toContain("Friction machine");
    expect(w.find(".figimg-legend").exists()).toBe(false);
    vi.advanceTimersByTime(15_000);
    await nextTick();
    expect(w.find(".fig-legend").text()).toContain("Atmospheric electricity");
    await w.find('[aria-label="Previous image"]').trigger("click");
    expect(w.find(".fig-legend").text()).toContain("Friction machine");
    await w.find('[aria-label="Next image"]').trigger("click");
    await w.find('[aria-label="Expand to full screen"]').trigger("click");
    const modal = w.find("[data-modal]");
    expect(modal.find(".figimg-legend").text()).toContain(
      "Atmospheric electricity"
    );
    await modal.find('[aria-label="Next image"]').trigger("click");
    expect(modal.find(".figimg-legend").text()).toContain("Friction machine");
    expect(w.find(".fig-legend").text()).toContain("Friction machine");
    expect(w.find(".figimg--gallery").attributes("data-autoplay")).toBe(
      "paused"
    );
  });
});
