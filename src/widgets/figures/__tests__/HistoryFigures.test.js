import { afterEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import TrepanationMethods from "../trepanation/TrepanationMethods.vue";
import trepanation from "../trepanation/schema.js";
import { inZone, openingAt } from "../trepanation/openings.js";
import PapyrusCase from "../papyrus/PapyrusCase.vue";
import papyrus from "../papyrus/schema.js";
import {
  SIGN_SECONDS,
  drawDelays,
  drawSeconds,
  lineOf,
} from "../papyrus/drawIn.js";
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

/* happy-dom lays nothing out: give the stage a box, 1px per frame unit. */
function withStageBox(w) {
  const { width, height } = trepanation.art;
  w.find(".tr-stage").element.getBoundingClientRect = () => ({
    left: 0,
    top: 0,
    width,
    height,
    right: width,
    bottom: height,
  });
  return w;
}
const handsIn = (w) =>
  w
    .findAll(".tr-hand")
    .map((h) => (h.classes("is-in") ? 1 : 0))
    .join("");

describe("the trepanation figure's openings", () => {
  const { methods } = trepanation.art;

  it("finds each opening from its own spot and from its number", () => {
    methods.forEach((m, i) => {
      expect(openingAt(m.at.x, m.at.y, methods)).toBe(i);
      expect(openingAt(m.disc.x, m.disc.y, methods)).toBe(i);
    });
  });

  it("gives a spot two zones share to the nearer opening", () => {
    // The grooved opening's zone (2) and the drilled one's (3) just meet.
    const [, grooved, drilled] = methods;
    expect(inZone(330, 306, grooved.zone)).toBe(true);
    expect(inZone(330, 306, drilled.zone)).toBe(true);
    expect(openingAt(330, 306, methods)).toBe(1);
    // The rule itself, on two zones that share most of their area.
    const pair = [
      { at: { x: 0, y: 0 }, zone: { x: 0, y: 0, rx: 10, ry: 10 } },
      { at: { x: 8, y: 0 }, zone: { x: 8, y: 0, rx: 10, ry: 10 } },
    ];
    expect(openingAt(3, 0, pair)).toBe(0);
    expect(openingAt(5, 0, pair)).toBe(1);
  });

  it("turns a zone with its ellipse", () => {
    const zone = { x: 0, y: 0, rx: 10, ry: 2, turn: 90 }; // now tall
    expect(inZone(0, 9, zone)).toBe(true);
    expect(inZone(9, 0, zone)).toBe(false);
  });

  it("is nowhere on the rest of the skull", () => {
    expect(openingAt(360, 600, methods)).toBe(null);
    expect(openingAt(10, 10, methods)).toBe(null);
  });

  it("keeps every number, line end and zone inside the part of the stage that always shows", () => {
    const { width, height, spare } = trepanation.art;
    for (const m of methods) {
      for (const p of [m.at, m.disc]) {
        expect(p.x).toBeGreaterThan(0);
        expect(p.x).toBeLessThan(width);
        expect(p.y).toBeGreaterThan(spare + 17); // a disc is 34 across
        expect(p.y).toBeLessThan(height);
      }
    }
  });
});

describe("TrepanationMethods", () => {
  it("starts on the skull alone, with the prompt, the label and the legend", () => {
    const w = mountTrepanation();
    expect(handsIn(w)).toBe("0000");
    expect(w.find(".tr-prompt").text()).toBe(trepanation.defaults.prompt);
    expect(w.find(".tr-fig").text()).toBe("Fig 02");
    expect(w.find(".tr-title").text()).toBe("Methods of trepanation");
    expect(w.find(".tr-legend").text()).toContain("Lisowski, 1967");
    w.unmount();
  });

  it("brings in a method's arm while the mouse is on its opening", async () => {
    const w = withStageBox(mountTrepanation());
    const stage = w.find(".tr-stage");
    const { at } = trepanation.art.methods[2];
    await stage.trigger("pointermove", {
      pointerType: "mouse",
      clientX: at.x,
      clientY: at.y,
    });
    expect(handsIn(w)).toBe("0010");
    expect(w.find(".tr-method").text()).toBe("Drilling");
    expect(stage.attributes("data-over")).toBeDefined();
    await stage.trigger("pointermove", {
      pointerType: "mouse",
      clientX: 360,
      clientY: 600,
    });
    expect(handsIn(w)).toBe("0000");
    await stage.trigger("pointermove", {
      pointerType: "mouse",
      clientX: at.x,
      clientY: at.y,
    });
    await stage.trigger("pointerleave");
    expect(handsIn(w)).toBe("0000");
    w.unmount();
  });

  it("shows a method from its number too", async () => {
    const w = withStageBox(mountTrepanation());
    await w.findAll(".tr-disc")[1].trigger("pointermove", {
      pointerType: "mouse",
    });
    expect(handsIn(w)).toBe("0100");
    expect(w.findAll(".tr-disc")[1].classes()).toContain("is-on");
    expect(w.findAll(".tr-mark")[1].classes()).toContain("is-on");
    w.unmount();
  });

  it("pins a method on a tap (touch has no hover) and lets go on the second", async () => {
    const w = withStageBox(mountTrepanation());
    const disc = w.findAll(".tr-disc")[0];
    await disc.trigger("pointermove", { pointerType: "touch" });
    expect(handsIn(w)).toBe("0000");
    // A tap: press, the focus the press causes, release, click.
    await disc.trigger("pointerdown");
    await disc.trigger("focus");
    await disc.trigger("pointerup");
    await disc.trigger("click");
    expect(handsIn(w)).toBe("1000");
    expect(disc.attributes("aria-pressed")).toBe("true");
    await disc.trigger("pointerdown");
    await disc.trigger("pointerup");
    await disc.trigger("click");
    expect(handsIn(w)).toBe("0000");
    expect(disc.attributes("aria-pressed")).toBe("false");
    w.unmount();
  });

  it("does not take a press on one number for keyboard focus, whichever had focus before", async () => {
    const w = withStageBox(mountTrepanation());
    const [, second, , fourth] = w.findAll(".tr-disc");
    await second.trigger("focus");
    expect(handsIn(w)).toBe("0100");
    await fourth.trigger("pointerdown");
    await second.trigger("blur");
    await fourth.trigger("focus");
    await fourth.trigger("pointerup");
    expect(handsIn(w)).toBe("0000");
    w.unmount();
  });

  it("pins from the opening itself, and lets go on a click beside the openings", async () => {
    const w = withStageBox(mountTrepanation());
    const stage = w.find(".tr-stage");
    const { at } = trepanation.art.methods[3];
    await stage.trigger("click", { clientX: at.x, clientY: at.y });
    expect(handsIn(w)).toBe("0001");
    await stage.trigger("click", { clientX: 360, clientY: 600 });
    expect(handsIn(w)).toBe("0000");
    w.unmount();
  });

  it("shows a method when its number has keyboard focus, and Escape lets go", async () => {
    const w = withStageBox(mountTrepanation());
    const disc = w.findAll(".tr-disc")[3];
    await disc.trigger("focus");
    expect(handsIn(w)).toBe("0001");
    await disc.trigger("click");
    await disc.trigger("blur");
    expect(handsIn(w)).toBe("0001");
    await w.find(".tr").trigger("keydown", { key: "Escape" });
    expect(handsIn(w)).toBe("0000");
    w.unmount();
  });

  it("has a row of numbers for a phone that pins the same methods", async () => {
    const w = mountTrepanation();
    const picks = w.findAll(".tr-pick");
    expect(picks.map((b) => b.text())).toEqual(["1", "2", "3", "4"]);
    await picks[2].trigger("click");
    expect(handsIn(w)).toBe("0010");
    expect(picks[2].attributes("aria-pressed")).toBe("true");
    expect(w.findAll(".tr-disc")[2].attributes("aria-pressed")).toBe("true");
    await picks[2].trigger("click");
    expect(handsIn(w)).toBe("0000");
    w.unmount();
  });

  it("names every opening for screen readers, with edited names", () => {
    const w = mountTrepanation({
      methods: ["Scraping with flint"],
      labels: [null, "Groove"],
    });
    const names = (sel) =>
      w.findAll(sel).map((b) => b.attributes("aria-label"));
    const expected = [
      "1. Scraping with flint",
      "2. Grooving",
      "3. Drilling a perimeter around the hole",
      "4. Cutting a rectangular opening",
    ];
    expect(names(".tr-disc")).toEqual(expected);
    expect(names(".tr-pick")).toEqual(expected);
    expect(
      figureContent(trepanation, { content: { labels: [null, "Groove"] } })
        .labels
    ).toEqual(["Scraping", "Groove", "Drilling", "Cutting"]);
    w.unmount();
  });

  it("takes its label, title and legend from saved content", () => {
    const w = mountTrepanation({ figureLabel: "Fig 03", title: "Openings" });
    expect(w.find(".tr-fig").text()).toBe("Fig 03");
    expect(w.find(".tr-title").text()).toBe("Openings");
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
  afterEach(() => {
    delete document.fullscreenEnabled;
    delete document.documentElement.dataset.reduceMotion;
  });

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
    expect(w.find(".pc-line").text()).toBe("VII 22");
    expect(w.find(".pc-translation").text()).toMatch(
      /^Instructions concerning a wound in his temple/
    );
    w.unmount();
  });

  it("has the pane's toolbar row: label, title, legend", () => {
    const w = mountPapyrus();
    expect(w.find(".pc-fig").text()).toBe("Wid 02");
    expect(w.find("h4.pc-title").text()).toBe(
      "The Edwin Smith papyrus, case 20"
    );
    expect(w.find(".pc-legend").text()).toContain("Breasted (1930)");
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

  it("turns the card over from its button, and says which side shows", async () => {
    const w = mountPapyrus();
    const card = w.find(".pc-card");
    const button = w.find(".pc-flip");
    expect(card.classes()).not.toContain("is-flipped");
    expect(button.text()).toBe("Read the translation");
    expect(w.find('[role="status"]').text()).toBe("");

    await button.trigger("click");
    expect(card.classes()).toContain("is-flipped");
    expect(button.text()).toBe("See the hieroglyphs");
    expect(w.find('[role="status"]').text()).toBe("Translation showing.");
    expect(w.find(".pc-label").text()).toBe("Translation");

    await button.trigger("click");
    expect(card.classes()).not.toContain("is-flipped");
    expect(button.text()).toBe("Read the translation");
    expect(w.find('[role="status"]').text()).toBe("Hieroglyphs showing.");
    w.unmount();
  });

  it("turns on a click on the card, but not one that ends a text selection", async () => {
    const w = mountPapyrus();
    const card = w.find(".pc-card");
    await card.trigger("click");
    expect(card.classes()).toContain("is-flipped");

    const selection = vi
      .spyOn(window, "getSelection")
      .mockReturnValue({ toString: () => "thou examinest" });
    await card.trigger("click");
    expect(card.classes()).toContain("is-flipped");
    selection.mockRestore();

    await card.trigger("click");
    expect(card.classes()).not.toContain("is-flipped");
    w.unmount();
  });

  it("turns back to the hieroglyphs on a new tab, and stays put on the same one", async () => {
    const w = mountPapyrus();
    const tabs = w.findAll('[role="tab"]');
    await w.find(".pc-flip").trigger("click");
    await tabs[0].trigger("click");
    expect(w.find(".pc-card").classes()).toContain("is-flipped");
    await tabs[2].trigger("click");
    expect(w.find(".pc-card").classes()).not.toContain("is-flipped");
    expect(w.find(".pc-flip").text()).toBe("Read the translation");
    w.unmount();
  });

  it("keeps the translation readable to assistive technology on either side; the signs are a picture", async () => {
    const w = mountPapyrus();
    expect(w.find(".pc-glyphs").attributes("aria-hidden")).toBe("true");
    const hidden = () =>
      w.find(".pc-translation").element.closest("[aria-hidden], [inert]");
    expect(hidden()).toBeNull();
    // The side that is turned away takes no keyboard focus.
    expect(w.find(".pc-text").attributes("tabindex")).toBe("-1");
    await w.find(".pc-flip").trigger("click");
    expect(hidden()).toBeNull();
    expect(w.find(".pc-text").attributes("tabindex")).toBeUndefined();
    expect(w.find(".pc-fit").attributes("tabindex")).toBe("-1");
    w.unmount();
  });

  it("takes its label and the button's words from saved content", async () => {
    const w = mountPapyrus({
      figureLabel: "Fig 04",
      translationLabel: "In English",
      flip: ["Turn it over", null],
    });
    expect(w.find(".pc-fig").text()).toBe("Fig 04");
    expect(w.find(".pc-label").text()).toBe("In English");
    expect(w.find(".pc-flip").text()).toBe("Turn it over");
    await w.find(".pc-flip").trigger("click");
    expect(w.find(".pc-flip").text()).toBe("See the hieroglyphs");
    w.unmount();
  });

  it("holds still under reduced motion", async () => {
    document.documentElement.dataset.reduceMotion = "1";
    const w = mountPapyrus();
    expect(w.find(".pc").classes()).toContain("pc--still");
    expect(w.find(".pc-glyphs").classes()).toEqual(["pc-glyphs"]);
    await w.findAll('[role="tab"]')[1].trigger("click");
    expect(w.find(".pc-glyphs").classes()).toEqual(["pc-glyphs"]);
    w.unmount();
  });

  it("offers the whole screen only where the browser has it", async () => {
    const without = mountPapyrus();
    expect(without.find(".pc-expand").exists()).toBe(false);
    without.unmount();

    document.fullscreenEnabled = true;
    const request = vi.fn(() => Promise.resolve());
    HTMLElement.prototype.requestFullscreen = request;
    const w = mountPapyrus();
    await w.vm.$nextTick();
    const expand = w.find(".pc-expand");
    expect(expand.attributes("aria-label")).toBe("Expand to full screen");
    await expand.trigger("click");
    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.instances[0]).toBe(w.find(".pc").element);
    delete HTMLElement.prototype.requestFullscreen;
    w.unmount();
  });

  it("draws the designers' white art: no fixed purple, no layer ids, every line drawable", async () => {
    const w = mountPapyrus();
    const tabs = w.findAll('[role="tab"]');
    for (let i = 0; i < tabs.length; i++) {
      await tabs[i].trigger("click");
      const svg = w.find(".pc-glyphs").html();
      expect(svg.toLowerCase()).not.toContain("#8d4cf6");
      expect(svg).not.toMatch(/\sid="/);
      const paths = w.findAll(".pc-glyphs path");
      expect(paths.length).toBeGreaterThan(40);
      // A path is a line (drawn in by its dash) or a filled shape.
      for (const path of paths)
        expect(
          path.attributes("pathLength") === "1" ||
            path.attributes("stroke") === "none"
        ).toBe(true);
      // One child of the root group is one sign, or one stroke of it.
      expect(
        w.find(".pc-glyphs svg > g").element.children.length
      ).toBeGreaterThan(10);
    }
    w.unmount();
  });
});

describe("the papyrus draw-in's order", () => {
  const box = (x, y, width = 10, height = 30) => ({ x, y, width, height });

  it("sorts signs into lines, and keeps a line's small numeral with it", () => {
    const boxes = [
      box(0, 59), // second line
      box(0, 11), // first line
      box(40, 4, 8, 4), // a numeral over the first line
      box(60, 12),
      box(20, 107), // third line
      box(30, 52, 8, 4), // a numeral over the second line
    ];
    expect(lineOf(boxes)).toEqual([1, 0, 0, 0, 2, 1]);
  });

  it("starts a line's signs left to right, and each line after the one above", () => {
    const boxes = [box(0, 11), box(100, 11), box(200, 11), box(0, 59)];
    const { delays, total } = drawDelays(boxes);
    expect(delays[0]).toBeLessThan(delays[1]);
    expect(delays[1]).toBeLessThan(delays[2]);
    expect(delays[3]).toBeGreaterThan(delays[0]);
    expect(delays[0]).toBeGreaterThanOrEqual(0);
    // The last sign has finished by the end.
    expect(Math.max(...delays) + SIGN_SECONDS).toBeLessThanOrEqual(total);
  });

  it("takes about a second for a short part and never more than 1.4 s", () => {
    expect(drawSeconds(2)).toBeCloseTo(0.94);
    expect(drawSeconds(13)).toBe(1.4);
    expect(drawSeconds(40)).toBe(1.4);
    expect(drawDelays([])).toEqual({ delays: [], total: 0 });
  });

  it("handles a part that is one sign, or signs with no width", () => {
    expect(drawDelays([box(5, 5, 0, 10)]).delays).toEqual([0]);
    const { delays } = drawDelays([box(5, 5, 0, 10), box(5, 60, 0, 10)]);
    expect(delays.every((d) => Number.isFinite(d))).toBe(true);
  });
});
