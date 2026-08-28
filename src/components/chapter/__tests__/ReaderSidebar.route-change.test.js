import { beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import ReaderSidebar from "@/components/chapter/ReaderSidebar.vue";

const sidebarState = vi.hoisted(() => ({
  isOpen: null,
  activeTab: null,
}));

vi.mock("@/composables/useReaderSidebar", async () => {
  const { ref } = await import("vue");
  sidebarState.isOpen ||= ref(true);
  sidebarState.activeTab ||= ref("info");
  return {
    useReaderSidebar: () => ({
      ...sidebarState,
      close: vi.fn(() => (sidebarState.isOpen.value = false)),
      setTab: vi.fn((tab) => (sidebarState.activeTab.value = tab)),
    }),
  };
});

vi.mock("@/composables/useDraggablePanel", async () => {
  const { ref } = await import("vue");
  return { useDraggablePanel: () => ({ x: ref(16), y: ref(16) }) };
});

vi.mock("@/composables/useAuth", async () => {
  const { ref } = await import("vue");
  return {
    useAuth: () => ({ session: ref({ access_token: "token" }) }),
  };
});

beforeEach(() => {
  sidebarState.isOpen.value = true;
  sidebarState.activeTab.value = "info";
  vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("VITE_SUPABASE_ANON_KEY", "anon");
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url) => {
      const moduleId = url.includes("module-2") ? "2" : "1";
      const isQuiz = url.includes("/quizzes?");
      return {
        ok: true,
        json: async () =>
          isQuiz
            ? [{ id: `quiz-${moduleId}`, title: `Quiz ${moduleId}` }]
            : [{ id: `lab-${moduleId}`, title: `Lab ${moduleId}` }],
      };
    })
  );
});

describe("ReaderSidebar chapter changes", () => {
  it("clears and refetches module-scoped demos", async () => {
    const wrapper = mount(ReaderSidebar, {
      props: { moduleId: "module-1", isAuthenticated: true },
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
    await flushPromises();
    expect(wrapper.text()).toContain("Lab 1");

    await wrapper.setProps({ moduleId: "module-2" });
    await flushPromises();
    expect(wrapper.text()).toContain("Lab 2");
    expect(wrapper.text()).not.toContain("Lab 1");
    expect(fetch).toHaveBeenCalledTimes(4);
    wrapper.unmount();
  });
});
