/*
 * The disease flip cards (OPENBRAIN-70). In the pane a card is a third of
 * the window wide; in the text it takes the column's width instead, which
 * the `inline` class switches (a third of a phone is a 125px circle).
 */
import { afterEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import IllustrationFlip from "../IllustrationFlip.vue";

const RECORD = { id: "animationNormalVision", video: "normal-vision" };
let wrapper;
afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
});

describe("IllustrationFlip", () => {
  it("is sized for the pane by default", () => {
    wrapper = mount(IllustrationFlip, { props: { animation: RECORD } });
    expect(wrapper.classes()).not.toContain("flip-figure--inline");
  });

  it("is sized by its column in the text", () => {
    wrapper = mount(IllustrationFlip, {
      props: { animation: RECORD, inline: true },
    });
    expect(wrapper.classes()).toContain("flip-figure--inline");
    expect(wrapper.find(".flip-card").exists()).toBe(true);
  });
});
