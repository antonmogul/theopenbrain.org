import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import BoxCardEditor from "../BoxCardEditor.vue";
const value = {
  image: { src: "/flat.webp", alt: "Painting" },
  layers: [{ src: "/front.webp", depth: 0.5 }],
};
describe("title card editor", () => {
  it("saves depth once per committed change, with no blur duplicate", async () => {
    const w = mount(BoxCardEditor, {
      props: { value },
      global: { stubs: { MediaPicker: true } },
    });
    const input = w.get("input[type=number]");
    await input.setValue("0.8");
    await input.trigger("blur");
    expect(w.emitted("change")).toHaveLength(1);
    expect(w.emitted("change")[0][0].layers[0].depth).toBe(0.8);
    await w.get('[aria-label="Remove layer 1"]').trigger("click");
    expect(w.emitted("change")).toHaveLength(2);
    expect(w.emitted("change")[1][0].layers).toBeUndefined();
    w.unmount();
  });
  it("gates missing schema and never persists preview scrubbing", async () => {
    const w = mount(BoxCardEditor, {
      props: { value, disabled: true },
      global: { stubs: { MediaPicker: true } },
    });
    expect(w.get("fieldset").attributes()).toHaveProperty("disabled");
    expect(w.text()).toContain("database update");
    await w.get("input[type=range]").setValue("0.4");
    expect(w.emitted("change")).toBeUndefined();
    w.unmount();
  });
});
