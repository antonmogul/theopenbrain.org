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
  it("moves the picker to a loaded view, retains a valid view and leaves Weight unmapped", async () => {
    const w = await skull();
    await w.find("select").setValue("12");
    await flushPromises();
    expect(w.find(".tab--on").text()).toBe("Lateral");
    expect(w.findAll(".region--on")).toHaveLength(1);
    expect(w.find(".card__badge").text()).toContain("12 ·");
    expect(w.find("select").attributes("disabled")).toBeUndefined();
    await w.findAll(".tab")[2].trigger("click");
    await flushPromises();
    await w.find("select").setValue("12");
    await flushPromises();
    expect(w.find(".tab--on").text()).toBe("Posterior");
    expect(w.findAll(".region--on")).toHaveLength(2);
    await w.find("select").setValue("21");
    await flushPromises();
    expect(w.find(".tab--on").text()).toBe("Anterior");
    expect(w.findAll(".region--on").length).toBeGreaterThan(0);
    await w.find("select").setValue("22");
    await flushPromises();
    expect(w.find(".tab--on").text()).toBe("Anterior");
    expect(w.findAll(".region--on")).toHaveLength(0);
    expect(w.find(".card__editorial").text()).toBe(
      "Region not labelled by Spurzheim in an image plate nor on the manuscript's frontispiece. No skull position is assigned here."
    );
  });

  it("renders the requested paragraph joins with all source references", async () => {
    const w = await skull();
    await w.find("select").setValue("12");
    await flushPromises();
    expect(w.findAll(".card__text")).toHaveLength(2);
    expect(w.find('[data-source-blocks="583 584"]').text()).toContain(
      "One day in a public place"
    );
    await w.find("select").setValue("24");
    await flushPromises();
    expect(w.findAll(".card__text")).toHaveLength(3);
    expect(w.find('[data-source-blocks="788 789 790"]').text()).toContain(
      "it seems to me that it is the faculty of space in general."
    );
    for (const n of [6, 11]) {
      await w.find("select").setValue(String(n));
      await flushPromises();
      expect(w.findAll(".card__editorial")).toHaveLength(0);
    }
  });

  it("labels every anterior region and opens the organ's source quotation", async () => {
    const w = await skull();
    expect(w.findAll(".region-label text")).toHaveLength(27);
    const r19 = w
      .findAll(".region")
      .find((r) => r.attributes("aria-label") === "19. Individuality");
    await r19.trigger("click");
    await flushPromises();
    expect(w.find(".card__badge").text()).toBe("19 · Organ of Individuality");
    expect(w.find('[data-source-block="675"]').text()).toContain(
      "Dr. Gall observed, in society"
    );
    // Stuart, 13 Oct: the skull art replaces the source's scans in the card.
    expect(w.find(".card img").exists()).toBe(false);
    expect(w.find(".card").text()).not.toContain("still to come");
  });
  it("provides Weight source text without a fabricated region", async () => {
    const w = await skull();
    await w.find("select").setValue("22");
    await flushPromises();
    expect(w.find(".card__badge").text()).toBe("22 · Organ of Weight");
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
    expect(w.find(".card__badge").text()).toContain("16 · Organ of Ideality");
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
    // Text only in the card (Stuart, 13 Oct); the scans stay in the data.
    expect(code).not.toContain("selected.images");
    expect(code).not.toContain("selected.blurb");
  });
  it("sizes itself by the height it is given, with no disclaimer (OPENBRAIN-147)", async () => {
    const w = await skull();
    // The chapter's full-screen band sets --widget-body-min-h: 0 and the
    // view uses that height with a readable floor and local overflow. Actual
    // clipping/final-line visibility is covered by phrenology-host-browser.mjs.
    const code = readFileSync(
      path.resolve("src/views/PhrenologyView.vue"),
      "utf8"
    );
    expect(code).toContain("var(--widget-body-min-h, 65vh)");
    expect(code).toContain("var(--skull-h) * 450 / 435");
    expect(w.text()).not.toContain("not accepted neuroscience");
    expect(w.find(".card-instruction").text()).toContain(
      "Select a region of the skull"
    );
    // The tabs and the organ list share one row; no title of their own.
    expect(w.find(".phreno__chrome h2").exists()).toBe(false);
  });
});
