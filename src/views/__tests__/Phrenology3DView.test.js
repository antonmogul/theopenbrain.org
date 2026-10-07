import { afterEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
const state = vi.hoisted(() => ({ webglUnavailable: true }));
vi.mock("three", async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    WebGLRenderer: class {
      constructor() {
        if (state.webglUnavailable)
          throw new Error("WebGL unavailable in test");
      }
      setPixelRatio() {}
      setSize() {}
      render() {}
      dispose() {}
    },
  };
});
import Phrenology3DView from "@/views/Phrenology3DView.vue";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
const wrappers = [];
afterEach(() => {
  wrappers.splice(0).forEach((w) => w.unmount());
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  state.webglUnavailable = true;
});
describe("3D skull source fallback", () => {
  it("ignores canvas gestures after failure and cancellation", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const errors = [];
    const w = mount(Phrenology3DView, {
      global: { config: { errorHandler: (error) => errors.push(error) } },
    });
    wrappers.push(w);
    const canvas = w.get("canvas");
    const point = { clientX: 20, clientY: 20 };
    await canvas.trigger("pointerdown", point);
    await canvas.trigger("pointermove", point);
    await canvas.trigger("pointerup", point);
    await flushPromises();
    expect(w.text()).toContain("The 3D skull could not be loaded");
    await canvas.trigger("pointerdown", point);
    await canvas.trigger("pointercancel", point);
    await canvas.trigger("pointerup", point);
    await canvas.trigger("pointerdown", point);
    await canvas.trigger("pointerup", point);
    expect(errors).toEqual([]);
    await w.find("select").setValue("22");
    expect(w.find(".card__editorial").text()).toContain("not labelled");
  });

  it("keeps canvas picking inert while model and map loading is pending", async () => {
    state.webglUnavailable = false;
    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn(() => 1)
    );
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        disconnect() {}
      }
    );
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise(() => {}))
    );
    vi.spyOn(GLTFLoader.prototype, "loadAsync").mockImplementation(
      () => new Promise(() => {})
    );
    const errors = [];
    const w = mount(Phrenology3DView, {
      global: { config: { errorHandler: (error) => errors.push(error) } },
    });
    wrappers.push(w);
    expect(w.text()).toContain("Loading the skull");
    const canvas = w.get("canvas");
    canvas.element.setPointerCapture = vi.fn();
    canvas.element.releasePointerCapture = vi.fn();
    await canvas.trigger("pointerdown", { clientX: 20, clientY: 20 });
    await canvas.trigger("pointerup", { clientX: 20, clientY: 20 });
    await canvas.trigger("pointermove", { clientX: 20, clientY: 20 });
    expect(errors).toEqual([]);
  });

  it("keeps all source content accessible when WebGL cannot initialize", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const w = mount(Phrenology3DView);
    wrappers.push(w);
    await flushPromises();
    expect(w.text()).toContain("The 3D skull could not be loaded");
    await w.find("select").setValue("19");
    await flushPromises();
    expect(w.find('[data-source-block="675"]').text()).toContain(
      "Dr. Gall observed, in society"
    );
    expect(w.find(".source-image img").attributes("src")).toContain(
      "image67.png"
    );
    await w.find("select").setValue("22");
    expect(w.find(".card__editorial").text()).toContain(
      "not labelled by Spurzheim"
    );
    await w.find(".card").trigger("keydown", { key: "Escape" });
    expect(w.find(".card").exists()).toBe(false);
  });
});
