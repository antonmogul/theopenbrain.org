/*
 * BreakoutBox treatment (OPENBRAIN-153): the frame marks itself
 * data-treatment from the chapter TextComp provides and the box's slug,
 * a section's own treatment or the prop wins, and the pale card keeps its
 * badge while a panel drops it (the kicker carries the letter).
 */
import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { computed } from "vue";
import BreakoutBox from "../BreakoutBox.vue";

const mountBox = ({ section, chapterSlug = null, props = {} } = {}) =>
  mount(BreakoutBox, {
    props: { section, label: "B", ...props },
    slots: { default: "<p>Body</p>" },
    global: {
      provide: { chapterSlug: computed(() => chapterSlug) },
      stubs: { Teleport: true },
    },
  });

describe("BreakoutBox treatment", () => {
  it("renders a History box as the dark panel, letter in the kicker only", () => {
    const w = mountBox({
      section: { id: "s1", slug: "box-descartes", title: "Descartes" },
      chapterSlug: "foundations-of-neuroscience",
    });
    const aside = w.find("aside.bx");
    expect(aside.attributes("data-treatment")).toBe("dark");
    expect(aside.classes()).toContain("bx--panel");
    expect(w.find(".bx-pause").attributes("data-treatment")).toBe("dark");
    expect(w.find(".bx-badge").exists()).toBe(false);
    expect(w.find(".bx-kicker").text()).toBe("Breakout box B");
    expect(w.find("h2").text()).toBe("Descartes");
  });

  it("keeps another chapter's box the pale card with its badge", () => {
    const w = mountBox({
      section: { id: "s2", slug: "box-descartes", title: "Elsewhere" },
      chapterSlug: "the-retina",
    });
    const aside = w.find("aside.bx");
    expect(aside.attributes("data-treatment")).toBe("pale");
    expect(aside.classes()).not.toContain("bx--panel");
    expect(w.find(".bx-badge").text()).toBe("B");
  });

  it("is pale with no chapter provided (stories, tests)", () => {
    const w = mount(BreakoutBox, {
      props: { section: { id: "s3", slug: "box-ngf", title: "NGF" } },
      global: { stubs: { Teleport: true } },
    });
    expect(w.find("aside.bx").attributes("data-treatment")).toBe("pale");
  });

  it("lets the section's own treatment and then the prop override the map", () => {
    const own = mountBox({
      section: {
        id: "s4",
        slug: "box-ngf",
        title: "NGF",
        treatment: "violet",
      },
      chapterSlug: "foundations-of-neuroscience",
    });
    expect(own.find("aside.bx").attributes("data-treatment")).toBe("violet");
    const prop = mountBox({
      section: { id: "s5", slug: "box-ngf", title: "NGF", treatment: "dark" },
      chapterSlug: "foundations-of-neuroscience",
      props: { treatment: "pale" },
    });
    expect(prop.find("aside.bx").attributes("data-treatment")).toBe("pale");
    expect(prop.find(".bx-badge").exists()).toBe(true);
  });
});
