import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import ReaderTopBar from "@/components/chapter/ReaderTopBar.vue";

const source = readFileSync(resolve(__dirname, "../ReaderTopBar.vue"), "utf8");
// The body of `@media <query> { ... }` (up to the next @media or the end).
const mediaBlock = (query) => {
  const at = source.indexOf(`@media ${query} {`);
  if (at < 0) return "";
  const next = source.indexOf("@media", at + 1);
  return source.slice(at, next < 0 ? source.indexOf("</style>") : next);
};
const rule = (css, selector) => {
  const at = css.indexOf(`${selector} {`);
  return at < 0 ? "" : css.slice(at, css.indexOf("}", at));
};

const generalStore = vi.hoisted(() => ({
  progress: 0,
  currentSubChapter: "introduction",
  activeMenu: false,
}));
const sidebar = vi.hoisted(() => ({
  open: null,
  isOpen: null,
  activeTab: null,
}));

vi.mock("@/stores", () => ({
  useGeneral: () => generalStore,
  useText: () => ({ text: { slug: "a-chapter", intro: [], sections: [] } }),
}));

vi.mock("@/composables/useAnimations", async () => {
  const { ref } = await import("vue");
  return {
    useAnimations: () => ({
      animations: ref([]),
      fetchAnimations: () => Promise.resolve({ data: [] }),
    }),
  };
});

vi.mock("@/composables/useReaderSidebar", async () => {
  const { ref } = await import("vue");
  sidebar.isOpen = ref(false);
  sidebar.activeTab = ref("info");
  sidebar.open = vi.fn((tab) => {
    sidebar.activeTab.value = tab;
    sidebar.isOpen.value = true;
  });
  return {
    useReaderSidebar: () => ({
      isOpen: sidebar.isOpen,
      activeTab: sidebar.activeTab,
      open: sidebar.open,
    }),
  };
});

vi.mock("@/composables/useHomeRoute", () => ({
  useHomeRoute: () => "/chapters",
}));

// The account menu has its own tests (AccountMenu.test.js).
vi.mock("@/components/Navigation/AccountMenu.vue", () => ({
  default: { name: "AccountMenu", render: () => null },
}));

const mountBar = (props = {}) =>
  mount(ReaderTopBar, {
    props,
    attachTo: document.body,
    global: { stubs: { RouterLink: true } },
  });

beforeEach(() => {
  generalStore.activeMenu = false;
  sidebar.isOpen.value = false;
  sidebar.open.mockClear();
});

describe("ReaderTopBar accessibility", () => {
  // Stuart, 11 Nov (OPENBRAIN-197): "where it currently says something like
  // 'Ch 1 Where is my mind?', we can remove that, and replace with a search
  // bar."
  it("has the chapter search where the chapter number and section menu were", () => {
    const wrapper = mountBar();
    expect(wrapper.find(".chapter-eyebrow").exists()).toBe(false);
    expect(wrapper.find(".section-jump").exists()).toBe(false);
    expect(wrapper.find("#reader-section-menu").exists()).toBe(false);
    const search = wrapper.get('[data-testid="reader-search"]');
    const row = [...wrapper.get(".bar-row").element.children];
    // After the logo, before the spacer that pushes help to the right end.
    expect(row.indexOf(search.element)).toBeGreaterThan(
      row.indexOf(wrapper.get(".wordmark").element)
    );
    expect(row.indexOf(search.element)).toBeLessThan(
      row.indexOf(wrapper.get(".spacer").element)
    );
    const input = wrapper.get('[data-testid="reader-search-input"]');
    expect(input.attributes("role")).toBe("combobox");
    expect(input.attributes("aria-label")).toBe("Search this chapter");
    wrapper.unmount();
  });

  // The wordmark used to be inside the menu button (one control, no home
  // link). Stuart found the two indistinguishable, so the wordmark is the
  // logo, a link home, and the menu button alone opens the menu
  // (OPENBRAIN-145; ReaderTopBar.wordmark.test.js).
  it("the chapter-menu control is a button on its own", async () => {
    const wrapper = mountBar();
    const menu = wrapper.get('[aria-label="Open chapter menu"]');
    expect(menu.element.tagName).toBe("BUTTON");
    expect(menu.find(".wordmark").exists()).toBe(false);
    expect(menu.attributes("aria-expanded")).toBe("false");
    await menu.trigger("click");
    expect(generalStore.activeMenu).toBe(true);
    wrapper.unmount();
  });

  // Reading progress moved to the chapter timeline's slider (OPENBRAIN-128;
  // its aria-valuenow is tested in timeline/__tests__/ChapterTimeline.test.js).
  it("no longer carries a progress bar of its own", () => {
    const wrapper = mountBar();
    expect(wrapper.find('[role="progressbar"]').exists()).toBe(false);
    expect(wrapper.find(".progress-track").exists()).toBe(false);
    wrapper.unmount();
  });

  // The draft notice was a fixed ribbon under the bar, over
  // TextComp's centred Edit chapter toggle and edit bar. It is now a badge
  // in the bar's own row, after the logo.
  it("marks a draft in the bar itself, telling screen readers who can see it", () => {
    const wrapper = mountBar({ isDraft: true });
    const badge = wrapper.get('[data-testid="draft-badge"]');
    expect(badge.element.closest(".bar-row")).not.toBeNull();
    expect(badge.attributes("role")).toBe("status");
    expect(badge.text()).toContain("Draft");
    expect(badge.get(".sr-only").text()).toContain(
      "only creators can see this chapter"
    );
    // Right after the logo.
    expect(
      badge.element.previousElementSibling.classList.contains("wordmark")
    ).toBe(true);
    wrapper.unmount();
  });

  // At 320px the 47px badge pushed the account menu off the bar. Below
  // 400px it is an amber dot whose word stays for screen readers.
  it("keeps the draft notice whole for screen readers when it shrinks to a dot", () => {
    const wrapper = mountBar({ isDraft: true });
    const badge = wrapper.get('[data-testid="draft-badge"]');
    // The visible word is its own element, so the narrow rule can hide it
    // visually without hiding it from screen readers.
    expect(badge.get(".draft-badge-label").text()).toBe("Draft");
    expect(badge.text().replace(/\s+/g, " ")).toBe(
      "Draft, only creators can see this chapter"
    );
    wrapper.unmount();
  });

  // happy-dom has no layout, so the narrow-screen sizes are held by the CSS.
  it("draws the draft badge as a dot below 400px, its word visually hidden", () => {
    const narrow = mediaBlock("(max-width: 399px)");
    const dot = rule(narrow, ".draft-badge");
    expect(dot).toMatch(/width:\s*8px/);
    expect(dot).toMatch(/height:\s*8px/);
    expect(dot).toMatch(/padding:\s*0/);
    expect(dot).toMatch(/border-radius:\s*50%/);
    const label = rule(narrow, ".draft-badge-label");
    expect(label).toMatch(/position:\s*absolute/);
    expect(label).toMatch(/width:\s*1px/);
    expect(label).toMatch(/clip:\s*rect\(0,\s*0,\s*0,\s*0\)/);
    // Not display:none, which would take the word from screen readers too.
    expect(label).not.toMatch(/display:\s*none/);
  });

  it("on a phone shows the book without the words and keeps the right-hand controls together", () => {
    const phone = mediaBlock("(max-width: 640px)");
    expect(rule(phone, ".wordmark-logo")).toMatch(/--logo-crop:\s*1/);
    // The free space goes before the search button, not after it.
    expect(rule(phone, ".spacer")).toMatch(/order:\s*-1/);
  });

  it("shows no draft badge on a published chapter", () => {
    const wrapper = mountBar();
    expect(wrapper.find('[data-testid="draft-badge"]').exists()).toBe(false);
    wrapper.unmount();
  });

  // Stuart, 11 Nov (OPENBRAIN-197): "replace 'info', 'notebook', and 'chat'
  // on the top right with a question mark".
  it("has no Info / Notebook / Chat buttons of its own, signed in or not", () => {
    for (const isAuthenticated of [true, false]) {
      const wrapper = mountBar({ isAuthenticated });
      expect(wrapper.find(".tool-buttons").exists()).toBe(false);
      expect(wrapper.find(".tool-btn").exists()).toBe(false);
      wrapper.unmount();
    }
  });

  // The "?" moved from the chapter cover, where it scrolled away, to the
  // bar's right end (Stuart, 12 Nov; OPENBRAIN-189).
  describe("help", () => {
    it("is a named 44px control at the bar's right end, before the account menu", () => {
      const wrapper = mountBar();
      const help = wrapper.get('[data-testid="reader-help-button"]');
      expect(help.element.tagName).toBe("BUTTON");
      expect(help.attributes("aria-label")).toMatch(/^Help/);
      expect(help.attributes("aria-haspopup")).toBe("dialog");
      expect(help.attributes("aria-expanded")).toBe("false");
      expect(help.element.closest(".bar-row")).not.toBeNull();
      // After the spacer: the right end of the bar.
      const row = [...wrapper.get(".bar-row").element.children];
      expect(row.indexOf(help.element)).toBeGreaterThan(
        row.indexOf(wrapper.get(".spacer").element)
      );
      expect(rule(source, ".help-btn")).toMatch(/min-width:\s*44px/);
      expect(rule(source, ".help-btn")).toMatch(/min-height:\s*44px/);
      wrapper.unmount();
    });

    it("is there for readers who are not signed in, without the tools", async () => {
      const wrapper = mountBar({ isAuthenticated: false });
      const help = wrapper.get('[data-testid="reader-help-button"]');
      expect(help.attributes("aria-label")).toBe("Help and animations");
      await help.trigger("click");
      await flushPromises();
      expect(wrapper.find('[data-testid="reader-help"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="reader-help-tools"]').exists()).toBe(
        false
      );
      wrapper.unmount();
    });

    it("opens a named panel, takes focus into it and gives it back on Escape", async () => {
      const wrapper = mountBar();
      const help = wrapper.get('[data-testid="reader-help-button"]');
      await help.trigger("click");
      await flushPromises();
      const panel = wrapper.get('[data-testid="reader-help"]');
      expect(help.attributes("aria-expanded")).toBe("true");
      expect(help.attributes("aria-controls")).toBe(panel.attributes("id"));
      expect(panel.attributes("role")).toBe("dialog");
      expect(
        document.getElementById(panel.attributes("aria-labelledby")).textContent
      ).toMatch(/How to read this book/);
      expect(document.activeElement).toBe(panel.element);
      // The animations switch is in it.
      expect(panel.find('input[type="radio"][value="device"]').exists()).toBe(
        true
      );

      await panel.trigger("keydown", { key: "Escape" });
      await flushPromises();
      expect(wrapper.find('[data-testid="reader-help"]').exists()).toBe(false);
      expect(document.activeElement).toBe(help.element);
      wrapper.unmount();
    });

    it("closes from its own close button and from a press outside", async () => {
      const wrapper = mountBar();
      const help = wrapper.get('[data-testid="reader-help-button"]');
      await help.trigger("click");
      await flushPromises();
      await wrapper.get('[aria-label="Close help"]').trigger("click");
      await flushPromises();
      expect(wrapper.find('[data-testid="reader-help"]').exists()).toBe(false);
      expect(document.activeElement).toBe(help.element);

      await help.trigger("click");
      await flushPromises();
      await wrapper
        .get('[data-testid="reader-help-backdrop"]')
        .trigger("click");
      await flushPromises();
      expect(wrapper.find('[data-testid="reader-help"]').exists()).toBe(false);
      wrapper.unmount();
    });

    it("signed in, offers Info, Notebook and Chat as buttons in the panel", async () => {
      const wrapper = mountBar({ isAuthenticated: true });
      const help = wrapper.get('[data-testid="reader-help-button"]');
      expect(help.attributes("aria-label")).toBe(
        "Help, Info, Notebook and Chat"
      );
      await help.trigger("click");
      await flushPromises();
      const tools = wrapper
        .get('[data-testid="reader-help-tools"]')
        .findAll("button");
      expect(tools.map((t) => t.attributes("data-tool"))).toEqual([
        "info",
        "notebook",
        "chat",
      ]);
      expect(
        tools.map((t) => t.get(".reader-help__tool-title").text())
      ).toEqual(["Info", "Notebook", "Chat"]);
      for (const tool of tools)
        expect(tool.attributes("aria-controls")).toBe("reader-sidebar");
      wrapper.unmount();
    });

    it("a tool opens that tab of the reader's panel, with focus back on the “?” first", async () => {
      const wrapper = mountBar({ isAuthenticated: true });
      const help = wrapper.get('[data-testid="reader-help-button"]');
      await help.trigger("click");
      await flushPromises();
      // ReaderSidebar gives focus back, on close, to whatever had it when it
      // opened: that must be the "?", not a button of a panel that is gone.
      sidebar.open.mockImplementationOnce((tab) => {
        expect(document.activeElement).toBe(help.element);
        expect(wrapper.find('[data-testid="reader-help"]').exists()).toBe(
          false
        );
        sidebar.activeTab.value = tab;
        sidebar.isOpen.value = true;
      });
      await wrapper.get('[data-tool="notebook"]').trigger("click");
      await flushPromises();
      expect(sidebar.open).toHaveBeenCalledWith("notebook");

      // Opened again, the panel marks the tab that is showing.
      await help.trigger("click");
      await flushPromises();
      expect(
        wrapper.get('[data-tool="notebook"]').attributes("aria-current")
      ).toBe("true");
      expect(
        wrapper.get('[data-tool="info"]').attributes("aria-current")
      ).toBeUndefined();
      wrapper.unmount();
    });

    it("closes when the search field is used", async () => {
      const wrapper = mountBar();
      await wrapper.get('[data-testid="reader-help-button"]').trigger("click");
      await flushPromises();
      expect(wrapper.find('[data-testid="reader-help"]').exists()).toBe(true);
      await wrapper.get('[data-testid="reader-search-input"]').trigger("focus");
      await flushPromises();
      expect(wrapper.find('[data-testid="reader-help"]').exists()).toBe(false);
      wrapper.unmount();
    });

    it("fills the bar's width less 8px each side on a phone", () => {
      const phone = mediaBlock("(max-width: 640px)");
      const panel = rule(phone, ".help-panel");
      expect(panel).toMatch(/left:\s*8px/);
      expect(panel).toMatch(/right:\s*8px/);
    });
  });
});
