import { describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import ReaderTopBar from "@/components/chapter/ReaderTopBar.vue";

/*
 * Stuart, 1 Oct (OPENBRAIN-145): "there is the '3 horizontal lines' thing,
 * and the drawing of a globe with the words 'The Open Brain'. Clicking both
 * seems to do about the same thing ... just need 1 of these." They were one
 * button. Now the lines open the chapter menu and the wordmark is the
 * book's logo, a link home.
 */
const generalStore = vi.hoisted(() => ({
  progress: 0,
  currentSubChapter: "introduction",
  activeMenu: false,
}));

vi.mock("@/stores", () => ({ useGeneral: () => generalStore }));

vi.mock("@/composables/useReaderSidebar", async () => {
  const { ref } = await import("vue");
  return {
    useReaderSidebar: () => ({
      isOpen: ref(false),
      activeTab: ref("info"),
      toggle: vi.fn(),
    }),
  };
});

vi.mock("@/composables/useHomeRoute", () => ({
  useHomeRoute: () => "/chapters",
}));

vi.mock("@/components/Navigation/AccountMenu.vue", () => ({
  default: { name: "AccountMenu", render: () => null },
}));

function mountBar() {
  generalStore.activeMenu = false;
  return mount(ReaderTopBar, {
    props: {
      chapterNumber: "1",
      sections: [{ title: "Introduction", slug: "introduction" }],
    },
    global: {
      stubs: {
        RouterLink: {
          props: ["to"],
          template: '<a :href="to" data-router-link><slot /></a>',
        },
        Transition: false,
      },
    },
  });
}

describe("ReaderTopBar wordmark and menu", () => {
  it("the wordmark is a link home, not part of the menu button", () => {
    const wrapper = mountBar();
    const wordmark = wrapper.get(".wordmark");
    expect(wordmark.attributes("href")).toBe("/chapters");
    expect(wordmark.attributes("data-router-link")).toBeDefined();
    expect(wordmark.attributes("aria-label")).toMatch(/home/i);
    expect(wrapper.get(".reader-menu-btn").find(".wordmark").exists()).toBe(
      false
    );
  });

  it("only the three lines open the chapter menu", async () => {
    const wrapper = mountBar();
    await wrapper.get(".wordmark").trigger("click");
    expect(generalStore.activeMenu).toBe(false);
    const menu = wrapper.get(".reader-menu-btn");
    expect(menu.attributes("aria-label")).toBe("Open chapter menu");
    await menu.trigger("click");
    expect(generalStore.activeMenu).toBe(true);
  });

  it("the section menu jumps to a section by its own id, so a breakout box is reached too", async () => {
    // A box renders <aside id="<uuid>"> and no .trigger wrapper named after
    // its title, so the title slug found nothing for it.
    document.documentElement.setAttribute("data-reduce-motion", "1");
    const box = document.createElement("aside");
    box.id = "b1f2bfdc-6791-41fa-8182-c4486f2c4f83";
    box.getBoundingClientRect = () => ({ top: 900, height: 400 });
    document.body.appendChild(box);
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    const wrapper = mount(ReaderTopBar, {
      props: {
        chapterNumber: "1",
        sections: [
          { id: "intro-uuid", title: "Introduction", slug: "introduction" },
          { id: box.id, title: "Humoral theory", slug: "humoral-theory" },
        ],
      },
      attachTo: document.body,
      global: { stubs: { RouterLink: true, Transition: false } },
    });
    await wrapper.get(".section-jump").trigger("click");
    await wrapper.findAll(".dropdown-item")[1].trigger("click");
    expect(scrollTo).toHaveBeenCalledWith(
      expect.objectContaining({ top: 900 - 80 })
    );
    wrapper.unmount();
    box.remove();
    scrollTo.mockRestore();
    document.documentElement.removeAttribute("data-reduce-motion");
  });
});
