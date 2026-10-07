/*
 * DeckListField (OPENBRAIN-129): a list can't grow past what the layout's
 * grid draws or shrink below its minimum, and says why; repeated keys are
 * flagged on the item.
 */
import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import { LAYOUT_SCHEMAS } from "@/data/decks/fields.js";
import { FUNDING_DECK } from "@/data/decks/funding.js";
import DeckListField from "../DeckListField.vue";

const columns = LAYOUT_SCHEMAS.columns.fields.items;
const milestones = LAYOUT_SCHEMAS.trajectory.fields.milestones;
const people = LAYOUT_SCHEMAS.team.fields.people;
const features = LAYOUT_SCHEMAS.audience.fields.roles.of.features;

const column = (heading) => ({ heading, text: "Supporting paragraph." });
const mountList = (props) =>
  mount(DeckListField, {
    props: {
      slideId: "s-1",
      problems: [],
      deckId: "0b4f6d1e-5c2a-4c1e-9d3b-1a2b3c4d5e6f",
      ...props,
    },
  });
const addButton = (w) => w.get(".deck-list__add");
const removeButtons = (w) => w.findAll('[data-action="remove"]');

describe("DeckListField · limits", () => {
  it("disables Add at the maximum and says why", async () => {
    const w = mountList({
      descriptor: columns,
      value: ["A", "B", "C", "D"].map(column),
      path: "props.items",
    });
    expect(addButton(w).attributes("aria-disabled")).toBe("true");
    const reason = w.get(".deck-list__reason");
    expect(reason.text()).toBe("Columns: up to 4.");
    expect(addButton(w).attributes("aria-describedby")).toBe(
      reason.attributes("id")
    );
    await addButton(w).trigger("click");
    expect(w.emitted("update")).toBeUndefined();
  });

  it("names the designed count beside the maximum", () => {
    const entry = FUNDING_DECK.find((e) => e.id === "trajectory");
    const w = mountList({
      descriptor: milestones,
      value: entry.props.milestones,
      path: "props.milestones",
    });
    expect(w.get(".deck-list__reason").text()).toBe(
      "Milestones: up to 3 (designed for 3)."
    );
  });

  it("disables Remove at the minimum and says why", async () => {
    const w = mountList({
      descriptor: columns,
      value: ["A", "B"].map(column),
      path: "props.items",
    });
    expect(removeButtons(w)).toHaveLength(2);
    for (const b of removeButtons(w))
      expect(b.attributes("aria-disabled")).toBe("true");
    expect(w.get(".deck-list__reason").text()).toBe(
      "Columns take 2 to 4 items."
    );
    await removeButtons(w)[0].trigger("click");
    expect(w.emitted("update")).toBeUndefined();
    // Add is still allowed.
    expect(addButton(w).attributes("aria-disabled")).toBeUndefined();
  });

  it("adds, removes and moves between the limits", async () => {
    const w = mountList({
      descriptor: columns,
      value: ["A", "B", "C"].map(column),
      path: "props.items",
    });
    expect(w.find(".deck-list__reason").exists()).toBe(false);

    await addButton(w).trigger("click");
    let [path, next] = w.emitted("update").at(-1);
    expect(path).toBe("props.items");
    expect(next).toHaveLength(4);
    expect(next[3].heading).toBe("Heading");

    await removeButtons(w)[1].trigger("click");
    [, next] = w.emitted("update").at(-1);
    expect(next.map((c) => c.heading)).toEqual(["A", "C"]);

    await w.findAll('[data-action="down"]')[0].trigger("click");
    [, next] = w.emitted("update").at(-1);
    expect(next.map((c) => c.heading)).toEqual(["B", "A", "C"]);
  });
});

describe("DeckListField · duplicates", () => {
  it("flags an item whose name repeats an earlier one", () => {
    const w = mountList({
      descriptor: people,
      value: [
        { name: "Stuart Trenholm", role: "Founder" },
        { name: "Sheena Josselyn", role: "Co-lead editor" },
        { name: "Stuart Trenholm", role: "Again" },
      ],
      path: "props.people",
    });
    const cards = w.findAll(".deck-list__item");
    expect(cards[0].classes()).not.toContain("is-duplicate");
    expect(cards[2].classes()).toContain("is-duplicate");
    expect(cards[2].text()).toContain("Same name as 1");
  });

  it("flags a repeated string in a unique list", () => {
    const w = mountList({
      descriptor: features,
      value: ["Highlights", "Notes", "Highlights"],
      path: "props.roles.2.features",
    });
    const items = w.findAll(".deck-list__item");
    expect(items[2].classes()).toContain("is-duplicate");
    expect(items[2].text()).toContain("Same as item 1");
    expect(items[1].classes()).not.toContain("is-duplicate");
  });

  it("gives a duplicated item a name of its own", async () => {
    const w = mountList({
      descriptor: people,
      value: [{ name: "Tyler", role: "Role to confirm" }],
      path: "props.people",
    });
    await w.get('[data-action="duplicate"]').trigger("click");
    const [, next] = w.emitted("update").at(-1);
    expect(next.map((p) => p.name)).toEqual(["Tyler", "Tyler copy"]);
  });
});

describe("DeckListField · items", () => {
  it("passes each object item and its path to the item slot", () => {
    const w = mount(DeckListField, {
      props: {
        descriptor: people,
        value: [{ name: "Sonia" }, { name: "Tyler" }],
        path: "props.people",
        slideId: "team",
      },
      slots: {
        item: `<template #item="{ item, path }"><p class="slot">{{ path }}={{ item.name }}</p></template>`,
      },
    });
    expect(w.findAll(".slot").map((p) => p.text())).toEqual([
      "props.people.0=Sonia",
      "props.people.1=Tyler",
    ]);
  });

  it("ids each string input by its path", () => {
    const w = mountList({
      descriptor: features,
      value: ["Highlights", "Notes"],
      path: "props.roles.2.features",
      slideId: "users",
    });
    expect(w.findAll("input").map((i) => i.attributes("id"))).toEqual([
      "deck-field-users-props-roles-2-features-0",
      "deck-field-users-props-roles-2-features-1",
    ]);
  });
});

describe("DeckListField · items keep their state", () => {
  // The parent writes each update back, as DeckField and the editor do.
  const mountLive = (value) => {
    const w = mount(DeckListField, {
      props: {
        slideId: "s-1",
        problems: [],
        descriptor: columns,
        value,
        path: "props.items",
        onUpdate: (path, next) => w.setProps({ value: next }),
      },
      slots: {
        item: `<template #item="{ item }"><input class="probe" :value="item.heading" /></template>`,
      },
      attachTo: document.body,
    });
    return w;
  };
  const cards = (w) =>
    w.findAll(".deck-list__item").map((li) => ({
      title: li.get(".deck-list__title").text(),
      open: li.get(".deck-list__toggle").attributes("aria-expanded") === "true",
    }));

  it("keeps a collapsed card collapsed when it moves", async () => {
    const w = mountLive(["A", "B", "C"].map(column));
    await w.findAll(".deck-list__toggle")[0].trigger("click");
    const first = w.findAll(".deck-list__item")[0].element;
    await w.findAll('[data-action="down"]')[0].trigger("click");
    expect(cards(w)).toEqual([
      { title: "B", open: true },
      { title: "A", open: false },
      { title: "C", open: true },
    ]);
    // The card itself moved (its fields too: an upload in one follows it).
    expect(w.findAll(".deck-list__item")[1].element).toBe(first);
    w.unmount();
  });

  it("opens a new card where a collapsed one was removed", async () => {
    const w = mountLive(["A", "B", "C"].map(column));
    await w.findAll(".deck-list__toggle")[2].trigger("click");
    await w.findAll('[data-action="remove"]')[2].trigger("click");
    await w.get(".deck-list__add").trigger("click");
    expect(cards(w).map((c) => c.open)).toEqual([true, true, true]);
    w.unmount();
  });

  it("opens a closed card when a field inside it asks", async () => {
    const w = mountLive(["A", "B"].map(column));
    await w.findAll(".deck-list__toggle")[1].trigger("click");
    w.findAll(".probe")[1].element.dispatchEvent(
      new CustomEvent("deck-reveal", { bubbles: true })
    );
    await w.vm.$nextTick();
    expect(cards(w).map((c) => c.open)).toEqual([true, true]);
    w.unmount();
  });
});
