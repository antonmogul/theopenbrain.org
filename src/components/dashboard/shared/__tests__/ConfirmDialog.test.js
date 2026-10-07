/*
 * ConfirmDialog moves focus (OPENBRAIN-129 review): BaseModal moves none, so
 * a confirm opened from a button left focus behind the scrim. It focuses
 * Cancel, the safe answer, and gives focus back to the button that asked.
 */
import { afterEach, describe, expect, it } from "vitest";
import { defineComponent, h, nextTick, ref } from "vue";
import { flushPromises, mount } from "@vue/test-utils";
import ConfirmDialog from "../ConfirmDialog.vue";

let wrapper;
afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = "";
});

// A button that opens the dialog, as the deck editor's Publish does.
const Host = defineComponent({
  props: { variant: { type: String, default: "danger" } },
  setup(props) {
    const open = ref(false);
    return () => [
      h("button", { id: "asker", onClick: () => (open.value = true) }, "Ask"),
      h(ConfirmDialog, {
        modelValue: open.value,
        "onUpdate:modelValue": (v) => (open.value = v),
        title: "Publish?",
        confirmLabel: "Publish",
        variant: props.variant,
      }),
    ];
  },
});

describe("ConfirmDialog focus", () => {
  it.each(["danger", "warn", "info"])(
    "focuses Cancel when a %s confirm opens, and returns focus on close",
    async (variant) => {
      wrapper = mount(Host, { props: { variant }, attachTo: document.body });
      const asker = document.getElementById("asker");
      asker.focus();
      asker.click();
      await nextTick();
      await flushPromises();
      const panel = document.querySelector(".modal-panel");
      expect(panel.contains(document.activeElement)).toBe(true);
      expect(document.activeElement.textContent.trim()).toBe("Cancel");

      document.activeElement.click();
      await nextTick();
      await flushPromises();
      expect(document.activeElement).toBe(asker);
    }
  );
});
