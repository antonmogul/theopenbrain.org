import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import CorbettaPetView from "@/views/CorbettaPetView.vue";

const onSpots = (w) =>
  w
    .findAll("[data-spots]")
    .filter((g) => g.findAll(".cpa-hotspot.is-on").length > 0)
    .map((g) => g.attributes("data-spots"));

describe("CorbettaPetView", () => {
  it("opens on feature mode, attending to shape", () => {
    const w = mount(CorbettaPetView);
    expect(onSpots(w)).toEqual(["shape"]);
    expect(w.find(".cpa-callout").classes()).toContain("is-on");
    expect(w.find(".cpa-callout-text").text()).toBe("ventral + temporal");
    expect(w.find(".cpa-takeaway").text()).toMatch(/^Attend shape:/);
  });

  it("moves the hotspots and callout with the attended feature", async () => {
    const w = mount(CorbettaPetView);
    await w.find('[data-feature="velocity"]').trigger("click");
    expect(onSpots(w)).toEqual(["velocity"]);
    const line = w.find(".cpa-callout-line");
    expect([line.attributes("x1"), line.attributes("y1")]).toEqual([
      "925",
      "300",
    ]);
    expect(w.find('[data-feature="velocity"]').attributes("aria-pressed")).toBe(
      "true"
    );
    await w.find('[data-feature="color"]').trigger("click");
    expect(onSpots(w)).toEqual(["color"]);
    expect(w.find(".cpa-callout-line").attributes("x1")).toBe("1110");
  });

  it("spatial mode washes the hemisphere opposite the attended field", async () => {
    const w = mount(CorbettaPetView);
    const [featureBtn, spatialBtn] = w.findAll(".cpa-mode .cpa-btn");
    await spatialBtn.trigger("click");
    expect(onSpots(w)).toEqual([]);
    expect(w.find(".cpa-callout").classes()).not.toContain("is-on");
    expect(w.find('[data-wash="right"]').classes()).toContain("is-on");
    expect(w.find(".cpa-takeaway").text()).toContain("toward right visual");

    await w.find('[data-side="right"]').trigger("click");
    expect(w.find('[data-wash="left"]').classes()).toContain("is-on");
    expect(w.find('[data-wash="right"]').classes()).not.toContain("is-on");

    await featureBtn.trigger("click");
    expect(w.findAll(".cpa-wash.is-on")).toHaveLength(0);
    expect(onSpots(w)).toEqual(["shape"]);
  });
});
