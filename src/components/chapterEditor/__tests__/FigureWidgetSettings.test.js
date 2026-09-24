import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import FigureWidgetSettings from "../FigureWidgetSettings.vue";

// The modal teleports to <body>; render its slots in place instead.
const BaseModalStub = {
  name: "BaseModal",
  props: ["modelValue", "title"],
  template:
    '<div v-if="modelValue" class="modal"><h2>{{ title }}</h2><slot /><slot name="footer" /></div>',
};
const MediaPickerStub = {
  name: "MediaPicker",
  props: ["open"],
  emits: ["pick", "close", "uploaded"],
  template: '<div v-if="open" class="picker" />',
};

const figure = {
  id: "fig-1",
  title: "Refraction errors",
  animation_key: "animationImpairedVision",
  config: { toggle: "Corrected", infoText: "Row intro", fullscreen: true },
};
const states = [
  "Normal eye (emmetropia)",
  "Myopia",
  "Hyperopia",
  "Astigmatism",
];

function mountForm(props = {}) {
  return mount(FigureWidgetSettings, {
    props: { open: true, figure, states, ...props },
    global: {
      stubs: {
        BaseModal: BaseModalStub,
        MediaPicker: MediaPickerStub,
        Button: {
          props: ["disabled"],
          emits: ["click"],
          template:
            '<button type="button" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
        },
      },
    },
  });
}
const saveButton = (w) =>
  w.findAll("button").find((b) => b.text() === "Save figure");

describe("FigureWidgetSettings", () => {
  it("builds its form from the widget's schema, filled from the figure", () => {
    const w = mountForm();
    expect(w.get("h2").text()).toBe("Refraction errors: figure settings");
    expect(w.get("#fws-title").element.value).toBe("Refraction errors");
    expect(w.get("#fws-infoText").element.value).toBe("Row intro");
    expect(w.get("#fws-states-1").element.value).toBe("Myopia");
    expect(w.get("#fws-video-slug").element.value).toBe("neitz-myopia");
  });

  it("saves only what was changed, list items one by one", async () => {
    const w = mountForm();
    await w.get("#fws-states-1").setValue("Short sight");
    await w.get("#fws-video-title").setValue("The Neitzes");
    await saveButton(w).trigger("click");
    expect(w.emitted("save")[0][0]).toEqual({
      title: "Refraction errors",
      content: {
        // Unchanged steps stay null, so they keep following the database.
        states: [null, "Short sight"],
        video: { title: "The Neitzes" },
      },
    });
  });

  it("can't save until something changes", async () => {
    const w = mountForm();
    expect(saveButton(w).attributes("disabled")).toBeDefined();
    await w.get("#fws-toggle").setValue("With glasses");
    expect(saveButton(w).attributes("disabled")).toBeUndefined();
    await w.get("#fws-toggle").setValue("Corrected");
    expect(saveButton(w).attributes("disabled")).toBeDefined();
  });

  it("keeps earlier saved edits", async () => {
    const w = mountForm({
      figure: {
        ...figure,
        config: {
          ...figure.config,
          content: { toggle: "With glasses", states: [null, "Short sight"] },
        },
      },
    });
    expect(w.get("#fws-toggle").element.value).toBe("With glasses");
    expect(w.get("#fws-states-1").element.value).toBe("Short sight");
    await w.get("#fws-title").setValue("Refraction");
    await saveButton(w).trigger("click");
    expect(w.emitted("save")[0][0]).toEqual({
      title: "Refraction",
      content: { toggle: "With glasses", states: [null, "Short sight"] },
    });
  });

  it("drops an edit set back to what the figure shows anyway", async () => {
    const w = mountForm({
      figure: {
        ...figure,
        config: { ...figure.config, content: { toggle: "With glasses" } },
      },
    });
    await w.get("#fws-toggle").setValue("Corrected");
    await saveButton(w).trigger("click");
    expect(w.emitted("save")[0][0].content).toEqual({});
  });

  it("switches an optional part off, and back on", async () => {
    const w = mountForm();
    await w.get("#fws-video-on").setValue(false);
    expect(w.find("#fws-video-title").exists()).toBe(false);
    await saveButton(w).trigger("click");
    expect(w.emitted("save")[0][0].content).toEqual({ video: false });

    const again = mountForm({
      figure: {
        ...figure,
        config: { ...figure.config, content: { video: false } },
      },
    });
    expect(again.get("#fws-video-on").element.checked).toBe(false);
    await again.get("#fws-video-on").setValue(true);
    expect(again.get("#fws-video-title").element.value).toBe(
      "Maureen and Jay Neitz"
    );
    await saveButton(again).trigger("click");
    expect(again.emitted("save")[0][0].content).toEqual({});
  });

  it("replaces the picture from the library with its full URL", async () => {
    const w = mountForm();
    const choose = w.findAll("button").find((b) => b.text() === "Choose image");
    await choose.trigger("click");
    w.findComponent(MediaPickerStub).vm.$emit("pick", {
      image_file_url: "/publicAssets/images/bust.jpg",
    });
    await w.vm.$nextTick();
    expect(w.text()).toContain("Replaced.");
    await saveButton(w).trigger("click");
    expect(w.emitted("save")[0][0].content).toEqual({
      image: "/publicAssets/images/bust.jpg",
    });

    await w
      .findAll("button")
      .find((b) => b.text() === "Use the original")
      .trigger("click");
    expect(saveButton(w).attributes("disabled")).toBeDefined();
  });

  it("won't save without a title", async () => {
    const w = mountForm();
    await w.get("#fws-title").setValue("  ");
    expect(saveButton(w).attributes("disabled")).toBeDefined();
  });

  it("says so for a figure without a widget", () => {
    const w = mountForm({
      figure: { ...figure, animation_key: "animationEyeStructur" },
    });
    expect(w.text()).toContain("no settings of its own");
  });
});
