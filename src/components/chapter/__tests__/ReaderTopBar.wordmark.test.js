import { describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import ReaderTopBar from "@/components/chapter/ReaderTopBar.vue";

/*
 * The book's mark in the reader's top bar (OPENBRAIN-78; Maura's sketch,
 * 23 Nov): the open book alone, no words, and it is the menu button. It
 * opens the contents drawer and is a ✕ while the drawer is open. The way
 * home it used to be (OPENBRAIN-145, 197) is the drawer's home icon.
 */
const generalStore = vi.hoisted(() => ({
  progress: 0,
  currentSubChapter: "introduction",
  activeMenu: false,
}));

vi.mock("@/stores", async () => {
  const { reactive } = await import("vue");
  const store = reactive(generalStore);
  generalStore.reactive = store;
  return {
    useGeneral: () => store,
    useText: () => ({ text: { slug: "a-chapter", intro: [], sections: [] } }),
  };
});

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
  return {
    useReaderSidebar: () => ({
      isOpen: ref(false),
      activeTab: ref("info"),
      open: vi.fn(),
    }),
  };
});

function mountBar() {
  generalStore.reactive.activeMenu = false;
  return mount(ReaderTopBar, {
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

describe("ReaderTopBar mark and menu", () => {
  it("the mark is the book's own artwork, without the words, inside the menu button", () => {
    const wrapper = mountBar();
    const menu = wrapper.get(".reader-menu-btn");
    expect(menu.element.tagName).toBe("BUTTON");
    expect(menu.attributes("aria-label")).toBe("Open chapter menu");
    const logo = menu.get('[data-testid="book-logo"]');
    expect(logo.classes()).toContain("book-logo--mark");
    const svg = logo.get("svg");
    // The designers' file: its 308.6 × 104.2 box, the book's outline paths.
    expect(svg.attributes("viewBox")).toBe("0 0 308.6 104.2");
    expect(svg.findAll(".st1").length).toBeGreaterThan(20);
    // The button names it; the drawing is decorative.
    expect(svg.attributes("aria-hidden")).toBe("true");
    expect(menu.text()).toBe("");
    // The file's own <style> would restyle every other inline SVG.
    expect(logo.find("style").exists()).toBe(false);
    // Not a link home any more.
    expect(wrapper.find("a.wordmark").exists()).toBe(false);
  });

  it("the mark opens the chapter menu and is a ✕ while it is open", async () => {
    const wrapper = mountBar();
    const menu = wrapper.get(".reader-menu-btn");
    expect(menu.attributes("aria-expanded")).toBe("false");
    await menu.trigger("click");
    expect(generalStore.reactive.activeMenu).toBe(true);
    expect(menu.attributes("aria-expanded")).toBe("true");
    expect(menu.find('[data-testid="book-logo"]').exists()).toBe(false);
    expect(menu.find("svg line").exists()).toBe(true);
    generalStore.reactive.activeMenu = false;
    await wrapper.vm.$nextTick();
    expect(menu.find('[data-testid="book-logo"]').exists()).toBe(true);
  });
});
