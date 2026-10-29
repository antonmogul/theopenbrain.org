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
  describe("the phone sheet (OPENBRAIN-160)", () => {
    const media = {
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    beforeEach(() => {
      media.matches = true;
      media.addEventListener.mockClear();
      vi.spyOn(window, "matchMedia").mockReturnValue(media);
      vi.stubGlobal("requestAnimationFrame", (fn) => {
        fn();
        return 1;
      });
    });
    afterEach(() => vi.restoreAllMocks());

    it("opens the text as a sheet over the lit region, takes focus and returns it on dismissal", async () => {
      const w = await skull();
      expect(w.find(".card--sheet").exists()).toBe(false);
      expect(w.find(".card-instruction").exists()).toBe(true);
      const r19 = w
        .findAll(".region")
        .find((r) => r.attributes("aria-label") === "19. Individuality");
      r19.element.focus();
      await r19.trigger("keydown", { key: "Enter" });
      await flushPromises();
      const sheet = w.find(".card--sheet");
      expect(sheet.exists()).toBe(true);
      expect(sheet.attributes("role")).toBe("dialog");
      expect(sheet.attributes("aria-label")).toBe("19. Organ of Individuality");
      expect(sheet.attributes("data-detent")).toBe("half");
      expect(sheet.attributes("style")).toContain("--sheet-f: 0.5");
      expect(document.activeElement).toBe(sheet.element);
      // The region stays marked under the sheet, and the stage keeps the
      // instruction's row so it does not move.
      expect(w.findAll(".region--on")).toHaveLength(1);
      expect(w.find(".card-instruction--covered").exists()).toBe(true);
      // A different region replaces the text without closing.
      const r30 = w
        .findAll(".region")
        .find((r) => r.attributes("aria-label") === "30. Comparison");
      r30.element.focus(); // as a tap on the region does
      await r30.trigger("click");
      await flushPromises();
      expect(w.find(".card__badge").text()).toBe("30 · Organ of Comparison");
      expect(w.find(".card--sheet").attributes("data-detent")).toBe("half");
      // The handle's keyboard: up to full, down to half, down again dismisses
      // and deselects, focus back on the region picked last.
      const grip = w.find(".sheet__grip");
      expect(grip.attributes("role")).toBe("slider");
      expect(grip.attributes("aria-label")).toBe("Resize the source text");
      await grip.trigger("keydown", { key: "ArrowUp" });
      expect(w.find(".card--sheet").attributes("data-detent")).toBe("full");
      expect(grip.attributes("aria-valuetext")).toBe("Full");
      await grip.trigger("keydown", { key: "ArrowDown" });
      await grip.trigger("keydown", { key: "ArrowDown" });
      await flushPromises();
      expect(w.find(".card").exists()).toBe(false);
      expect(w.findAll(".region--on")).toHaveLength(0);
      expect(document.activeElement).toBe(r30.element);
    });

    it("dismisses from a drag below half and on Escape, and loses the sheet at desktop widths", async () => {
      const w = await skull();
      await w.find("select").setValue("19");
      await flushPromises();
      const grip = w.find(".sheet__grip");
      const pointer = (type, clientY) =>
        grip.trigger(type, { pointerId: 1, button: 0, clientY });
      // happy-dom has no layout: the container is 0px tall, so a drag can't
      // move the fraction; the tap toggle still exercises the pointer trio.
      await pointer("pointerdown", 300);
      await pointer("pointerup", 300);
      expect(w.find(".card--sheet").attributes("data-detent")).toBe("full");
      await pointer("pointerdown", 300);
      await pointer("pointerup", 300);
      expect(w.find(".card--sheet").attributes("data-detent")).toBe("half");
      await w.find(".card").trigger("keydown", { key: "Escape" });
      expect(w.find(".card").exists()).toBe(false);
      expect(w.findAll(".region--on")).toHaveLength(0);

      await w.find("select").setValue("19");
      await flushPromises();
      expect(w.find(".card--sheet").exists()).toBe(true);
      // Rotating past the breakpoint: the card goes back beside the skull.
      media.matches = false;
      media.addEventListener.mock.calls[0][1]({ matches: false });
      await flushPromises();
      expect(w.find(".card").exists()).toBe(true);
      expect(w.find(".card--sheet").exists()).toBe(false);
      expect(w.find(".sheet__grip").exists()).toBe(false);
      expect(w.find(".card").attributes("role")).toBeUndefined();
      expect(w.find(".card-instruction").exists()).toBe(false);
      w.unmount();
      expect(media.removeEventListener).toHaveBeenCalled();
    });
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
