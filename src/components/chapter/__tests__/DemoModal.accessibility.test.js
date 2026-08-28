import { afterEach, describe, expect, it } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import DemoModal from "@/components/chapter/demos/DemoModal.vue";

afterEach(() => {
  document.body.innerHTML = "";
  document.body.style.overflow = "";
});

describe("DemoModal accessibility", () => {
  it("labels the modal, moves focus inside and restores the trigger on close", async () => {
    const trigger = document.createElement("button");
    document.body.appendChild(trigger);
    trigger.focus();

    const wrapper = mount(DemoModal, {
      props: { show: true, title: "Cone explorer" },
      attachTo: document.body,
      slots: { default: '<button class="demo-action">Begin</button>' },
      global: { stubs: { Transition: false } },
    });
    await flushPromises();

    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.getAttribute("aria-labelledby")).toBe("demo-modal-title");
    expect(document.activeElement).toBe(document.querySelector(".demo-close"));
    expect(document.body.style.overflow).toBe("hidden");

    await wrapper.setProps({ show: false });
    await flushPromises();
    expect(document.activeElement).toBe(trigger);
    expect(document.body.style.overflow).toBe("");
    wrapper.unmount();
  });

  it("emits close when Escape is pressed", async () => {
    const wrapper = mount(DemoModal, {
      props: { show: true, title: "Quiz" },
      attachTo: document.body,
      global: { stubs: { Transition: false } },
    });
    await flushPromises();
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(wrapper.emitted("close")).toHaveLength(1);
    wrapper.unmount();
  });
});
