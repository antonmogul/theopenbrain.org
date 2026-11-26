import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import ReaderTopBar from "@/components/chapter/ReaderTopBar.vue";
import { usePreferences } from "@/composables/usePreferences";

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

const mountBar = (props = {}) =>
  mount(ReaderTopBar, {
    props,
    attachTo: document.body,
    global: { stubs: { RouterLink: true } },
  });

const tools = (wrapper) => wrapper.get(".tools");
const toolsButton = (wrapper) =>
  wrapper.get('[data-testid="reader-tools-button"]');
const isOpen = (wrapper) =>
  toolsButton(wrapper).attributes("aria-expanded") === "true";
// happy-dom has no real pointer; the handlers read pointerType.
const point = (wrapper, type, pointerType = "mouse") => {
  const event = new Event(type);
  event.pointerType = pointerType;
  tools(wrapper).element.dispatchEvent(event);
  return wrapper.vm.$nextTick();
};

beforeEach(() => {
  generalStore.activeMenu = false;
  sidebar.isOpen.value = false;
  sidebar.open.mockClear();
});

describe("ReaderTopBar accessibility", () => {
  // Maura's sketch, 23 Nov (OPENBRAIN-78): a slim dark bar; the book's mark
  // and a search icon on the left, TOOLS on the right.
  it("is the mark, the search and TOOLS, in that order", () => {
    const wrapper = mountBar();
    const row = [...wrapper.get(".bar-row").element.children];
    const at = (selector) => row.indexOf(wrapper.get(selector).element);
    expect(at(".reader-menu-btn")).toBe(0);
    expect(at('[data-testid="reader-search"]')).toBeGreaterThan(
      at(".reader-menu-btn")
    );
    expect(at(".spacer")).toBeGreaterThan(at('[data-testid="reader-search"]'));
    expect(at(".tools")).toBeGreaterThan(at(".spacer"));
    // No account button: the account is in the drawer's foot.
    expect(wrapper.find(".account").exists()).toBe(false);
    const input = wrapper.get('[data-testid="reader-search-input"]');
    expect(input.attributes("role")).toBe("combobox");
    expect(input.attributes("aria-label")).toBe("Search this chapter");
    wrapper.unmount();
  });

  // Maura, 25 Nov (OPENBRAIN-92): "the navbar background should be #131313".
  it("takes its height from --reader-topbar-h, on its own ground", () => {
    const bar = rule(source, ".reader-top-bar");
    expect(bar).toMatch(/height:\s*var\(--reader-topbar-h/);
    expect(bar).toMatch(/box-sizing:\s*border-box/);
    expect(bar).toMatch(/--bar-bg:\s*var\(--color-topbar\)/);
    const brand = readFileSync(
      resolve(__dirname, "../../../styles/brand.css"),
      "utf8"
    );
    expect(brand).toMatch(/--color-topbar:\s*19 19 19;/);
    // 56px: the 44px targets with 6px above and below.
    expect(brand).toMatch(/--reader-topbar-h:\s*3\.5rem;/);
  });

  // "The stroke on the brain, book, home and search icons should match
  // optically" (OPENBRAIN-92): the mark is drawn as a line icon.
  it("draws the mark as a line icon, the brain's line the search icon's weight", () => {
    const wrapper = mountBar();
    const logo = wrapper.get('[data-testid="book-logo"]');
    expect(logo.classes()).toContain("book-logo--icon");
    expect(logo.find("path.logo-brain").exists()).toBe(true);
    const mark = rule(source, ".menu-logo");
    expect(mark).toMatch(/--logo-brain-stroke:\s*1\.25px/);
    expect(mark).toMatch(/--logo-stroke:\s*0\.85px/);
    // The search icon: 20px of a 24 box at 1.5, which is 1.25px.
    const glass = wrapper.get('[data-testid="reader-search-toggle"] svg');
    expect(glass.attributes("width")).toBe("20");
    expect(glass.attributes("stroke-width")).toBe("1.5");
    wrapper.unmount();
  });

  it("the mark is a button that opens the chapter menu", async () => {
    const wrapper = mountBar();
    const menu = wrapper.get('[aria-label="Open chapter menu"]');
    expect(menu.element.tagName).toBe("BUTTON");
    expect(menu.attributes("aria-haspopup")).toBe("dialog");
    expect(menu.attributes("aria-expanded")).toBe("false");
    await menu.trigger("click");
    expect(generalStore.activeMenu).toBe(true);
    wrapper.unmount();
  });

  // Reading progress moved to the chapter timeline's slider (OPENBRAIN-128).
  it("carries no progress bar of its own", () => {
    const wrapper = mountBar();
    expect(wrapper.find('[role="progressbar"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it("marks a draft in the bar itself, telling screen readers who can see it", () => {
    const wrapper = mountBar({ isDraft: true });
    const badge = wrapper.get('[data-testid="draft-badge"]');
    expect(badge.element.closest(".bar-row")).not.toBeNull();
    expect(badge.attributes("role")).toBe("status");
    expect(badge.get(".draft-badge-label").text()).toBe("Draft");
    expect(badge.text().replace(/\s+/g, " ")).toBe(
      "Draft, only creators can see this chapter"
    );
    // Right after the mark.
    expect(
      badge.element.previousElementSibling.classList.contains("reader-menu-btn")
    ).toBe(true);
    wrapper.unmount();
  });

  // happy-dom has no layout, so the narrow-screen sizes are held by the CSS.
  it("draws the draft badge as a dot below 400px, its word visually hidden", () => {
    const narrow = mediaBlock("(max-width: 399px)");
    const dot = rule(narrow, ".draft-badge");
    expect(dot).toMatch(/width:\s*8px/);
    expect(dot).toMatch(/height:\s*8px/);
    expect(dot).toMatch(/border-radius:\s*50%/);
    const label = rule(narrow, ".draft-badge-label");
    expect(label).toMatch(/position:\s*absolute/);
    expect(label).toMatch(/clip:\s*rect\(0,\s*0,\s*0,\s*0\)/);
    // Not display:none, which would take the word from screen readers too.
    expect(label).not.toMatch(/display:\s*none/);
  });

  it("shows no draft badge on a published chapter", () => {
    const wrapper = mountBar();
    expect(wrapper.find('[data-testid="draft-badge"]').exists()).toBe(false);
    wrapper.unmount();
  });

  describe("on the chapter cover", () => {
    const frame = window.requestAnimationFrame;
    beforeEach(() => {
      window.requestAnimationFrame = (fn) => (Promise.resolve().then(fn), 1);
    });
    afterEach(() => {
      window.requestAnimationFrame = frame;
      window.scrollY = 0;
      usePreferences().reduceMotion.value = "auto";
    });
    const scrollTo = async (y) => {
      window.scrollY = y;
      window.dispatchEvent(new Event("scroll"));
      await flushPromises();
    };

    it("scrubs one home logo into the bar at 56px and restores it on reverse scroll", async () => {
      const wrapper = mountBar({ hideOnCover: true });
      const link = wrapper.get('[data-testid="cover-logo-link"]');
      expect(link.attributes("href")).toBe("/");
      expect(link.isVisible()).toBe(true);
      await scrollTo(28);
      expect(link.element.style.getPropertyValue("--cover-progress")).toBe(
        "0.5"
      );
      await scrollTo(56);
      expect(link.isVisible()).toBe(false);
      expect(wrapper.get(".reader-top-bar").classes()).not.toContain(
        "is-cover"
      );
      await scrollTo(0);
      expect(link.isVisible()).toBe(true);
      wrapper.unmount();
    });

    it("keeps the full logo still with animations off, including a live preference change", async () => {
      const wrapper = mountBar({ hideOnCover: true, isAuthenticated: true });
      const link = wrapper.get('[data-testid="cover-logo-link"]');
      expect(link.attributes("href")).toBe("/chapters");
      await scrollTo(28);
      usePreferences().reduceMotion.value = "on";
      await flushPromises();
      expect(link.element.style.getPropertyValue("--cover-progress")).toBe("0");
      expect(link.isVisible()).toBe(true);
      await scrollTo(56);
      expect(link.isVisible()).toBe(false);
      wrapper.unmount();
    });

    it("hands focused navigation to the bar and hides the cover while bar controls have focus", async () => {
      const wrapper = mountBar({ hideOnCover: true });
      const link = wrapper.get('[data-testid="cover-logo-link"]');
      link.element.focus();
      await scrollTo(56);
      expect(document.activeElement).toBe(
        wrapper.get(".reader-menu-btn").element
      );
      await scrollTo(0);
      expect(link.isVisible()).toBe(false);
      document.activeElement.blur();
      await flushPromises();
      expect(link.isVisible()).toBe(true);
      wrapper.unmount();
    });

    it("is not shown until the reader has scrolled past the cover's top", async () => {
      const wrapper = mountBar({ hideOnCover: true });
      const bar = wrapper.get(".reader-top-bar");
      expect(bar.classes()).toContain("is-cover");
      expect(bar.attributes("data-cover")).toBe("hidden");
      await scrollTo(400);
      expect(bar.classes()).not.toContain("is-cover");
      expect(bar.attributes("data-cover")).toBeUndefined();
      await scrollTo(0);
      expect(bar.classes()).toContain("is-cover");
      wrapper.unmount();
    });

    it("stays where it is, hidden with opacity, and shows for keyboard focus", () => {
      const css = source.slice(source.indexOf("<style"));
      const hidden = rule(
        css,
        ".reader-top-bar.is-cover:not(.is-held):not(:focus-within)"
      );
      expect(hidden).toMatch(/opacity:\s*0/);
      expect(hidden).toMatch(/pointer-events:\s*none/);
      // Its controls stay focusable, and its box stays measurable.
      expect(hidden).not.toMatch(/visibility|display|transform/);
    });

    it("is held while its drawer or its tools are open", async () => {
      const wrapper = mountBar({ hideOnCover: true });
      const bar = wrapper.get(".reader-top-bar");
      expect(bar.classes()).not.toContain("is-held");
      await toolsButton(wrapper).trigger("click");
      expect(bar.classes()).toContain("is-held");
      wrapper.unmount();
    });

    it("is always shown where there is no cover", () => {
      const wrapper = mountBar();
      expect(wrapper.get(".reader-top-bar").classes()).not.toContain(
        "is-cover"
      );
      wrapper.unmount();
    });
  });

  describe("TOOLS", () => {
    it("is a disclosure button, first in the document and last on screen", () => {
      const wrapper = mountBar();
      const button = toolsButton(wrapper);
      expect(button.text()).toBe("Tools");
      expect(button.attributes("aria-expanded")).toBe("false");
      const row = wrapper.get(`#${button.attributes("aria-controls")}`);
      expect(row.attributes("role")).toBe("group");
      expect(row.attributes("aria-label")).toBe("Reader tools");
      // Tab reaches TOOLS, then walks the row it opened.
      expect(tools(wrapper).element.firstElementChild).toBe(button.element);
      expect(rule(source, ".tools")).toMatch(/flex-direction:\s*row-reverse/);
      wrapper.unmount();
    });

    it("the closed row is out of the tab order, and keeps its place", () => {
      const css = source.slice(source.indexOf("<style"));
      expect(rule(css, ".tools-row")).toMatch(/visibility:\s*hidden/);
      expect(rule(css, ".tools.is-open .tools-row")).toMatch(
        /visibility:\s*visible/
      );
      // "Back to reading" lives in the row and must outlast it.
      expect(rule(css, ".tools-row :deep(.listen-return)")).toMatch(
        /visibility:\s*visible/
      );
    });

    // Maura, 25 Nov (OPENBRAIN-92): "open from right to left like an
    // accordion... slide back in the same way". happy-dom has no layout or
    // transitions, so the CSS holds it.
    it("opens out of TOOLS item by item, and never moves the row itself", () => {
      const css = source.slice(source.indexOf("<style"));
      const wide = mediaBlock("(min-width: 641px)");
      // Each rule names the buttons and Listen's; the last selector is
      // the one before the brace.
      const item = rule(wide, ".tools-row :deep(.listen-toggle)");
      expect(item).toMatch(/clip-path:\s*inset\(0 0 0 100%\)/);
      expect(item).toMatch(/transform:\s*translateX\(/);
      expect(item).toMatch(/--tools-delay:/);
      const open = rule(
        wide,
        ".tools.is-open .tools-row :deep(.listen-toggle)"
      );
      expect(open).toMatch(/clip-path:\s*inset\(0\)/);
      expect(open).toMatch(/transform:\s*none/);
      // The row: visibility only, at every width. A transform, a filter, a
      // clip or an opacity on it would capture "Back to reading" and the
      // panels that hang from the bar.
      for (const block of [css, wide])
        for (const selector of [".tools-row", ".tools.is-open .tools-row"])
          expect(rule(block, selector)).not.toMatch(
            /transform|opacity|clip-path|filter|overflow|contain/
          );
      // It stays visible until the last item has folded away.
      expect(rule(wide, ".tools-row")).toMatch(/transition:\s*visibility 0s/);
    });

    it("counts each item from TOOLS, so the opening can stagger", () => {
      const places = (wrapper) =>
        wrapper
          .get("#reader-tools")
          .findAll(".tool-btn")
          .map((b) => b.element.style.getPropertyValue("--i").trim());
      const out = mountBar({ isAuthenticated: false });
      expect(places(out)).toEqual(["0"]);
      expect(
        out.get("#reader-tools").element.style.getPropertyValue("--n").trim()
      ).toBe("2");
      out.unmount();
      const signedIn = mountBar({ isAuthenticated: true });
      // Info, Notebook, Chat, "?": the "?" is beside TOOLS.
      expect(places(signedIn)).toEqual(["3", "2", "1", "0"]);
      expect(
        signedIn
          .get("#reader-tools")
          .element.style.getPropertyValue("--n")
          .trim()
      ).toBe("5");
      signedIn.unmount();
    });

    it("does not animate under reduced motion, the reader's or the device's", () => {
      const css = source.slice(source.indexOf("<style"));
      // The reader's own "animations off". The rule lists several
      // selectors: find it by its first.
      const own = css.slice(css.indexOf(':root[data-reduce-motion="1"]'));
      expect(own.slice(0, own.indexOf("}"))).toMatch(
        /\.tools-row > \.tool-btn,[\s\S]*transition:\s*none/
      );
      const device = mediaBlock("(prefers-reduced-motion: reduce)");
      expect(device).toMatch(
        /:root:not\(\[data-reduce-motion="0"\]\) \.tools-row,/
      );
      expect(device).toMatch(/transition:\s*none/);
    });

    it("opens while a mouse points at it and closes a moment after it leaves", async () => {
      vi.useFakeTimers();
      const wrapper = mountBar();
      await point(wrapper, "pointerenter");
      expect(isOpen(wrapper)).toBe(true);
      expect(tools(wrapper).classes()).toContain("is-open");
      await point(wrapper, "pointerleave");
      expect(isOpen(wrapper)).toBe(true);
      vi.advanceTimersByTime(300);
      await wrapper.vm.$nextTick();
      expect(isOpen(wrapper)).toBe(false);
      vi.useRealTimers();
      wrapper.unmount();
    });

    it("on touch is a tap toggle, and a tap elsewhere closes it", async () => {
      const wrapper = mountBar();
      await point(wrapper, "pointerenter", "touch");
      expect(isOpen(wrapper)).toBe(false);
      await toolsButton(wrapper).trigger("click");
      expect(isOpen(wrapper)).toBe(true);
      await toolsButton(wrapper).trigger("click");
      expect(isOpen(wrapper)).toBe(false);

      await toolsButton(wrapper).trigger("click");
      expect(isOpen(wrapper)).toBe(true);
      const down = new Event("pointerdown", { bubbles: true });
      down.pointerType = "touch";
      document.body.dispatchEvent(down);
      await wrapper.vm.$nextTick();
      expect(isOpen(wrapper)).toBe(false);
      wrapper.unmount();
    });

    it("opens for keyboard focus, and Escape closes it with focus on TOOLS", async () => {
      const wrapper = mountBar();
      const button = toolsButton(wrapper);
      const matches = button.element.matches.bind(button.element);
      button.element.matches = (selector) =>
        selector === ":focus-visible" ? true : matches(selector);
      button.element.focus();
      await wrapper.vm.$nextTick();
      expect(isOpen(wrapper)).toBe(true);
      await button.trigger("keydown", { key: "Escape" });
      expect(isOpen(wrapper)).toBe(false);
      expect(document.activeElement).toBe(button.element);
      wrapper.unmount();
    });

    it("signed out offers Listen and help; signed in, Info, Notebook and Chat too", () => {
      const names = (wrapper) =>
        wrapper
          .get("#reader-tools")
          .findAll(".tool-btn")
          .map((b) => b.attributes("data-tool") || "help");
      const out = mountBar({ isAuthenticated: false });
      expect(names(out)).toEqual(["help"]);
      out.unmount();
      const signedIn = mountBar({ isAuthenticated: true });
      expect(names(signedIn)).toEqual(["info", "notebook", "chat", "help"]);
      for (const tool of signedIn.findAll("[data-tool]"))
        expect(tool.attributes("aria-controls")).toBe("reader-sidebar");
      signedIn.unmount();
    });

    it("a tool opens that tab of the reader's panel, with focus on TOOLS first", async () => {
      const wrapper = mountBar({ isAuthenticated: true });
      await toolsButton(wrapper).trigger("click");
      // ReaderSidebar gives focus back, on close, to whatever had it when
      // it opened: TOOLS, which is always there; the row's buttons are not.
      sidebar.open.mockImplementationOnce((tab) => {
        expect(document.activeElement).toBe(toolsButton(wrapper).element);
        sidebar.activeTab.value = tab;
        sidebar.isOpen.value = true;
      });
      await wrapper.get('[data-tool="notebook"]').trigger("click");
      await flushPromises();
      expect(sidebar.open).toHaveBeenCalledWith("notebook");
      expect(
        wrapper.get('[data-tool="notebook"]').attributes("aria-current")
      ).toBe("true");
      expect(
        wrapper.get('[data-tool="info"]').attributes("aria-current")
      ).toBeUndefined();
      wrapper.unmount();
    });

    it("opens as a sheet under the bar on a phone", () => {
      const phone = mediaBlock("(max-width: 640px)");
      const sheet = rule(phone, ".tools-row");
      expect(sheet).toMatch(/position:\s*absolute/);
      expect(sheet).toMatch(/top:\s*100%/);
      expect(sheet).toMatch(/flex-wrap:\s*wrap/);
    });
  });

  // The "?" (OPENBRAIN-189), now the last of the Tools row.
  describe("help", () => {
    it("is a named 44px control in the Tools row", () => {
      const wrapper = mountBar();
      const help = wrapper.get('[data-testid="reader-help-button"]');
      expect(help.element.tagName).toBe("BUTTON");
      expect(help.attributes("aria-label")).toBe("Help and animations");
      expect(help.attributes("aria-haspopup")).toBe("dialog");
      expect(help.attributes("aria-expanded")).toBe("false");
      expect(help.element.closest("#reader-tools")).not.toBeNull();
      expect(source).toMatch(/min-width:\s*44px;\s*min-height:\s*44px/);
      wrapper.unmount();
    });

    it("opens a named panel, takes focus into it, holds the row open and gives focus back on Escape", async () => {
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
      expect(isOpen(wrapper)).toBe(true);
      // The animations switch is in it; the tools are in the row, not here.
      expect(panel.find('input[type="radio"][value="device"]').exists()).toBe(
        true
      );
      expect(wrapper.find('[data-testid="reader-help-tools"]').exists()).toBe(
        false
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

      await help.trigger("click");
      await flushPromises();
      await wrapper
        .get('[data-testid="reader-help-backdrop"]')
        .trigger("click");
      await flushPromises();
      expect(wrapper.find('[data-testid="reader-help"]').exists()).toBe(false);
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
