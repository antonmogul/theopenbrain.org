/*
 * DeckSlideForm (OPENBRAIN-129): switching layout names what would be lost
 * before it happens, and the trajectory slide's helpers write the summary
 * from the counts and read the catalog only when asked.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { FUNDING_DECK } from "@/data/decks/funding.js";
import { DECK_TEMPLATES } from "@/data/decks/templates.js";
import { LAYOUT_SCHEMAS } from "@/data/decks/fields.js";
import { defaultsFor, fieldId } from "@/data/decks/validate.js";
import DeckSlideForm from "../DeckSlideForm.vue";

const BUNDLED_ENTRIES = [...FUNDING_DECK, ...DECK_TEMPLATES];

const fetchCatalog = vi.fn();
vi.mock("@/composables/useChapterCatalog.js", () => ({
  useChapterCatalog: () => ({ fetchCatalog }),
}));

const entry = (id) => structuredClone(FUNDING_DECK.find((e) => e.id === id));
const mountForm = (props) =>
  mount(DeckSlideForm, {
    props: {
      problems: [],
      position: 1,
      total: 9,
      deckId: "0b4f6d1e-5c2a-4c1e-9d3b-1a2b3c4d5e6f",
      ...props,
    },
    global: { stubs: { teleport: true } },
    attachTo: document.body,
  });

beforeEach(() => fetchCatalog.mockReset());

describe("DeckSlideForm · layout", () => {
  it("lists the fields a layout switch would drop, then switches", async () => {
    const w = mountForm({ entry: entry("intro") });
    const select = w.get(`#deck-field-intro-layout`);
    await select.setValue("columns");

    // Nothing has changed yet: the select still shows the hero layout.
    expect(w.emitted("change-layout")).toBeUndefined();
    expect(select.element.value).toBe("hero");
    const dialog = w.get(".modal-root");
    expect(dialog.text()).toContain("Switch to Columns?");
    for (const name of ["Kicker", "Lead", "Footnote", "Image"])
      expect(dialog.text()).toContain(name);

    const confirm = dialog
      .findAll("button")
      .find((b) => b.text() === "Switch layout");
    await confirm.trigger("click");
    expect(w.emitted("change-layout")).toEqual([["columns"]]);
    w.unmount();
  });

  it("keeps the layout when the switch is cancelled", async () => {
    const w = mountForm({ entry: entry("intro") });
    await w.get(`#deck-field-intro-layout`).setValue("columns");
    const cancel = w
      .get(".modal-root")
      .findAll("button")
      .find((b) => b.text() === "Cancel");
    await cancel.trigger("click");
    expect(w.emitted("change-layout")).toBeUndefined();
    expect(w.find(".modal-root").exists()).toBe(false);
    w.unmount();
  });

  it("switches at once when nothing would be lost", async () => {
    const statement = {
      id: "s-quote",
      label: "Quote",
      layout: "statement",
      props: { quote: "Free, forever, for anyone." },
    };
    const w = mountForm({ entry: statement });
    await w.get("#deck-field-s-quote-layout").setValue("quote");
    expect(w.emitted("change-layout")).toEqual([["quote"]]);
    expect(w.find(".modal-root").exists()).toBe(false);
    w.unmount();
  });

  it("draws one field per prop in schema order", () => {
    const w = mountForm({ entry: entry("team") });
    expect(w.find("#deck-field-team-props-eyebrow").exists()).toBe(true);
    expect(w.find("#deck-field-team-props-title").exists()).toBe(true);
    expect(w.find("#deck-field-team-props-people").exists()).toBe(true);
    expect(w.find("#deck-field-team-props-people-0-name").exists()).toBe(true);
    w.unmount();
  });
});

describe("DeckSlideForm · trajectory helpers", () => {
  const trajectory = () => {
    const e = entry("trajectory");
    e.props.chapters = { live: 2, inProgress: 5, funded: 6, unfunded: 23 };
    return e;
  };

  it("writes the summary from the counts", async () => {
    const w = mountForm({ entry: trajectory() });
    expect(w.text()).toContain("36 chapters in all");
    const write = w
      .findAll("button")
      .find((b) => b.text() === "Write summary from counts");
    await write.trigger("click");
    expect(w.emitted("update").at(-1)).toEqual([
      "props.summary",
      "23 of 36 chapters still need funding",
    ]);
    w.unmount();
  });

  it("checks the catalog only when asked, then offers its count", async () => {
    fetchCatalog.mockResolvedValue([{ id: "a" }, { id: "b" }, { id: "c" }]);
    const w = mountForm({ entry: trajectory() });
    expect(fetchCatalog).not.toHaveBeenCalled();

    const check = w
      .findAll("button")
      .find((b) => b.text() === "Check the catalog");
    await check.trigger("click");
    await flushPromises();
    expect(fetchCatalog).toHaveBeenCalledTimes(1);
    expect(w.text()).toContain("3 chapters are published");

    const use = w.findAll("button").find((b) => b.text() === "Use");
    await use.trigger("click");
    expect(w.emitted("update").at(-1)).toEqual(["props.chapters.live", 3]);
    w.unmount();
  });
});

describe("DeckSlideForm · slide settings", () => {
  it("edits the label, hidden flag and speaker notes at entry paths", async () => {
    const w = mountForm({ entry: entry("team") });
    await w.get("#deck-field-team-label").setValue("The team");
    await w.get("#deck-field-team-hidden").trigger("click");
    await w.get("#deck-field-team-notes").setValue("Say hello.");
    expect(w.emitted("update")).toEqual([
      ["label", "The team"],
      ["hidden", true],
      ["notes", "Say hello."],
    ]);
    w.unmount();
  });
});

describe("DeckSlideForm · slide id", () => {
  it("refuses an id another slide already uses", async () => {
    const w = mountForm({
      entry: entry("team"),
      takenIds: ["intro", "textbook-today"],
    });
    w.get("details.deck-slide-form__advanced").element.setAttribute("open", "");
    const input = w.get("#deck-field-team-id");
    // setValue fires input and change, as typing and leaving the field do.
    await input.setValue("intro");
    expect(w.text()).toContain("Another slide already uses this id.");
    expect(input.attributes("aria-invalid")).toBe("true");
    expect(w.emitted("update")).toBeUndefined();

    await input.setValue("people");
    expect(w.emitted("update")?.[0]).toEqual(["id", "people"]);
    w.unmount();
  });
});

describe("DeckSlideForm · ids", () => {
  // Every element id in the form is unique, for every bundled slide and a
  // blank one of each layout with its optional groups on: two elements with
  // one id send a Problems jump to the wrong one (or to nothing focusable).
  const all = [
    ...BUNDLED_ENTRIES,
    ...Object.keys(LAYOUT_SCHEMAS).map((layout) => {
      const props = defaultsFor(layout);
      for (const [key, d] of Object.entries(LAYOUT_SCHEMAS[layout].fields))
        if (d.type === "optional")
          props[key] = structuredClone(d.defaults ?? {});
      return { id: `blank-${layout}`, label: layout, layout, props };
    }),
  ];
  it.each(all.map((e) => [e.id, e]))("has unique ids on %s", (_, e) => {
    const w = mountForm({ entry: structuredClone(e) });
    const ids = [...w.element.querySelectorAll("[id]")].map((el) => el.id);
    const repeated = ids.filter((id, i) => ids.indexOf(id) !== i);
    expect(repeated).toEqual([]);
    w.unmount();
  });

  it("sends a jump to an imageSrc or a group's label field to its input", () => {
    const phones = structuredClone(
      BUNDLED_ENTRIES.find((e) => e.layout === "phones")
    );
    const w = mountForm({ entry: phones });
    const el = document.getElementById(
      fieldId(phones.id, "props.screens.0.src")
    );
    expect(el.tagName).toBe("INPUT");
    w.unmount();

    const text = {
      id: "t",
      label: "Text",
      layout: "text",
      props: {
        ...defaultsFor("text"),
        note: { label: "Note", text: "A sidebar note." },
      },
    };
    const w2 = mountForm({ entry: text });
    expect(
      document.getElementById(fieldId("t", "props.note.label")).tagName
    ).toBe("INPUT");
    w2.unmount();
  });
});
