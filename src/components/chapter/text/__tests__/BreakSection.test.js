import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import BreakSection from "../BreakSection.vue";
import { breakSectionDirections } from "@/helper/breakSectionPresentation";
const mountDemo = (content) =>
  mount(BreakSection, {
    props: { content },
    global: {
      stubs: {
        FullBleed: {
          name: "FullBleed",
          props: { viewport: Boolean },
          template: "<div><slot /></div>",
        },
      },
    },
  });
describe("BreakSection experiments", () => {
  it("starts with explanation open and toggles one instance without affecting another", async () => {
    const content = {
      title: "Blind spot",
      text: "Eye explanation",
      steps: ["Fixate ‘B’ until ‘A’ disappears."],
    };
    const parent = mount(
      {
        components: { BreakSection },
        setup: () => ({ content }),
        template:
          '<div><BreakSection :content="content" /><BreakSection :content="content" /></div>',
      },
      {
        global: {
          stubs: {
            FullBleed: {
              name: "FullBleed",
              props: { viewport: Boolean },
              template: "<div><slot /></div>",
            },
          },
        },
      }
    );
    const [a, b] = parent.findAllComponents(BreakSection);
    const button = a.get("button");
    expect(button.attributes("aria-expanded")).toBe("true");
    expect(button.attributes("aria-controls")).not.toBe(
      b.get("button").attributes("aria-controls")
    );
    expect(a.findComponent({ name: "FullBleed" }).props("viewport")).toBe(true);
    expect(
      a.findAll(".blind-targets img").map((i) => i.attributes("src"))
    ).toEqual([
      "/publicAssets/images/blindSpot/Man_A.png",
      "/publicAssets/images/blindSpot/Dragon_B.png",
    ]);
    expect(a.get(".blind-diagram").attributes("alt")).toContain("optic nerve");
    expect(a.text()).toContain("fix your right eye’s gaze on the man");
    await button.trigger("click");
    expect(button.attributes("aria-expanded")).toBe("false");
    expect(a.get(".break-info").attributes("style")).toContain("display: none");
    expect(b.get("button").attributes("aria-expanded")).toBe("true");
    await button.trigger("click");
    expect(button.attributes("aria-expanded")).toBe("true");
    parent.unmount();
  });
  it("preserves the colour plate and doesn't assign an experiment to other breaks", () => {
    const plate = mountDemo({
      title: "Color blindness",
      text: "Plate directions",
    });
    expect(plate.find(".color-plate").exists()).toBe(true);
    expect(plate.find(".blind-targets").exists()).toBe(false);
    plate.unmount();
    const other = mountDemo({
      title: "A different break",
      text: "Other content",
    });
    expect(other.find("button").exists()).toBe(false);
    expect(other.find(".break-art").exists()).toBe(false);
    expect(other.text()).toContain("Other content");
    other.unmount();
  });
  it("keeps explicitly authored directions that already name the real targets", () => {
    const content = { title: "Blind spot", steps: ["Look at the dragon."] };
    expect(breakSectionDirections(content)).toBe(content.steps);
  });
});
