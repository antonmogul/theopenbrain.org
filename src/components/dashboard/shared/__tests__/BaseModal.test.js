/*
 * BaseModal is a modal dialog to assistive tech (OPENBRAIN-129): the deck
 * editor's Add slide, New deck, Share, Problems and confirm dialogs are all
 * BaseModals, and each has to announce itself by its title.
 */
import { afterEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import BaseModal from "../BaseModal.vue";

let wrapper;
afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = "";
});

const open = (props = {}, slots = {}) => {
  wrapper = mount(BaseModal, {
    props: { modelValue: true, ...props },
    slots: { default: "<p>Body</p>", ...slots },
    attachTo: document.body,
  });
  return document.body.querySelector(".modal-panel");
};

describe("BaseModal", () => {
  it("is a modal dialog named by its title", () => {
    const panel = open({ title: "Add a slide" });
    expect(panel.getAttribute("role")).toBe("dialog");
    expect(panel.getAttribute("aria-modal")).toBe("true");
    const titleId = panel.getAttribute("aria-labelledby");
    expect(titleId).toBeTruthy();
    expect(document.getElementById(titleId).textContent).toBe("Add a slide");
  });

  it("gives two open dialogs different title ids", () => {
    const first = open({ title: "One" });
    const firstId = first.getAttribute("aria-labelledby");
    const second = mount(BaseModal, {
      props: { modelValue: true, title: "Two" },
      attachTo: document.body,
    });
    const panels = document.body.querySelectorAll(".modal-panel");
    expect(panels).toHaveLength(2);
    expect(panels[1].getAttribute("aria-labelledby")).not.toBe(firstId);
    second.unmount();
  });

  it("falls back to aria-label when a custom header replaces the title", () => {
    const panel = open(
      { title: "Share" },
      { header: "<h3>Custom header</h3>" }
    );
    expect(panel.getAttribute("aria-labelledby")).toBeNull();
    expect(panel.getAttribute("aria-label")).toBe("Share");
  });

  it("renders nothing while closed", () => {
    expect(open({ modelValue: false, title: "Closed" })).toBeNull();
  });
});

describe("BaseModal keyboard", () => {
  const tab = (shiftKey = false) =>
    document.activeElement.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Tab", shiftKey, bubbles: true })
    );

  it("keeps Tab inside the panel: past the last control back to the first", () => {
    open(
      { title: "Share" },
      {
        default: '<button id="a">A</button><button id="b" disabled>B</button>',
        footer: '<button id="c">C</button>',
      }
    );
    const close = document.querySelector(".modal-close");
    const last = document.getElementById("c");
    last.focus();
    tab();
    expect(document.activeElement).toBe(close);
    tab(true);
    expect(document.activeElement).toBe(last);
    // In between, the browser moves focus as usual.
    document.getElementById("a").focus();
    const middle = new KeyboardEvent("keydown", {
      key: "Tab",
      bubbles: true,
      cancelable: true,
    });
    document.activeElement.dispatchEvent(middle);
    expect(middle.defaultPrevented).toBe(false);
  });
});
