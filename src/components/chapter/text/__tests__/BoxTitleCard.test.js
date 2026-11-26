/*
 * BoxTitleCard (OPENBRAIN-77): what each variant renders, what its two
 * buttons ask for, and that a pinned card follows the progress it is
 * given. How it looks and moves is checked in a browser.
 */
import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import BoxTitleCard from "../BoxTitleCard.vue";

const base = {
  title: "Hippocrates: the sacred disease and the four humours",
  excerpt: "It is thus with regard to the disease called Sacred.",
  picture: { src: "/img/bust.jpg", alt: "A bust" },
};
const card = (props = {}) =>
  mount(BoxTitleCard, {
    props: { ...base, ...props },
    attachTo: document.body,
  });

describe("BoxTitleCard", () => {
  it("uses layers only when pinned and a flat original on phones or reduced motion", async () => {
    const w = card({
      variant: "pinned",
      layers: [
        { src: "/back.webp", depth: 0 },
        { src: "/front.webp", depth: 1 },
      ],
    });
    expect(w.findAll("[data-card-layer]")).toHaveLength(2);
    w.vm.drive({ progress: 0.5 });
    expect(w.findAll("[data-card-layer]")[1].element.style.transform).toContain(
      "-28.00px"
    );
    for (const variant of ["static", "simple"]) {
      await w.setProps({ variant });
      expect(w.findAll("[data-card-layer]")).toHaveLength(0);
      expect(w.get("[data-card-flat]").attributes("src")).toBe(
        base.picture.src
      );
    }
    await w.setProps({ picture: { src: "", alt: "Composite" } });
    expect(w.findAll("[data-card-composite]")).toHaveLength(2);
    expect(w.findAll("[data-card-composite]")[1].element.style.transform).toBe(
      ""
    );
    w.unmount();
  });
  it("shows the picture, the title, the quotation, more and Skip", async () => {
    const wrapper = card({ variant: "static" });
    expect(wrapper.attributes("data-card-variant")).toBe("static");
    expect(wrapper.attributes("data-card-state")).toBeUndefined();
    // Authored title-card artwork can differ from the track figure.
    expect(wrapper.get("img").attributes("alt")).toBe("A bust");
    expect(wrapper.get(".tc-title").attributes("aria-hidden")).toBe("true");
    expect(wrapper.get(".tc-excerpt").text()).toBe(base.excerpt);
    await wrapper.get("[data-card-more]").trigger("click");
    await wrapper.get("[data-card-skip]").trigger("click");
    expect(wrapper.emitted("more")).toHaveLength(1);
    expect(wrapper.emitted("skip")).toHaveLength(1);
    expect(wrapper.get("[data-card-skip]").text()).toContain("Skip");
    wrapper.unmount();
  });

  it("offers the picture full screen when it is the only place it shows", async () => {
    const wrapper = card({ variant: "simple", expandable: true });
    await wrapper.get("[data-card-expand]").trigger("click");
    expect(wrapper.emitted("expand")).toHaveLength(1);
    wrapper.unmount();
    // Over the pinned box the track's own picture has the button.
    const pinned = card({ variant: "pinned", expandable: true });
    expect(pinned.find("[data-card-expand]").exists()).toBe(false);
    pinned.unmount();
  });

  it("is the picture, the title and Skip on a phone", () => {
    const wrapper = card({ variant: "simple" });
    expect(wrapper.find(".tc-excerpt").exists()).toBe(false);
    expect(wrapper.find("[data-card-more]").exists()).toBe(false);
    expect(wrapper.find("[data-card-skip]").exists()).toBe(true);
    expect(wrapper.find("[data-card-expand]").exists()).toBe(false);
    wrapper.unmount();
  });

  it("follows its progress when pinned, and is out of the way at the end", async () => {
    const wrapper = card({ variant: "pinned", progress: 0 });
    await wrapper.vm.$nextTick();
    expect(wrapper.attributes("data-card-state")).toBe("open");
    expect(wrapper.element.style.getPropertyValue("--tc-copy")).toBe("0.000");
    await wrapper.setProps({ progress: 0.6 });
    expect(wrapper.element.style.getPropertyValue("--tc-copy")).toBe("0.000");
    expect(wrapper.attributes("data-card-state")).toBe("open");
    await wrapper.setProps({ progress: 1 });
    expect(wrapper.attributes("data-card-state")).toBe("done");
    wrapper.unmount();
  });

  it("waits for the box to be near before the words come in, and hides the track's own picture while it flies", () => {
    const wrapper = card({ variant: "pinned" });
    wrapper.vm.drive({ progress: -0.5, near: false });
    expect(wrapper.attributes("data-card-state")).toBe("arriving");
    // A landing place with a size: the picture flies to it.
    const plate = document.createElement("div");
    plate.setAttribute("data-rail-plate", "");
    const img = document.createElement("img");
    plate.appendChild(img);
    document.body.appendChild(plate);
    img.getBoundingClientRect = () => ({
      left: 60,
      top: 200,
      width: 300,
      height: 400,
    });
    wrapper.element.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: 1000,
      height: 800,
    });
    wrapper.vm.drive({ progress: 0.7, target: img });
    expect(plate.style.visibility).toBe("hidden");
    const pic = wrapper.get(".tc-picture").element;
    expect(pic.style.transform).toContain("translate3d(");
    expect(pic.style.transform).toContain("scale(");
    expect(pic.style.width).toBe("");
    wrapper.vm.drive({ progress: 1, target: img });
    expect(plate.style.visibility).toBe("");
    expect(pic.style.transform).toBe("");
    wrapper.unmount();
    plate.remove();
  });
});
