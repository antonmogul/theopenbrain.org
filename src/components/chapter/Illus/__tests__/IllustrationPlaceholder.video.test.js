import { afterEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import IllustrationPlaceholder from "../IllustrationPlaceholder.vue";

let wrapper;
afterEach(() => {
  wrapper?.unmount();
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});
const video = {
  src: "/huxley.webp",
  youtube: "KbA3RLz3xUQ",
  play: "player",
  posterPlay: "corner",
};
const mountVideo = (images = [video]) =>
  (wrapper = mount(IllustrationPlaceholder, {
    attachTo: document.body,
    props: { animation: { title: "Huxley", images } },
    global: { stubs: { Transition: true } },
  }));

describe("expanding a playing figure video", () => {
  it.each([[video], [video, { src: "/diagram.jpg" }]])(
    "expands the existing player without a second iframe or poster",
    async (...images) => {
      mountVideo(images);
      await wrapper.get(".ve-poster").trigger("click");
      const iframe = wrapper.get("iframe").element;
      const frame = wrapper.get(".ve-frame").element;
      frame.requestFullscreen = vi.fn().mockResolvedValue();
      await wrapper.get(".fig-fs-btn").trigger("click");
      await flushPromises();
      expect(frame.requestFullscreen).toHaveBeenCalledOnce();
      expect(document.querySelectorAll("iframe")).toHaveLength(1);
      expect(wrapper.get("iframe").element).toBe(iframe);
      expect(document.querySelector('[role="dialog"]')).toBeNull();
      expect(wrapper.find(".ve-poster").exists()).toBe(false);
      expect(iframe.allow).toContain("fullscreen");
      expect(iframe.hasAttribute("allowfullscreen")).toBe(true);
    }
  );

  it("still opens the gallery dialog before playback", async () => {
    mountVideo();
    await wrapper.get(".fig-fs-btn").trigger("click");
    await flushPromises();
    expect(document.querySelector('[role="dialog"] .ve-poster')).not.toBeNull();
  });

  it("keeps playback if a browser refuses native fullscreen", async () => {
    mountVideo();
    await wrapper.get(".ve-poster").trigger("click");
    const iframe = wrapper.get("iframe").element;
    wrapper.get(".ve-frame").element.requestFullscreen = vi
      .fn()
      .mockRejectedValue(new Error("Fullscreen denied"));
    vi.spyOn(console, "warn").mockImplementation(() => {});
    await wrapper.get(".fig-fs-btn").trigger("click");
    await flushPromises();
    expect(wrapper.get("iframe").element).toBe(iframe);
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });
});
