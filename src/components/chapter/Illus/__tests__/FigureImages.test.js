import { describe, it, expect, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import FigureImages from "../FigureImages.vue";

const SET = [
  { src: "/one.jpg", caption: "First plate", alt: "" },
  { src: "/two.jpg", caption: "", alt: "" },
  { src: "/three.jpg", caption: "Third plate", alt: "Alt three" },
];

let wrapper;
const mountSet = (props = {}) => {
  wrapper = mount(FigureImages, {
    attachTo: document.body,
    props: {
      images: SET,
      caption: "Shared legend",
      label: "FIG 06",
      title: "Cell doctrine",
      ...props,
    },
  });
  return wrapper;
};
const dialog = () => document.querySelector('[role="dialog"]');
const viewerImg = () => dialog()?.querySelector(".figview-img");
const count = () => dialog()?.querySelector(".figview-count")?.textContent;
const key = async (k, opts = {}) => {
  document.dispatchEvent(
    new KeyboardEvent("keydown", { key: k, bubbles: true, ...opts })
  );
  await nextTick();
};

describe("FigureImages", () => {
  afterEach(() => {
    wrapper?.unmount();
    wrapper = null;
    document.body.innerHTML = "";
  });

  it("shows one image on its own, without a gallery or controls", () => {
    wrapper = mount(FigureImages, {
      props: { images: SET.slice(0, 1), caption: "Shared legend" },
    });
    const imgs = wrapper.findAll("img");
    expect(imgs).toHaveLength(1);
    expect(imgs[0].attributes("src")).toBe("/one.jpg");
    expect(imgs[0].attributes("alt")).toBe("First plate");
    expect(wrapper.find(".figimg-caption").text()).toBe("First plate");
    expect(wrapper.find(".figimg-grid").exists()).toBe(false);
    expect(wrapper.find("button").exists()).toBe(false);
    expect(wrapper.attributes("role")).toBeUndefined();
  });

  it("renders every image of a set as a thumbnail button", () => {
    const w = mountSet();
    const thumbs = w.findAll(".figimg-thumb");
    expect(thumbs).toHaveLength(3);
    thumbs.forEach((t) => {
      expect(t.element.tagName).toBe("BUTTON");
      expect(t.attributes("type")).toBe("button");
    });
    expect(
      w.findAll(".figimg-thumb-img").map((i) => i.attributes("src"))
    ).toEqual(["/one.jpg", "/two.jpg", "/three.jpg"]);
    // A real alt on every thumbnail, the image's own when it has one.
    expect(w.findAll(".figimg-thumb-img")[2].attributes("alt")).toBe(
      "Alt three (image 3 of 3)"
    );
    expect(w.findAll(".figimg-thumb-img")[1].attributes("alt")).toBe(
      "FIG 06: Cell doctrine, image 2 of 3"
    );
    // Short captions sit under their thumbnail; the figure legend below.
    expect(w.findAll(".figimg-thumb-cap").map((c) => c.text())).toEqual([
      "First plate",
      "Third plate",
    ]);
    expect(w.find(".figimg-foot .figimg-caption").text()).toBe("Shared legend");
    // No viewer until a thumbnail is chosen, and no autoplay control.
    expect(dialog()).toBeNull();
    expect(w.find('[aria-label*="cycle"]').exists()).toBe(false);
  });

  it("keeps long captions out of the grid", () => {
    const long = "x".repeat(200);
    const w = mountSet({
      images: [
        { src: "/a.jpg", caption: long, alt: "" },
        { src: "/b.jpg", caption: "", alt: "" },
      ],
    });
    expect(w.find(".figimg-thumb-cap").exists()).toBe(false);
    expect(w.text()).not.toContain(long);
  });

  it("opens the viewer on the thumbnail that was clicked", async () => {
    const w = mountSet();
    await w.findAll(".figimg-thumb")[1].trigger("click");
    const d = dialog();
    expect(d).not.toBeNull();
    expect(d.getAttribute("aria-modal")).toBe("true");
    const labelledBy = d.getAttribute("aria-labelledby");
    expect(document.getElementById(labelledBy).textContent).toContain(
      "Cell doctrine"
    );
    expect(viewerImg().getAttribute("src")).toBe("/two.jpg");
    expect(count().trim()).toBe("2 / 3");
    // Image 2 has no caption of its own: the figure legend stands in.
    expect(d.querySelector(".figview-caption").textContent.trim()).toBe(
      "Shared legend"
    );
    // The filmstrip marks the current image.
    const strip = [...d.querySelectorAll(".figview-strip-thumb")];
    expect(strip).toHaveLength(3);
    expect(strip[1].getAttribute("aria-current")).toBe("true");
    expect(strip[0].getAttribute("aria-current")).toBeNull();
    // Body scroll is locked while it is open.
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("steps with the arrow keys and the buttons, wrapping at the ends", async () => {
    const w = mountSet();
    await w.findAll(".figimg-thumb")[0].trigger("click");
    await key("ArrowLeft");
    expect(count().trim()).toBe("3 / 3");
    expect(viewerImg().getAttribute("alt")).toBe("Alt three");
    await key("ArrowRight");
    expect(count().trim()).toBe("1 / 3");
    dialog().querySelector('[aria-label="Next image"]').click();
    await nextTick();
    expect(count().trim()).toBe("2 / 3");
    dialog().querySelector('[aria-label="Previous image"]').click();
    await nextTick();
    expect(count().trim()).toBe("1 / 3");
    dialog().querySelectorAll(".figview-strip-thumb")[2].click();
    await nextTick();
    expect(viewerImg().getAttribute("src")).toBe("/three.jpg");
  });

  it("closes on Esc, unlocks scroll and returns focus to the thumbnail", async () => {
    const w = mountSet();
    const thumb = w.findAll(".figimg-thumb")[2];
    await thumb.trigger("click");
    await nextTick();
    expect(document.activeElement?.getAttribute("aria-label")).toBe(
      "Close viewer"
    );
    await key("ArrowRight");
    await key("Escape");
    expect(dialog()).toBeNull();
    expect(document.body.style.overflow).toBe("");
    expect(document.activeElement).toBe(thumb.element);
  });

  it("does not let Esc reach listeners outside the viewer", async () => {
    let outside = 0;
    const onKey = (e) => e.key === "Escape" && outside++;
    window.addEventListener("keydown", onKey);
    const w = mountSet();
    await w.findAll(".figimg-thumb")[0].trigger("click");
    await key("Escape");
    window.removeEventListener("keydown", onKey);
    expect(outside).toBe(0);
  });

  it("traps Tab inside the viewer", async () => {
    const w = mountSet();
    await w.findAll(".figimg-thumb")[0].trigger("click");
    await nextTick();
    const buttons = [...dialog().querySelectorAll("button")];
    const last = buttons[buttons.length - 1];
    last.focus();
    await key("Tab");
    expect(document.activeElement).toBe(buttons[0]);
    await key("Tab", { shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  it("closes with its close button", async () => {
    const w = mountSet();
    await w.findAll(".figimg-thumb")[1].trigger("click");
    dialog().querySelector('[aria-label="Close viewer"]').click();
    await nextTick();
    expect(dialog()).toBeNull();
  });
});
