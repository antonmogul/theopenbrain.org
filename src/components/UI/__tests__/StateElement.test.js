import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import StateElement from "../StateElement.vue";

const states = ["Accommodation", "Vergence"];

describe("StateElement", () => {
  it("draws inline states as chips with a prompt and marks the one shown", async () => {
    const wrapper = mount(StateElement, {
      props: { states, activeState: 1, inline: true, hint: "Tap a name" },
    });
    expect(wrapper.find(".state-chips__hint").text()).toBe("Tap a name");
    const chips = wrapper.findAll("button.state-chip");
    expect(chips.map((chip) => chip.text())).toEqual(states);
    expect(chips[1].classes()).toContain("state-chip--on");
    expect(chips[1].attributes("aria-pressed")).toBe("true");
    expect(chips[0].attributes("aria-pressed")).toBe("false");
    await chips[0].trigger("click");
    expect(wrapper.emitted("onClick")[0][0]).toEqual({
      index: 0,
      activeState: 1,
    });
  });

  it("keeps the pane's plain list: no chips, no prompt", () => {
    const wrapper = mount(StateElement, {
      props: { states, activeState: 0, hint: "Tap a name" },
    });
    expect(wrapper.find(".state-chips__hint").exists()).toBe(false);
    expect(wrapper.findAll(".state-chip")).toHaveLength(0);
    expect(wrapper.findAll("button")[0].classes()).toContain("underline");
  });
});
