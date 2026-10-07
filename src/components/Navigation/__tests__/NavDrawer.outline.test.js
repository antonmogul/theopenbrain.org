import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
const state = vi.hoisted(() => ({
  store: null,
  text: null,
  route: null,
  push: vi.fn(),
}));
vi.mock("vue-router", async () => {
  const { reactive } = await import("vue");
  state.route = reactive({
    name: "chapter",
    params: { slug: "foundations-of-neuroscience" },
    fullPath: "/chapter/1/foundations-of-neuroscience",
  });
  return {
    useRoute: () => state.route,
    useRouter: () => ({ push: state.push }),
  };
});
vi.mock("@/stores", async () => {
  const { reactive } = await import("vue");
  state.store = reactive({ activeMenu: false });
  state.text = reactive({ text: { sections: [] } });
  return { useGeneral: () => state.store, useText: () => state.text };
});
vi.mock("@/stores/auth", () => ({ useAuthStore: () => ({}) }));
vi.mock("@/composables/useAuth", async () => {
  const { ref } = await import("vue");
  return {
    useAuth: () => ({
      user: ref(null),
      profile: ref(null),
      isAuthenticated: ref(false),
    }),
  };
});
vi.mock("@/composables/useHomeRoute", () => ({
  useHomeRoute: () => "/chapters",
}));
vi.mock("@/composables/useChapterCatalog", async () => {
  const { ref } = await import("vue");
  return {
    useChapterCatalog: () => ({
      fetchCatalog: vi.fn(),
      modules: ref([
        {
          id: "history",
          slug: "foundations-of-neuroscience",
          order_index: 1,
          title: "History",
        },
        {
          id: "retina",
          slug: "the-retina",
          order_index: 2,
          title: "The Retina",
        },
      ]),
    }),
  };
});
import NavDrawer from "../NavDrawer.vue";
let wrapper;
beforeEach(() => {
  state.store.activeMenu = false;
  state.route.name = "chapter";
  state.route.params.slug = "foundations-of-neuroscience";
  state.route.fullPath = "/chapter/1/foundations-of-neuroscience";
  state.push.mockReset();
  state.text.text = {
    sections: [
      {
        id: "brain",
        title: "The brain",
        paragraphs: [
          {
            subSection: [
              { id: "localisation", title: "Localisation", paragraphs: [] },
            ],
          },
        ],
      },
    ],
  };
  wrapper = mount(NavDrawer, {
    attachTo: document.body,
    global: {
      stubs: {
        Transition: true,
        AuthForm: true,
        RouterLink: { props: ["to"], template: '<a :href="to"><slot /></a>' },
      },
    },
  });
});
afterEach(() => {
  wrapper?.unmount();
  document.body.innerHTML = "";
});
async function open() {
  state.store.activeMenu = true;
  await flushPromises();
}

describe("reader menu outline", () => {
  it("expands only the current chapter with its authored section headings", async () => {
    await open();
    const outlines = document.querySelectorAll(".chapter-outline");
    expect(outlines).toHaveLength(1);
    expect(outlines[0].getAttribute("aria-label")).toBe("History contents");
    expect(outlines[0].textContent).toContain("The brain");
    expect(outlines[0].textContent).toContain("Localisation");
    expect(
      document.querySelector('[aria-current="page"]').textContent
    ).toContain("History");
  });

  it("jumps within the reader and closes the drawer without changing chapters", async () => {
    const target = document.createElement("h3");
    target.id = "localisation";
    target.scrollIntoView = vi.fn();
    document.body.appendChild(target);
    await open();
    document.querySelector(".outline-subsection").click();
    await flushPromises();
    expect(state.store.activeMenu).toBe(false);
    expect(state.push).not.toHaveBeenCalled();
    expect(target.scrollIntoView).toHaveBeenCalled();
    expect(document.activeElement).toBe(target);
  });

  it("still navigates to a different chapter", async () => {
    await open();
    document.querySelectorAll(".chapter-row")[1].click();
    await flushPromises();
    expect(state.push).toHaveBeenCalledWith("/chapter/2/the-retina");
    expect(state.store.activeMenu).toBe(false);
  });

  it("closes on an actual route change independently of reader scroll updates", async () => {
    await open();
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    state.route.fullPath = "/chapter/2/the-retina";
    await flushPromises();
    expect(state.store.activeMenu).toBe(false);
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it("returns focus to the menu opener on Escape after repeated opens", async () => {
    const opener = document.createElement("button");
    document.body.appendChild(opener);
    for (let i = 0; i < 3; i++) {
      opener.focus();
      await open();
      expect(document.activeElement.getAttribute("aria-label")).toBe(
        "Close chapter menu"
      );
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      await flushPromises();
      expect(document.activeElement).toBe(opener);
    }
  });

  it("does not show an old chapter's cached outline during navigation", async () => {
    state.text.text.slug = "the-retina";
    await open();
    expect(document.querySelector(".chapter-outline")).toBeNull();
  });

  it("hides the reader outline on routes outside a chapter", async () => {
    state.route.name = "chapters";
    await open();
    expect(document.querySelector(".chapter-outline")).toBeNull();
  });
});
