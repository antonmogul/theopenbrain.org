import { describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import ReaderTopBar from "@/components/chapter/ReaderTopBar.vue";

const generalStore = vi.hoisted(() => ({
  progress: 0,
  currentSubChapter: "introduction",
  activeMenu: false,
}));

vi.mock("@/stores", () => ({
  useGeneral: () => generalStore,
}));

vi.mock("@/composables/useReaderSidebar", async () => {
  const { ref } = await import("vue");
  const isOpen = ref(false);
  const activeTab = ref("info");
  return {
    useReaderSidebar: () => ({
      isOpen,
      activeTab,
      toggle: vi.fn(),
    }),
  };
});

vi.mock("@/composables/useHomeRoute", () => ({
  useHomeRoute: () => "/chapters",
}));

describe("ReaderTopBar accessibility", () => {
  it("exposes section navigation as a disclosure and returns focus on Escape", async () => {
    const wrapper = mount(ReaderTopBar, {
      props: {
        chapterNumber: "1",
        progressPercent: 42,
        sections: [{ title: "Introduction", slug: "introduction" }],
      },
      attachTo: document.body,
      global: {
        stubs: {
          RouterLink: { template: "<a><slot /></a>" },
          Transition: false,
        },
      },
    });

    const disclosure = wrapper.get(".section-jump");
    expect(disclosure.attributes("aria-expanded")).toBe("false");
    await disclosure.trigger("click");
    expect(disclosure.attributes("aria-expanded")).toBe("true");
    expect(wrapper.get("#reader-section-menu").attributes("aria-label")).toBe(
      "Chapter sections"
    );

    await wrapper.get("#reader-section-menu").trigger("keydown", {
      key: "Escape",
    });
    expect(disclosure.attributes("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(disclosure.element);
    wrapper.unmount();
  });

  it("announces the same percentage rendered in the progress track", () => {
    const wrapper = mount(ReaderTopBar, {
      props: { progressPercent: 42 },
      global: { stubs: { RouterLink: true } },
    });
    expect(
      wrapper.get('[role="progressbar"]').attributes("aria-valuenow")
    ).toBe("42");
  });

  it("does not expose unavailable student tools to anonymous readers", () => {
    const wrapper = mount(ReaderTopBar, {
      props: { isAuthenticated: false },
      global: { stubs: { RouterLink: true } },
    });
    expect(wrapper.find(".tool-buttons").exists()).toBe(false);
  });

  it("returns focus to the disclosure after a section is selected", async () => {
    const target = document.createElement("div");
    target.id = "introduction";
    target.scrollIntoView = vi.fn();
    document.body.appendChild(target);
    const wrapper = mount(ReaderTopBar, {
      props: {
        isAuthenticated: true,
        sections: [{ title: "Introduction", slug: "introduction" }],
      },
      attachTo: document.body,
      global: {
        stubs: { RouterLink: true, Transition: false },
      },
    });
    const disclosure = wrapper.get(".section-jump");
    await disclosure.trigger("click");
    await wrapper.get(".dropdown-item").trigger("click");
    expect(document.activeElement).toBe(disclosure.element);
    wrapper.unmount();
    target.remove();
  });
});
