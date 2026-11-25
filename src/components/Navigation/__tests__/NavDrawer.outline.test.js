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
      isCreator: ref(false),
      userRole: ref(null),
      signOut: vi.fn(),
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
        ChaptersLibrary: true,
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

  // The top bar's section menu said where the reader was; the search field
  // took its place, so the drawer's outline says it (OPENBRAIN-197).
  it("marks the section being read", async () => {
    state.store.currentSubChapter = "the-brain";
    await open();
    const current = document.querySelectorAll(
      '.chapter-outline [aria-current="location"]'
    );
    expect(current).toHaveLength(1);
    expect(current[0].textContent).toContain("The brain");
    state.store.currentSubChapter = null;
    await flushPromises();
    expect(
      document.querySelector('.chapter-outline [aria-current="location"]')
    ).toBeNull();
  });

  // The book's mark in the bar opens the drawer and "becomes" a ✕: the
  // drawer's own close button, first in it, over the mark (OPENBRAIN-78).
  it("closes from the ✕, first in the drawer, where the bar's mark is", async () => {
    await open();
    const head = document.querySelector(".drawer-head");
    const close = head.firstElementChild;
    expect(close.tagName).toBe("BUTTON");
    expect(close.getAttribute("aria-label")).toBe("Close chapter menu");
    expect(close.querySelector("svg")).not.toBeNull();
    expect(document.activeElement).toBe(close);
    expect(head.textContent.trim()).toBe("");
    close.click();
    await flushPromises();
    expect(state.store.activeMenu).toBe(false);
  });

  it("has the full table of contents link and a home icon above the chapters", async () => {
    await open();
    const top = document.querySelector(".drawer-top");
    const link = top.querySelector('[data-testid="drawer-contents-link"]');
    expect(link.textContent.trim()).toBe("See full table of contents");
    expect(link.getAttribute("href")).toBe("/chapters");
    const home = top.querySelector("a.home-link");
    expect(home.getAttribute("href")).toBe("/chapters");
    expect(home.getAttribute("aria-label")).toBe("Home");
    expect(
      top.compareDocumentPosition(document.querySelector(".chapter-list")) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it("numbers the chapters as the book does", async () => {
    await open();
    expect(
      [...document.querySelectorAll(".chapter-row")].map((row) =>
        row.textContent.replace(/\s+/g, " ").trim()
      )
    ).toEqual(["1 History", "2 The Retina"]);
  });

  describe("See full table of contents", () => {
    const width = window.innerWidth;
    afterEach(() => {
      window.innerWidth = width;
    });

    it("on a phone goes to /chapters", async () => {
      window.innerWidth = 375;
      await open();
      document.querySelector('[data-testid="drawer-contents-link"]').click();
      await flushPromises();
      expect(state.push).toHaveBeenCalledWith("/chapters");
      expect(state.store.activeMenu).toBe(false);
    });

    it("with room, shows the library beside the drawer; Escape closes it, then the drawer", async () => {
      window.innerWidth = 1280;
      await open();
      const link = document.querySelector(
        '[data-testid="drawer-contents-link"]'
      );
      link.click();
      await flushPromises();
      expect(state.push).not.toHaveBeenCalled();
      const library = document.querySelector('[data-testid="drawer-library"]');
      expect(library).not.toBeNull();
      // Inside the overlay, after the drawer, not inside the dialog.
      expect(library.parentElement).toBe(
        document.querySelector(".nav-backdrop")
      );
      expect(library.closest('[role="dialog"]')).toBeNull();
      expect(document.activeElement).toBe(
        library.querySelector(".library-close")
      );

      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", cancelable: true })
      );
      await flushPromises();
      expect(
        document.querySelector('[data-testid="drawer-library"]')
      ).toBeNull();
      expect(state.store.activeMenu).toBe(true);
      expect(document.activeElement).toBe(link);

      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", cancelable: true })
      );
      await flushPromises();
      expect(state.store.activeMenu).toBe(false);
    });

    it("the library's own close goes back to the page", async () => {
      window.innerWidth = 1280;
      await open();
      document.querySelector('[data-testid="drawer-contents-link"]').click();
      await flushPromises();
      document.querySelector(".library-close").click();
      await flushPromises();
      expect(state.store.activeMenu).toBe(false);
    });
  });

  it("signed out, the foot offers Sign in", async () => {
    await open();
    const foot = document.querySelector(".drawer-foot");
    expect(foot.querySelector(".signin-btn").textContent.trim()).toBe(
      "Sign in"
    );
    expect(foot.querySelector(".user-footer")).toBeNull();
  });

  it("jumps within the reader through readerJump and closes the drawer without changing chapters", async () => {
    // readerJump lands the anchor below the top bar with window.scrollTo,
    // never scrollIntoView (OPENBRAIN-145); reduced motion makes it instant.
    document.documentElement.setAttribute("data-reduce-motion", "1");
    const scrollTo = vi.fn();
    const originalScrollTo = window.scrollTo;
    window.scrollTo = scrollTo;
    const target = document.createElement("h3");
    target.id = "localisation";
    target.scrollIntoView = vi.fn();
    target.getBoundingClientRect = () => ({
      top: 1200,
      bottom: 1300,
      height: 100,
      left: 0,
      right: 0,
      width: 0,
    });
    document.body.appendChild(target);
    try {
      await open();
      document.querySelector(".outline-subsection").click();
      await flushPromises();
      expect(state.store.activeMenu).toBe(false);
      expect(state.push).not.toHaveBeenCalled();
      expect(target.scrollIntoView).not.toHaveBeenCalled();
      expect(scrollTo).toHaveBeenCalledTimes(1);
      const { top } = scrollTo.mock.calls[0][0];
      // 1200 from the top, landed 48 + 16 below the viewport's top edge.
      expect(top).toBe(1200 - 64);
      expect(document.activeElement).toBe(target);
    } finally {
      window.scrollTo = originalScrollTo;
      document.documentElement.removeAttribute("data-reduce-motion");
    }
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
