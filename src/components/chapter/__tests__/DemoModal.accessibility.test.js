import { afterEach, describe, expect, it } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { nextTick, ref } from "vue";
import { routerKey } from "vue-router";
import DemoModal from "@/components/chapter/demos/DemoModal.vue";

const wrappers = [];
function mountModal(props = {}, slots = {}) {
  const wrapper = mount(DemoModal, {
    props: { show: true, title: "Cone explorer", ...props },
    attachTo: document.body,
    slots,
    global: { stubs: { Transition: true } },
  });
  wrappers.push(wrapper);
  return wrapper;
}
function addTrigger() {
  const trigger = document.createElement("button");
  document.body.appendChild(trigger);
  trigger.focus();
  return trigger;
}
afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
  document.body.innerHTML = "";
  document.body.removeAttribute("style");
  document.documentElement.removeAttribute("style");
});

describe("DemoModal accessibility", () => {
  it("labels the modal, moves focus inside and restores the trigger on close", async () => {
    const trigger = addTrigger();
    const wrapper = mountModal(
      {},
      { default: '<button class="demo-action">Begin</button>' }
    );
    await flushPromises();
    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(
      document.getElementById(dialog.getAttribute("aria-labelledby"))
        .textContent
    ).toBe("Cone explorer");
    expect(document.activeElement).toBe(document.querySelector(".demo-close"));
    expect(document.body.getAttribute("style")).toContain("overflow: hidden");
    expect(document.documentElement.getAttribute("style")).toContain(
      "overflow: hidden"
    );
    await wrapper.setProps({ show: false });
    expect(document.activeElement).toBe(trigger);
    expect(document.body.style.overflow).toBe("");
    expect(document.documentElement.style.overflow).toBe("");
  });

  it("emits close on Escape unless the widget consumed it", async () => {
    const wrapper = mountModal();
    await flushPromises();
    const consumed = new KeyboardEvent("keydown", {
      key: "Escape",
      cancelable: true,
    });
    consumed.preventDefault();
    window.dispatchEvent(consumed);
    expect(wrapper.emitted("close")).toBeUndefined();
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(wrapper.emitted("close")).toHaveLength(1);
  });

  it("traps focus even when focus has escaped to the document", async () => {
    const trigger = addTrigger();
    mountModal({}, { default: '<button class="demo-action">Begin</button>' });
    await flushPromises();
    trigger.focus();
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Tab", cancelable: true })
    );
    expect(document.activeElement).toBe(document.querySelector(".demo-close"));
    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Tab",
        shiftKey: true,
        cancelable: true,
      })
    );
    expect(document.activeElement).toBe(document.querySelector(".demo-action"));
  });

  it("restores exact scroll styles after repeated opens and an interrupted close", async () => {
    document.body.style.overflow = "auto";
    document.documentElement.style.overflow = "scroll";
    const trigger = addTrigger();
    const wrapper = mountModal({ show: false });
    expect(document.body.style.overflow).toBe("auto");
    for (let i = 0; i < 3; i++) {
      await wrapper.setProps({ show: true });
      expect(document.documentElement.getAttribute("style")).toContain(
        "overflow: hidden"
      );
      await wrapper.setProps({ show: false });
      expect(document.activeElement).toBe(trigger);
      expect(document.body.style.overflow).toBe("auto");
      expect(document.documentElement.style.overflow).toBe("scroll");
    }
    wrapper.setProps({ show: true });
    wrapper.unmount();
    await nextTick();
    expect(document.body.style.overflow).toBe("auto");
    expect(document.activeElement).toBe(trigger);
  });

  it("inactive modal mount/unmount never releases another modal's scroll lock", async () => {
    const active = mountModal();
    await flushPromises();
    const inactive = mountModal({ show: false });
    inactive.unmount();
    expect(document.body.getAttribute("style")).toContain("overflow: hidden");
    active.unmount();
    expect(document.body.style.overflow).toBe("");
  });

  it("releases nested locks only after the final modal closes", async () => {
    const first = mountModal();
    const second = mountModal();
    await flushPromises();
    first.unmount();
    expect(document.body.getAttribute("style")).toContain("overflow: hidden");
    second.unmount();
    expect(document.body.style.overflow).toBe("");
  });

  it.each(["Back", "Forward"])(
    "closes and unlocks on browser %s without stealing navigation focus",
    async () => {
      const wrapper = mountModal({ wide: true });
      await flushPromises();
      const destination = addTrigger();
      window.dispatchEvent(new PopStateEvent("popstate"));
      await flushPromises();
      expect(wrapper.emitted("close")).toHaveLength(1);
      expect(document.body.style.overflow).toBe("");
      expect(document.activeElement).toBe(destination);
    }
  );

  it("closes on programmatic route changes as well as history navigation", async () => {
    const currentRoute = ref({
      fullPath: "/chapter/1/foundations-of-neuroscience",
    });
    const wrapper = mount(DemoModal, {
      props: { show: true, title: "History" },
      attachTo: document.body,
      global: {
        provide: { [routerKey]: { currentRoute } },
        stubs: { Transition: true },
      },
    });
    wrappers.push(wrapper);
    await flushPromises();
    currentRoute.value = { fullPath: "/chapters" };
    await flushPromises();
    expect(wrapper.emitted("close")).toHaveLength(1);
    expect(document.body.getAttribute("style") || "").not.toContain("hidden");
  });

  it("restores the trigger when an open modal is unmounted", async () => {
    const trigger = addTrigger();
    const wrapper = mountModal();
    await flushPromises();
    wrapper.unmount();
    expect(document.activeElement).toBe(trigger);
    expect(document.body.style.overflow).toBe("");
  });
});
