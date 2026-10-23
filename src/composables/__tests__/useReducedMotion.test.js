import { afterEach, describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { useReducedMotion } from "../useReducedMotion";

afterEach(() => {
  document.documentElement.removeAttribute("data-reduce-motion");
  vi.restoreAllMocks();
});
describe("reader motion preference", () => {
  it("uses the explicit reader override ahead of the OS, follows both live and releases listeners", async () => {
    const media = {
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    vi.spyOn(window, "matchMedia").mockReturnValue(media);
    let reduced;
    const w = mount({
      setup() {
        reduced = useReducedMotion();
        return () => null;
      },
    });
    expect(reduced.value).toBe(true);
    document.documentElement.setAttribute("data-reduce-motion", "0");
    await new Promise((r) => setTimeout(r, 10));
    await flushPromises();
    expect(reduced.value).toBe(false);
    document.documentElement.removeAttribute("data-reduce-motion");
    await new Promise((r) => setTimeout(r, 10));
    expect(reduced.value).toBe(true);
    media.matches = false;
    media.addEventListener.mock.calls[0][1]();
    expect(reduced.value).toBe(false);
    w.unmount();
    expect(media.removeEventListener).toHaveBeenCalledWith(
      "change",
      media.addEventListener.mock.calls[0][1]
    );
  });
});
