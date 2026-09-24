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

  it("saves only what was changed", async () => {
    const w = mountForm();
    await w.get("#fws-states-1").setValue("Short sight");
    await w.get("#fws-video-title").setValue("The Neitzes");
    await saveButton(w).trigger("click");
    expect(w.emitted("save")[0][0]).toEqual({
      title: "Refraction errors",
      content: {
        states: [
          "Normal eye (emmetropia)",
          "Short sight",
          "Hyperopia",
          "Astigmatism",
        ],
        video: {
          title: "The Neitzes",
          text: "Possible causes and cures for myopia",
          slug: "neitz-myopia",
        },
      },
    });
  });

  it("keeps earlier saved edits", async () => {
    const w = mountForm({
      figure: {
        ...figure,
        config: { ...figure.config, content: { toggle: "With glasses" } },
      },
    });
    expect(w.get("#fws-toggle").element.value).toBe("With glasses");
    await saveButton(w).trigger("click");
    expect(w.emitted("save")[0][0].content).toEqual({ toggle: "With glasses" });
  });

  it("replaces the picture from the library and can put the original back", async () => {
    const w = mountForm();
    const choose = w.findAll("button").find((b) => b.text() === "Choose image");
    await choose.trigger("click");
    w.findComponent(MediaPickerStub).vm.$emit("pick", {
      image_file_url: "https://storage.example/bust.jpg",
    });
    await w.vm.$nextTick();
    expect(w.text()).toContain("Replaced.");
    await saveButton(w).trigger("click");
    expect(w.emitted("save")[0][0].content).toEqual({
      image: "https://storage.example/bust.jpg",
    });

    await w
      .findAll("button")
      .find((b) => b.text() === "Use the original")
      .trigger("click");
    await saveButton(w).trigger("click");
    expect(w.emitted("save")[1][0].content).toEqual({});
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
