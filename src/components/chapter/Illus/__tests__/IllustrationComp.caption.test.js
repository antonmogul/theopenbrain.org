import { describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { figurePresentation } from "@/helper/figurePresentation";

const playback = vi.hoisted(() => ({
  addEventListener: vi.fn(),
  setSubframe: vi.fn(),
  play: vi.fn(),
  pause: vi.fn(),
  destroy: vi.fn(),
}));
vi.mock("@/composables/useLottie", () => ({
  loadLottie: async () => ({ loadAnimation: () => playback }),
}));
import IllustrationComp from "../IllustrationComp.vue";

const dragon = { id: "animationDragon", title: "Dragon", loop: true };

describe("historical figure presentation", () => {
  it("keeps other figure metadata and any authored caption", () => {
    expect(
      figurePresentation({ id: "other", title: "Eye", caption: "Caption" })
    ).toMatchObject({ title: "Eye", caption: "Caption" });
    expect(
      figurePresentation({ ...dragon, caption: "Updated caption" }).caption
    ).toBe("Updated caption");
  });

  it.each([null, "animationDragon--inline"])(
    "shows one caption below the art without a Dragon heading (scope %s)",
    async (scopeId) => {
      const wrapper = mount(IllustrationComp, {
        attachTo: document.body,
        props: { animation: dragon, scopeId },
      });
      await flushPromises();
      expect(wrapper.findAll("figcaption")).toHaveLength(1);
      expect(wrapper.find("figcaption").text()).toBe(
        figurePresentation(dragon).caption
      );
      expect(wrapper.text()).not.toContain("Dragon");
      expect(wrapper.find("figure").attributes("aria-label")).toBe(
        "Johann Zahn’s radiating eye illustration"
      );
      expect(wrapper.find("figure").element.lastElementChild.tagName).toBe(
        "FIGCAPTION"
      );
      expect(wrapper.find(`#${scopeId || dragon.id}`).exists()).toBe(true);
      expect(playback.play).toHaveBeenCalled();
      await wrapper.find(".icon").trigger("click");
      expect(playback.pause).toHaveBeenCalled();
      wrapper.unmount();
    }
  );
});
