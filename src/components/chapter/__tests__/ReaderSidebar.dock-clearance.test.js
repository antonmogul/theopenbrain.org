import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import ReaderSidebar from "@/components/chapter/ReaderSidebar.vue";
import { PEEK_H, REST_H } from "@/helper/chapterTimeline";

// The desktop panel reserved only the dock's 20px resting
// strip, so the peeked dock (PEEK_H) and its map button at the right end
// slid under the panel. It now stays between the top bar and the dock at
// its peek height.
vi.mock("@/composables/useReaderSidebar", async () => {
  const { ref } = await import("vue");
  const isOpen = ref(true);
  const activeTab = ref("info");
  return {
    useReaderSidebar: () => ({
      isOpen,
      activeTab,
      close: vi.fn(),
      setTab: vi.fn(),
    }),
  };
});

vi.mock("@/composables/useAuth", async () => {
  const { ref } = await import("vue");
  return { useAuth: () => ({ session: ref(null) }) };
});

const root = document.documentElement;

function mountSidebar() {
  return mount(ReaderSidebar, {
    props: { moduleId: null, isAuthenticated: false },
    global: {
      stubs: {
        Teleport: true,
        Transition: false,
        InfoTab: true,
        NotebookTab: true,
        ChatTab: true,
        DemoModal: true,
        CloseIcon: true,
      },
    },
  });
}

function panelBox(wrapper) {
  const style = wrapper.get('[data-testid="reader-sidebar"]').element.style;
  const top = parseFloat(style.top);
  const height = parseFloat(style.getPropertyValue("--toolkit-h"));
  return { top, height, bottom: top + height };
}

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal("innerWidth", 1280);
  vi.stubGlobal("innerHeight", 800);
  root.style.setProperty("--reader-topbar-h", "4rem");
});

afterEach(() => {
  root.style.removeProperty("--reader-topbar-h");
  root.style.removeProperty("--reader-timeline-h");
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe("ReaderSidebar and the timeline dock", () => {
  it("keeps the panel above the dock's peek height, not just its resting strip", async () => {
    root.style.setProperty("--reader-timeline-h", `${REST_H}px`);
    const wrapper = mountSidebar();
    await flushPromises();

    const box = panelBox(wrapper);
    // 1280x800: the peeked dock's top edge is at 800 - 104.
    expect(box.bottom).toBeLessThanOrEqual(800 - PEEK_H - 16);
    // ...and it stays under the 64px top bar, shrinking to fit.
    expect(box.top).toBeGreaterThanOrEqual(64);
    expect(box.height).toBeLessThan(620);
    wrapper.unmount();
  });

  it("keeps a saved spot from sitting on the dock", async () => {
    root.style.setProperty("--reader-timeline-h", `${REST_H}px`);
    localStorage.setItem("ob.toolkitPos", JSON.stringify({ x: 876, y: 144 }));
    const wrapper = mountSidebar();
    await flushPromises();

    expect(panelBox(wrapper).bottom).toBeLessThanOrEqual(800 - PEEK_H);
    wrapper.unmount();
  });

  it("uses the full height when there is no dock and room for it", async () => {
    vi.stubGlobal("innerHeight", 1000);
    const wrapper = mountSidebar();
    await flushPromises();

    const box = panelBox(wrapper);
    expect(box.height).toBe(620);
    expect(box.bottom).toBe(1000 - 24);
    wrapper.unmount();
  });
});
