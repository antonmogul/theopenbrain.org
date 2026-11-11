import { afterEach, describe, expect, it } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { defineComponent, h, inject, ref } from "vue";
import DemoModal from "@/components/chapter/demos/DemoModal.vue";
import WidgetFrame from "@/widgets/uploaded/WidgetFrame.vue";
import { WIDGET_FULLSCREEN } from "@/widgets/uploaded/widgetHost";

/*
 * The band's expand button opens an uploaded widget in the full-viewport
 * dialog (OPENBRAIN-178). The dialog says so to what it holds, the frame
 * builds the widget's document saying so, and Escape pressed inside the
 * sandboxed frame comes back to close the dialog.
 */
const wrappers = [];
afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
  document.body.innerHTML = "";
  document.body.removeAttribute("style");
  document.documentElement.removeAttribute("style");
});

const Probe = defineComponent({
  setup() {
    const full = inject(WIDGET_FULLSCREEN, ref(false));
    return () => h("p", { class: "probe" }, String(full.value));
  },
});

function mountModal(props) {
  const wrapper = mount(DemoModal, {
    props: { show: true, title: "Penfield's case binder", ...props },
    attachTo: document.body,
    slots: { default: () => h(Probe) },
    global: { stubs: { Transition: true } },
  });
  wrappers.push(wrapper);
  return wrapper;
}

describe("DemoModal tells a widget it is full screen", () => {
  it("in the full-viewport panel", async () => {
    mountModal({ wide: true, contentOwnsHeading: true });
    await flushPromises();
    expect(document.querySelector(".probe").textContent).toBe("true");
  });

  it("not in the ordinary dialog", async () => {
    mountModal({});
    await flushPromises();
    expect(document.querySelector(".probe").textContent).toBe("false");
  });
});

describe("WidgetFrame in the full-screen dialog", () => {
  const HTML = "<html><head></head><body><p>widget</p></body></html>";
  function mountFrame(props) {
    const wrapper = mount(WidgetFrame, {
      props: { html: HTML, ...props },
      attachTo: document.body,
    });
    wrappers.push(wrapper);
    return wrapper;
  }
  const escapeFrom = (wrapper) =>
    window.dispatchEvent(
      new MessageEvent("message", {
        data: { __ob: 1, type: "escape" },
        source: wrapper.find("iframe").element.contentWindow,
      })
    );
  function keysSeen() {
    const seen = [];
    const on = (event) => seen.push(event.key);
    window.addEventListener("keydown", on);
    return { seen, stop: () => window.removeEventListener("keydown", on) };
  }

  it("builds the widget's document for full screen", () => {
    const doc = mountFrame({ fullScreen: true })
      .find("iframe")
      .attributes("srcdoc");
    expect(doc).toMatch(/<html[^>]*data-ob-fullscreen/);
    expect(doc).toContain("window.__obFull=true;");
    expect(mountFrame({}).find("iframe").attributes("srcdoc")).not.toMatch(
      /<html[^>]*data-ob-fullscreen/
    );
  });

  it("hands Escape pressed inside the frame to the page", () => {
    const wrapper = mountFrame({ fullScreen: true });
    const keys = keysSeen();
    escapeFrom(wrapper);
    keys.stop();
    expect(keys.seen).toEqual(["Escape"]);
  });

  it("leaves the page alone when the frame is not the dialog's", () => {
    const wrapper = mountFrame({});
    const keys = keysSeen();
    escapeFrom(wrapper);
    keys.stop();
    expect(keys.seen).toEqual([]);
  });

  it("closes the dialog it is in", async () => {
    const modal = mount(DemoModal, {
      props: { show: true, title: "Penfield's case binder", wide: true },
      attachTo: document.body,
      slots: {
        default: () => h(WidgetFrame, { html: HTML, fullScreen: true }),
      },
      global: { stubs: { Transition: true } },
    });
    wrappers.push(modal);
    await flushPromises();
    window.dispatchEvent(
      new MessageEvent("message", {
        data: { __ob: 1, type: "escape" },
        source: document.querySelector(".demo-panel iframe").contentWindow,
      })
    );
    expect(modal.emitted("close")).toHaveLength(1);
  });
});
