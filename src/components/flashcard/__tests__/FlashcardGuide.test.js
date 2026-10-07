import { afterEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import FlashcardGuide from "../FlashcardGuide.vue";

afterEach(() => localStorage.removeItem("ob.flashcardsGuideSeen"));
describe("FlashcardGuide: study instructions", () => {
  it("explains flip, self-rating and review timing", () => {
    const wrapper = mount(FlashcardGuide);
    expect(wrapper.text()).toContain("flip the card to check");
    expect(wrapper.text()).toContain("Rate how well you knew it");
    expect(wrapper.text()).toContain("cards you found hard come back sooner");
    wrapper.unmount();
  });

  it("keeps draft status visible after dismissing the how-to and on reopening", async () => {
    const wrapper = mount(FlashcardGuide, { props: { draft: true } });
    await wrapper.get("button").trigger("click");
    expect(wrapper.text()).not.toContain("How it works");
    expect(wrapper.text()).toContain("Draft deck");
    wrapper.unmount();
    const reopened = mount(FlashcardGuide, { props: { draft: true } });
    expect(reopened.text()).not.toContain("How it works");
    expect(reopened.text()).toContain("being checked by the authors");
    reopened.unmount();
  });
});
