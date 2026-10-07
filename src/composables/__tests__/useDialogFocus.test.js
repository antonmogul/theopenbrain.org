/*
 * useDialogFocus (OPENBRAIN-129 review): focus into a dialog when it opens,
 * back to its opener when it closes, including a dialog opened from a menu
 * item that the menu removes in the same tick (the opener is then the
 * menu's button, which the menu focuses again).
 */
import { afterEach, describe, expect, it } from "vitest";
import { defineComponent, h, nextTick, ref } from "vue";
import { flushPromises, mount } from "@vue/test-utils";
import { useDialogFocus } from "../useDialogFocus.js";

let wrapper;
afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = "";
});

const Host = defineComponent({
  setup() {
    const menuOpen = ref(true);
    const dialogOpen = ref(false);
    const menuButton = ref(null);
    const inside = ref(null);
    useDialogFocus(
      () => dialogOpen.value,
      () => inside.value
    );
    // The editor's More menu: close it, put focus back on its button next
    // tick, open the dialog now.
    function chooseItem() {
      menuOpen.value = false;
      nextTick(() => menuButton.value.focus());
      dialogOpen.value = true;
    }
    return {
      menuOpen,
      dialogOpen,
      render: () =>
        h("div", [
          h("button", { key: "more", id: "more", ref: menuButton }, "More"),
          menuOpen.value
            ? h(
                "button",
                { key: "item", id: "item", onClick: chooseItem },
                "Discard"
              )
            : null,
          dialogOpen.value
            ? h(
                "button",
                { key: "inside", id: "inside", ref: inside },
                "Cancel"
              )
            : null,
        ]),
    };
  },
  render() {
    return this.render();
  },
});

describe("useDialogFocus", () => {
  it("returns focus to the menu button when the menu item that opened it is gone", async () => {
    wrapper = mount(Host, { attachTo: document.body });
    const item = document.getElementById("item");
    item.focus();
    item.click();
    await nextTick();
    await flushPromises();
    expect(document.activeElement.id).toBe("inside");

    wrapper.vm.dialogOpen = false;
    await nextTick();
    await flushPromises();
    expect(document.activeElement.id).toBe("more");
  });
});
