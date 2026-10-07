import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
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

// The account menu has its own tests (AccountMenu.test.js).
vi.mock("@/components/Navigation/AccountMenu.vue", () => ({
  default: { name: "AccountMenu", render: () => null },
}));

describe("ReaderTopBar accessibility", () => {
  it("exposes section navigation as a disclosure and returns focus on Escape", async () => {
    const wrapper = mount(ReaderTopBar, {
      props: {
        chapterNumber: "1",
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

  it("has one chapter-menu control including the wordmark, without a home link", async () => {
    generalStore.activeMenu = false;
    const wrapper = mount(ReaderTopBar);
    const menu = wrapper.get('[aria-label="Open chapter menu"]');
    expect(menu.element.tagName).toBe("BUTTON");
    expect(menu.find(".wordmark").exists()).toBe(true);
    expect(wrapper.find("a.wordmark").exists()).toBe(false);
    await menu.trigger("click");
    expect(generalStore.activeMenu).toBe(true);
    wrapper.unmount();
    generalStore.activeMenu = false;
  });

  // Reading progress moved to the chapter timeline's slider (OPENBRAIN-128;
  // its aria-valuenow is tested in timeline/__tests__/ChapterTimeline.test.js).
  it("no longer carries a progress bar of its own", () => {
    const wrapper = mount(ReaderTopBar, {
      global: { stubs: { RouterLink: true } },
    });
    expect(wrapper.find('[role="progressbar"]').exists()).toBe(false);
    expect(wrapper.find(".progress-track").exists()).toBe(false);
  });

  // The draft notice was a fixed ribbon under the bar, over
  // TextComp's centred Edit chapter toggle and edit bar. It is now a badge
  // in the bar's own row, beside the chapter number.
  it("marks a draft in the bar itself, telling screen readers who can see it", () => {
    const wrapper = mount(ReaderTopBar, {
      props: { chapterNumber: "4", isDraft: true },
      global: { stubs: { RouterLink: true } },
    });
    const badge = wrapper.get('[data-testid="draft-badge"]');
    expect(badge.element.closest(".bar-row")).not.toBeNull();
    expect(badge.attributes("role")).toBe("status");
    expect(badge.text()).toContain("Draft");
    expect(badge.get(".sr-only").text()).toContain(
      "only creators can see this chapter"
    );
    // Right after the chapter number.
    expect(badge.element.previousElementSibling.textContent).toBe("Ch 4");
  });

  // At 320px the 47px badge pushed the account menu off the
  // bar (row 352px wide) and at 360-390px left the section name 0px wide.
  // Below 400px it is an amber dot whose word stays for screen readers.
  it("keeps the draft notice whole for screen readers when it shrinks to a dot", () => {
    const wrapper = mount(ReaderTopBar, {
      props: { chapterNumber: "4", isDraft: true },
      global: { stubs: { RouterLink: true } },
    });
    const badge = wrapper.get('[data-testid="draft-badge"]');
    // The visible word is its own element, so the narrow rule can hide it
    // visually without hiding it from screen readers.
    expect(badge.get(".draft-badge-label").text()).toBe("Draft");
    expect(badge.text().replace(/\s+/g, " ")).toBe(
      "Draft, only creators can see this chapter"
    );
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

  it("gives a phone's free bar space to the section name, not a spacer", () => {
    const phone = mediaBlock("(max-width: 640px)");
    expect(rule(phone, ".section-jump")).toMatch(/flex:\s*1/);
    expect(rule(phone, ".section-jump + .spacer")).toMatch(/display:\s*none/);
  });

  it("shows no draft badge on a published chapter", () => {
    const wrapper = mount(ReaderTopBar, {
      props: { chapterNumber: "1" },
      global: { stubs: { RouterLink: true } },
    });
    expect(wrapper.find('[data-testid="draft-badge"]').exists()).toBe(false);
  });

  it("does not expose unavailable student tools to anonymous readers", () => {
    const wrapper = mount(ReaderTopBar, {
      props: { isAuthenticated: false },
      global: { stubs: { RouterLink: true } },
    });
    expect(wrapper.find(".tool-buttons").exists()).toBe(false);
  });

  it("jumps below the bar and returns focus to the disclosure after a section is selected", async () => {
    const target = document.createElement("div");
    target.id = "introduction";
    target.getBoundingClientRect = () => ({ top: 500, height: 40 });
    document.body.appendChild(target);
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
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
    // readerJump: the section's top lands under the bar (no --reader-topbar-h
    // here, so its 64px fallback + 16).
    expect(scrollTo).toHaveBeenCalledWith(
      expect.objectContaining({ top: 500 - 80 })
    );
    expect(document.activeElement).toBe(disclosure.element);
    wrapper.unmount();
    target.remove();
    scrollTo.mockRestore();
  });
});
