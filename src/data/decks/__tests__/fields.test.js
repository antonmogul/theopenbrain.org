/*
 * The field schemas match the slide components they describe (OPENBRAIN-129):
 * a schema per layout, a field per prop, `required` where the component
 * requires it, list bounds the components can draw, and icon names DeckIcon
 * actually has a glyph for.
 */
import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { SLIDE_LAYOUTS } from "@/components/deck/slides/layouts.js";
import ColumnsSlide from "@/components/deck/slides/ColumnsSlide.vue";
import DeckIcon from "@/components/deck/DeckIcon.vue";
import {
  ICON_NAMES,
  LAYOUT_SCHEMAS,
  POSITION_OPTIONS,
  ROLE_OPTIONS,
} from "../fields.js";

const TYPES = new Set([
  "text",
  "longtext",
  "bool",
  "enum",
  "int",
  "icon",
  "roleColor",
  "image",
  "imageSrc",
  "position",
  "mediaUrl",
  "strings",
  "list",
  "group",
  "optional",
]);

// Every descriptor in a schema, nested ones included, with its path.
function* descriptors(fields, base = "") {
  for (const [key, d] of Object.entries(fields)) {
    const path = base ? `${base}.${key}` : key;
    yield [path, d];
    if (d.of) yield* descriptors(d.of, `${path}[]`);
    if (d.fields) yield* descriptors(d.fields, path);
  }
}

describe("LAYOUT_SCHEMAS", () => {
  it("has a schema for every registered layout and no other", () => {
    expect(Object.keys(LAYOUT_SCHEMAS).sort()).toEqual(
      Object.keys(SLIDE_LAYOUTS).sort()
    );
  });

  describe.each(Object.keys(SLIDE_LAYOUTS))("%s", (layout) => {
    const schema = LAYOUT_SCHEMAS[layout];
    const props = SLIDE_LAYOUTS[layout].props;

    it("declares exactly the component's props", () => {
      expect(Object.keys(schema.fields).sort()).toEqual(
        Object.keys(props).sort()
      );
    });

    it("marks required exactly the props the component requires", () => {
      for (const [key, d] of Object.entries(schema.fields))
        expect(Boolean(d.required), key).toBe(Boolean(props[key].required));
    });

    it("describes itself for the gallery", () => {
      expect(schema.label).toBeTruthy();
      expect(["Funding", "Templates"]).toContain(schema.group);
      expect(["dark", "paper"]).toContain(schema.tone);
      expect(schema.description).toBeTruthy();
    });

    it("uses known field types with labels", () => {
      for (const [path, d] of descriptors(schema.fields)) {
        expect(TYPES.has(d.type), `${path}: ${d.type}`).toBe(true);
        expect(d.label, path).toBeTruthy();
        if (d.type === "list") {
          expect(d.of, path).toBeTruthy();
          expect(d.max, path).toBeGreaterThanOrEqual(d.min ?? 0);
          if (d.uniqueBy) expect(d.of).toHaveProperty(d.uniqueBy);
          expect(typeof d.itemLabel, path).toBe("function");
        }
        if (d.type === "enum")
          expect(d.options.length, path).toBeGreaterThan(0);
        if (d.type === "optional") expect(["null", "omit"]).toContain(d.off);
      }
    });

    it("matches the component's enum choices", () => {
      for (const [key, d] of Object.entries(schema.fields)) {
        if (d.type !== "enum" && d.type !== "roleColor") continue;
        const { validator } = props[key];
        for (const { value } of d.options)
          expect(validator ? validator(value) : true, `${key}=${value}`).toBe(
            true
          );
        if (d.default !== undefined) expect(props[key].default).toBe(d.default);
      }
    });
  });

  it("keeps list bounds within what the components accept (columns 2–4)", () => {
    const items = LAYOUT_SCHEMAS.columns.fields.items;
    expect([items.min, items.max]).toEqual([2, 4]);
    const { validator } = ColumnsSlide.props.items;
    const item = { heading: "H", text: "T" };
    expect(validator(Array(items.min).fill(item))).toBe(true);
    expect(validator(Array(items.max).fill(item))).toBe(true);
    expect(validator(Array(items.min - 1).fill(item))).toBe(false);
    expect(validator(Array(items.max + 1).fill(item))).toBe(false);
  });

  it("stores the whole legend when the trajectory's is switched on", () => {
    const legend = LAYOUT_SCHEMAS.trajectory.fields.legend;
    expect(legend.off).toBe("omit");
    expect(Object.keys(legend.defaults).sort()).toEqual(
      Object.keys(legend.fields).sort()
    );
    expect(legend.defaults).toEqual(
      SLIDE_LAYOUTS.trajectory.props.legend.default()
    );
  });

  it("offers the four role colours and three crops", () => {
    expect(ROLE_OPTIONS.map((o) => o.value)).toEqual([
      "creator",
      "professor",
      "student",
      "public",
    ]);
    expect(POSITION_OPTIONS.map((o) => o.value)).toEqual([
      "center top",
      "center",
      "center bottom",
    ]);
  });
});

describe("ICON_NAMES", () => {
  it("has the 18 names the editor offers", () => {
    expect(ICON_NAMES).toHaveLength(18);
    expect(new Set(ICON_NAMES).size).toBe(18);
  });

  // DashboardNavIcon falls back to a plain circle for a name it lacks.
  it.each(ICON_NAMES)(
    "%s has its own glyph, not the fallback circle",
    (name) => {
      const markup = mount(DeckIcon, { props: { name } }).html();
      const fallback = mount(DeckIcon, {
        props: { name: "no-such-icon" },
      }).html();
      expect(markup).not.toBe(fallback);
    }
  );
});
