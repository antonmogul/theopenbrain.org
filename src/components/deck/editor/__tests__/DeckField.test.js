/*
 * DeckField (OPENBRAIN-129): optional groups store null or drop their key
 * when off, showWhen hides fields that have no effect, the character count
 * is part of the field's description, and every control's id is
 * fieldId(slideId, path).
 */
import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import { LAYOUT_SCHEMAS } from "@/data/decks/fields.js";
import { fieldId } from "@/data/decks/validate.js";
import DeckField from "../DeckField.vue";

const hero = LAYOUT_SCHEMAS.hero.fields;
const trajectory = LAYOUT_SCHEMAS.trajectory.fields;

const mountField = (props) =>
  mount(DeckField, {
    props: {
      slideId: "intro",
      problems: [],
      deckId: "0b4f6d1e-5c2a-4c1e-9d3b-1a2b3c4d5e6f",
      ...props,
    },
    attachTo: document.body,
  });
const updates = (w) => w.emitted("update") || [];

describe("DeckField · optional groups", () => {
  it("stores null when an off: 'null' group is switched off", async () => {
    const w = mountField({
      descriptor: hero.person,
      value: { name: "Stuart Trenholm", role: "Founder" },
      path: "props.person",
    });
    expect(w.findAll("input").length).toBe(2);
    await w.get('[role="switch"]').trigger("click");
    expect(updates(w).at(-1)).toEqual(["props.person", null]);
    w.unmount();
  });

  it("drops the key when an off: 'omit' group is switched off", async () => {
    const w = mountField({
      descriptor: trajectory.legend,
      value: { live: "Live", inProgress: "Soon", funded: "F", unfunded: "U" },
      path: "props.legend",
      slideId: "trajectory",
    });
    await w.get('[role="switch"]').trigger("click");
    expect(updates(w).at(-1)).toEqual(["props.legend", undefined]);
    w.unmount();
  });

  it("stores every default when an optional group is switched on", async () => {
    const w = mountField({
      descriptor: trajectory.legend,
      value: undefined,
      path: "props.legend",
      slideId: "trajectory",
    });
    expect(w.findAll("input").length).toBe(0);
    await w.get('[role="switch"]').trigger("click");
    expect(updates(w).at(-1)).toEqual([
      "props.legend",
      trajectory.legend.defaults,
    ]);
    w.unmount();
  });
});

describe("DeckField · showWhen", () => {
  it("hides a field that has no effect on the slide", () => {
    const w = mountField({
      descriptor: hero.eyebrow,
      value: "",
      context: { brand: true },
      path: "props.eyebrow",
    });
    expect(w.find("input").exists()).toBe(false);
    w.unmount();
  });

  it("shows it once the setting that hides it is off", () => {
    const w = mountField({
      descriptor: hero.eyebrow,
      value: "",
      context: { brand: false },
      path: "props.eyebrow",
    });
    expect(w.find("input").exists()).toBe(true);
    w.unmount();
  });

  it("keeps a hidden field that still holds text, with Clear", async () => {
    const w = mountField({
      descriptor: hero.eyebrow,
      value: "01 · Intro",
      context: { brand: true },
      path: "props.eyebrow",
    });
    expect(w.text()).toContain("Not shown on the slide");
    await w.get('button[aria-label="Clear Eyebrow"]').trigger("click");
    expect(updates(w).at(-1)).toEqual(["props.eyebrow", ""]);
    w.unmount();
  });
});

describe("DeckField · description", () => {
  it("counts characters against maxChars, as part of the description", () => {
    const w = mountField({
      descriptor: hero.title,
      value: "x".repeat(50),
      path: "props.title",
    });
    const input = w.get("input");
    const desc = document.getElementById(input.attributes("aria-describedby"));
    expect(desc.textContent).toContain("50 / 48");
    expect(desc.textContent).toContain("2 over");
    expect(desc.querySelector(".deck-ed-count").className).toContain("is-over");
    // A count, not a live region: read with the field, never announced.
    expect(desc.getAttribute("aria-live")).toBeNull();
    w.unmount();
  });

  it("links the field's problems and marks errors invalid", () => {
    const w = mountField({
      descriptor: hero.title,
      value: "",
      path: "props.title",
      problems: [
        {
          slideId: "intro",
          path: "props.title",
          level: "error",
          code: "E_REQUIRED",
          message: "Title is required.",
        },
        {
          slideId: "intro",
          path: "props.lead",
          level: "warn",
          code: "W_LENGTH",
          message: "Not this field's.",
        },
      ],
    });
    const input = w.get("input");
    expect(input.attributes("aria-invalid")).toBe("true");
    const desc = document.getElementById(input.attributes("aria-describedby"));
    expect(desc.textContent).toContain("Title is required.");
    expect(desc.textContent).not.toContain("Not this field's.");
    w.unmount();
  });

  it("smartens punctuation when a text field loses focus", async () => {
    const w = mountField({
      descriptor: hero.lead,
      value: 'A "free" book - for anyone...',
      path: "props.lead",
    });
    await w.get("textarea").trigger("blur");
    expect(updates(w).at(-1)).toEqual([
      "props.lead",
      "A “free” book — for anyone…",
    ]);
    w.unmount();
  });
});

describe("DeckField · ids", () => {
  it("gives a scalar control fieldId(slideId, path)", () => {
    const w = mountField({
      descriptor: hero.title,
      value: "The Open Brain",
      path: "props.title",
    });
    expect(w.get("input").attributes("id")).toBe(
      fieldId("intro", "props.title")
    );
    expect(fieldId("intro", "props.title")).toBe(
      "deck-field-intro-props-title"
    );
    w.unmount();
  });

  it("gives each field in a group its own path", () => {
    const w = mountField({
      descriptor: trajectory.chapters,
      value: { live: 1, inProgress: 5, funded: 6, unfunded: 24 },
      path: "props.chapters",
      slideId: "trajectory",
    });
    const ids = w.findAll("input").map((i) => i.attributes("id"));
    expect(ids).toEqual([
      "deck-field-trajectory-props-chapters-live",
      "deck-field-trajectory-props-chapters-inProgress",
      "deck-field-trajectory-props-chapters-funded",
      "deck-field-trajectory-props-chapters-unfunded",
    ]);
    // The group itself can take focus from the Problems drawer.
    expect(w.get("fieldset").attributes("id")).toBe(
      "deck-field-trajectory-props-chapters"
    );
    w.unmount();
  });

  it("emits an int field's edit as a number at its nested path", async () => {
    const w = mountField({
      descriptor: trajectory.chapters,
      value: { live: 1, inProgress: 5, funded: 6, unfunded: 24 },
      path: "props.chapters",
      slideId: "trajectory",
    });
    await w.get("#deck-field-trajectory-props-chapters-live").setValue("2");
    expect(updates(w).at(-1)).toEqual(["props.chapters.live", 2]);
    w.unmount();
  });

  it("puts the id on the radio group for icons and role colours", () => {
    const role = LAYOUT_SCHEMAS.role.fields;
    const icon = mountField({
      descriptor: role.icon,
      value: "notes",
      path: "props.icon",
      slideId: "appendix-creator",
    });
    const group = icon.get('[role="radiogroup"]');
    expect(group.attributes("id")).toBe(
      "deck-field-appendix-creator-props-icon"
    );
    expect(group.get('[aria-checked="true"]').text()).toBe("notes");
    icon.unmount();

    const colour = mountField({
      descriptor: role.role,
      value: "creator",
      path: "props.role",
      slideId: "appendix-creator",
    });
    expect(
      colour.get('[role="radiogroup"]').get('[aria-checked="true"]').text()
    ).toBe("Creator");
    colour.unmount();
  });
});
