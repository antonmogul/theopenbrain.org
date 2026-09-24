import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import TrepanationMethods from "../trepanation/TrepanationMethods.vue";
import trepanation from "../trepanation/schema.js";
import PapyrusCase from "../papyrus/PapyrusCase.vue";
import papyrus from "../papyrus/schema.js";
import { figureContent } from "../content.js";
import { figureWidgetFor } from "../registry.js";

const mountTrepanation = (content = {}) =>
  mount(TrepanationMethods, {
    props: {
      content: figureContent(trepanation, { content }),
      schema: trepanation,
    },
    attachTo: document.body,
  });
const mountPapyrus = (content = {}) =>
  mount(PapyrusCase, {
    props: { content: figureContent(papyrus, { content }), schema: papyrus },
    attachTo: document.body,
  });

describe("History figure widgets are registered", () => {
  it("Figure 2 and Figure 4 go to their widgets", () => {
    expect(figureWidgetFor("animationFoundationsFig2").schema).toBe(
      trepanation
    );
    expect(figureWidgetFor("animationFoundationsFig4").schema).toBe(papyrus);
  });
});

describe("TrepanationMethods", () => {
  it("starts on the skull alone, with the prompt and the legend", () => {
    const w = mountTrepanation();
    expect(w.findAll(".tr-hand.is-in")).toHaveLength(0);
    expect(w.text()).toContain("Point at a numbered opening");
    expect(w.text()).toContain("Lisowski, 1967");
    w.unmount();
  });

  it("brings in a method's hand while the mouse is on its opening", async () => {
    const w = mountTrepanation();
    const hole = w.findAll(".tr-hole")[2];
    await hole.trigger("pointerenter", { pointerType: "mouse" });
    const hands = w.findAll(".tr-hand");
    expect(hands[2].classes()).toContain("is-in");
    expect(hands.filter((h) => h.classes("is-in"))).toHaveLength(1);
    expect(w.find(".tr-method").text()).toContain(
      "Drilling a perimeter around the hole"
    );
    await hole.trigger("pointerleave");
    expect(w.findAll(".tr-hand.is-in")).toHaveLength(0);
    w.unmount();
  });

  it("pins a method on a tap (touch has no hover) and lets go on the second", async () => {
    const w = mountTrepanation();
    const callout = w.findAll(".tr-callout")[0];
    await callout.trigger("pointerenter", { pointerType: "touch" });
    expect(w.findAll(".tr-hand.is-in")).toHaveLength(0);
    await callout.trigger("click");
    expect(w.findAll(".tr-hand")[0].classes()).toContain("is-in");
    expect(callout.attributes("aria-pressed")).toBe("true");
    await callout.trigger("click");
    expect(w.findAll(".tr-hand.is-in")).toHaveLength(0);
    w.unmount();
  });

  it("shows a method when its number has keyboard focus, and Escape lets go", async () => {
    const w = mountTrepanation();
    const callout = w.findAll(".tr-callout")[3];
    await callout.trigger("focus");
    expect(w.findAll(".tr-hand")[3].classes()).toContain("is-in");
    await callout.trigger("click");
    await callout.trigger("blur");
    expect(w.findAll(".tr-hand")[3].classes()).toContain("is-in");
    await w.find(".tr").trigger("keydown", { key: "Escape" });
    expect(w.findAll(".tr-hand.is-in")).toHaveLength(0);
    w.unmount();
  });

  it("names every opening for screen readers, with edited labels", () => {
    const w = mountTrepanation({ methods: ["Scraping with flint"] });
    const labels = w
      .findAll(".tr-callout")
      .map((b) => b.attributes("aria-label"));
    expect(labels).toEqual([
      "1. Scraping with flint",
      "2. Grooving",
      "3. Drilling a perimeter around the hole",
      "4. Cutting a rectangular opening",
    ]);
    w.unmount();
  });

  it("says so when an image doesn't load", async () => {
    const w = mountTrepanation();
    await w.find(".tr-skull").trigger("error");
    expect(w.find('[role="alert"]').exists()).toBe(true);
    w.unmount();
  });
});

describe("PapyrusCase", () => {
  it("opens on the title, with its hieroglyphs and translation", () => {
    const w = mountPapyrus();
    const tabs = w.findAll('[role="tab"]');
    expect(tabs.map((t) => t.text())).toEqual([
      "Title",
      "Examination",
      "Diagnosis",
      "Treatment",
    ]);
    expect(tabs[0].attributes("aria-selected")).toBe("true");
    expect(w.find(".pc-glyphs svg").exists()).toBe(true);
    expect(w.find(".pc-translation").text()).toMatch(
      /^Instructions concerning a wound in his temple/
    );
    w.unmount();
  });

  it("switches part on a click", async () => {
    const w = mountPapyrus();
    await w.findAll('[role="tab"]')[3].trigger("click");
    expect(w.find(".pc-translation").text()).toContain(
      "soften his head with grease"
    );
    expect(w.find(".pc-line").text()).toBe("VIII 4 – 5");
    const panel = w.find('[role="tabpanel"]');
    expect(panel.attributes("aria-labelledby")).toBe(
      w.findAll('[role="tab"]')[3].attributes("id")
    );
    w.unmount();
  });

  it("moves between tabs with the arrow keys, Home and End, wrapping round", async () => {
    const w = mountPapyrus();
    const list = w.find('[role="tablist"]');
    const selected = () =>
      w
        .findAll('[role="tab"]')
        .findIndex((t) => t.attributes("aria-selected") === "true");
    await list.trigger("keydown", { key: "ArrowLeft" });
    expect(selected()).toBe(3);
    await list.trigger("keydown", { key: "ArrowRight" });
    expect(selected()).toBe(0);
    await list.trigger("keydown", { key: "End" });
    expect(selected()).toBe(3);
    await list.trigger("keydown", { key: "Home" });
    expect(selected()).toBe(0);
    // Only the selected tab is in the tab order.
    expect(
      w.findAll('[role="tab"]').map((t) => t.attributes("tabindex"))
    ).toEqual(["0", "-1", "-1", "-1"]);
    w.unmount();
  });

  it("takes translations edited on the chapter page, part by part", async () => {
    const w = mountPapyrus({ translations: [null, "An edited examination."] });
    expect(w.find(".pc-translation").text()).toMatch(
      /^Instructions concerning/
    );
    await w.findAll('[role="tab"]')[1].trigger("click");
    expect(w.find(".pc-translation").text()).toBe("An edited examination.");
    w.unmount();
  });

  it("paints the column markers in the chapter's accent, not a fixed purple", () => {
    const w = mountPapyrus();
    const svg = w.find(".pc-glyphs").html();
    expect(svg).toContain("currentColor");
    expect(svg.toLowerCase()).not.toContain("#8d4cf6");
    w.unmount();
  });
});
