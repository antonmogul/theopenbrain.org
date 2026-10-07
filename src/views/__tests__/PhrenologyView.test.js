import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { readFileSync } from "node:fs";
import path from "node:path";

const motions = vi.hoisted(() => ({ fromTo: vi.fn(), timelineTargets: [] }));
vi.mock("gsap", () => {
  const timeline = (options = {}) => {
    const tl = {};
    for (const name of ["from", "to", "fromTo", "set"])
      tl[name] = vi.fn((target) => {
        motions.timelineTargets.push(target);
        options.onComplete?.();
        return tl;
      });
    tl.then = (fn) => Promise.resolve().then(fn);
    tl.kill = vi.fn();
    return tl;
  };
  return {
    default: { timeline, fromTo: motions.fromTo, killTweensOf: vi.fn() },
  };
});
vi.mock("@/helper/motion", () => ({ reducedMotionK: () => 0 }));
import PhrenologyView from "@/views/PhrenologyView.vue";
const wrappers = [];
async function skull() {
  const w = mount(PhrenologyView, { attachTo: document.body });
  wrappers.push(w);
  await flushPromises();
  return w;
}
beforeEach(() => {
  motions.fromTo.mockReset();
  motions.fromTo.mockReturnValue({ kill: vi.fn() });
  motions.timelineTargets.length = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url) => ({
      text: async () =>
        readFileSync(path.resolve("public", url.replace(/^\//, "")), "utf8"),
    }))
  );
});
afterEach(() => {
  wrappers.splice(0).forEach((w) => w.unmount());
  vi.unstubAllGlobals();
});

describe("source-backed embedded skull", () => {
  it("labels every anterior region and opens source quotation and image", async () => {
    const w = await skull();
    expect(w.findAll(".region-label text")).toHaveLength(27);
    const r19 = w
      .findAll(".region")
      .find((r) => r.attributes("aria-label") === "19. Individuality");
    await r19.trigger("click");
    await flushPromises();
    expect(w.find(".card__badge").text()).toBe("19 · Individuality");
    expect(w.find('[data-source-block="675"]').text()).toContain(
      "Dr. Gall observed, in society"
    );
    expect(w.find(".source-image img").attributes("src")).toContain(
      "image67.png"
    );
    expect(w.find(".card").text()).not.toContain("still to come");
  });
  it("provides Weight source text without a fabricated region", async () => {
    const w = await skull();
    await w.find("select").setValue("22");
    await flushPromises();
    expect(w.find(".card__badge").text()).toBe("22 · Weight");
    expect(w.find(".card__editorial").text()).toContain(
      "not labelled by Spurzheim"
    );
    expect(w.find('[data-source-block="726"]').exists()).toBe(true);
    expect(w.findAll(".source-image")).toHaveLength(0);
    expect(
      w
        .findAll(".region")
        .some((r) => r.attributes("aria-label").startsWith("22."))
    ).toBe(false);
  });
  it("changes only card animation on selection, supports keyboard and repeated dismissal", async () => {
    const w = await skull();
    const region = w
      .findAll(".region")
      .find((r) => r.attributes("aria-label") === "30. Comparison");
    motions.timelineTargets.length = 0;
    for (let i = 0; i < 2; i++) {
      region.element.focus();
      await region.trigger("keydown", { key: "Enter" });
      await flushPromises();
      expect(w.find(".card").exists()).toBe(true);
      expect(motions.fromTo.mock.calls.at(-1)[0]).toBe(w.find(".card").element);
      expect(motions.timelineTargets).not.toContain(w.find(".stage").element);
      await w.find(".card").trigger("keydown", { key: "Escape" });
      expect(w.find(".card").exists()).toBe(false);
      expect(document.activeElement).toBe(region.element);
    }
  });
  it("clears prior details and labels the next view correctly", async () => {
    const w = await skull();
    await w.find("select").setValue("19");
    await w.findAll(".tab")[1].trigger("click");
    await flushPromises();
    expect(w.find(".card").exists()).toBe(false);
    expect(w.findAll(".region-label text")).toHaveLength(31);
    const ideality = w
      .findAll(".region")
      .find((r) => r.attributes("aria-label") === "16. Ideality");
    await ideality.trigger("keydown", { key: " " });
    // Native browser handling is complemented by explicit Vue space key support.
    await ideality.trigger("click");
    expect(w.find(".card__badge").text()).toContain("16 · Ideality");
  });
  it("keeps source panels out of the 3D stage sizing contract", () => {
    const code = readFileSync(
      path.resolve("src/views/Phrenology3DView.vue"),
      "utf8"
    );
    expect(code).not.toContain("body--card");
    expect(code).toContain(
      "grid-template-columns: minmax(0, 1fr) minmax(280px, 0.9fr)"
    );
    expect(code).toContain("selected.quotes");
    expect(code).toContain("selected.images");
    expect(code).not.toContain("selected.blurb");
  });
});
