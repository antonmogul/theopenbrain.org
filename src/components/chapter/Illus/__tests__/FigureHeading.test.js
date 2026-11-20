import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import FigureHeading from "../FigureHeading.vue";

// The full published-reader lane covers every renderer and duplicate label.
// Here check the public record contract, including non-numeric box labels.
describe("FigureHeading", () => {
  it.each([
    [2, "FIG 02"],
    ["24", "FIG 24"],
    ["A", "FIG A"],
  ])(
    "reads %s from the record, once, before its title",
    (figureNumber, label) => {
      const wrapper = mount(FigureHeading, {
        props: { record: { figureNumber, title: "Authored title" } },
      });
      expect(wrapper.get(".figure-heading__label").text()).toBe(label);
      expect(wrapper.get(".figure-heading__title").text()).toBe(
        "Authored title"
      );
      expect(wrapper.element.firstElementChild.textContent).toBe(label);
      expect(wrapper.findAll(".figure-heading__label")).toHaveLength(1);
    }
  );
  it.each([undefined, null, ""])(
    "does not invent a label for %s",
    (figureNumber) => {
      expect(
        mount(FigureHeading, {
          props: { record: { figureNumber, title: "Unnumbered" } },
        })
          .find(".figure-heading")
          .exists()
      ).toBe(false);
    }
  );
});
