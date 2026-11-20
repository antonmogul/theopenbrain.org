import { afterEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import HoverImg from "../HoverImg.vue";
let wrapper;
afterEach(() => {
  wrapper?.unmount();
  document.body.innerHTML = "";
});
describe("block-owned hover images", () => {
  it("reads the anchor's image, caption and alt on pointer, focus and touch click", async () => {
    document.body.innerHTML =
      '<span tabindex="0" class="hoverImg" data-hover-src="/author.webp" data-hover-text="Author caption" data-hover-alt="Author image">Author</span>';
    wrapper = mount(HoverImg, { attachTo: document.body });
    const anchor = document.querySelector(".hoverImg");
    for (const type of ["mouseover", "focusin", "click"]) {
      anchor.dispatchEvent(new Event(type, { bubbles: true }));
      await nextTick();
      expect(wrapper.get("img").attributes()).toMatchObject({
        src: "/author.webp",
        alt: "Author image",
      });
      expect(wrapper.text()).toBe("Author caption");
      anchor.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
      await nextTick();
      expect(wrapper.find("img").exists()).toBe(false);
    }
  });
});
