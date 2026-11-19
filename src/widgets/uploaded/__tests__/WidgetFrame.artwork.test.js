import { describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import WidgetFrame from "../WidgetFrame.vue";

describe("source-checked artwork framing", () => {
  it("maps a scaled iframe's artwork into page coordinates and ignores invalid geometry", async () => {
    const wrapper = mount(WidgetFrame, {
      props: { html: "<p>Figure</p>", waitForArtwork: true },
    });
    const frame = wrapper.get("iframe").element;
    Object.defineProperty(frame, "clientWidth", { value: 600 });
    vi.spyOn(frame, "getBoundingClientRect").mockReturnValue({
      x: 20,
      y: 40,
      width: 300,
      height: 400,
    });
    const send = (source, artwork) =>
      window.dispatchEvent(
        new MessageEvent("message", {
          source,
          data: { __ob: 1, type: "ready", artwork },
        })
      );
    const artwork = {
      x: 120,
      y: 60,
      width: 200,
      height: 300,
      viewBox: "0 0 1920 1920",
    };
    send(window, artwork);
    expect(wrapper.emitted("report")).toBeUndefined();
    send(frame.contentWindow, artwork);
    expect(wrapper.emitted("report").at(-1)[0].artwork).toEqual({
      x: 80,
      y: 70,
      width: 100,
      height: 150,
      viewBox: [0, 0, 1920, 1920],
    });
    send(frame.contentWindow, { ...artwork, width: Infinity });
    expect(wrapper.emitted("report").at(-1)[0].artwork.width).toBe(100);
    wrapper.unmount();
  });
});
