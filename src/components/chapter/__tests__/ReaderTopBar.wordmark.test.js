import { describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import ReaderTopBar from "@/components/chapter/ReaderTopBar.vue";

/*
 * Stuart, 1 Oct (OPENBRAIN-145): "there is the '3 horizontal lines' thing,
 * and the drawing of a globe with the words 'The Open Brain'. Clicking both
 * seems to do about the same thing ... just need 1 of these." They were one
 * button; the lines opened the chapter menu and the wordmark became a link
 * home.
 *
 * Stuart, 11 Nov (OPENBRAIN-197): "remove the globe and 'the open brain'
 * and replace with our logo", and "The 3 horizontal lines, maybe replace
 * with the open eye (from old retina chapter), and then the 'close eye'
 * once it's open to close it?"
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

vi.mock("@/composables/useHomeRoute", () => ({
  useHomeRoute: () => "/chapters",
}));

vi.mock("@/components/Navigation/AccountMenu.vue", () => ({
  default: { name: "AccountMenu", render: () => null },
}));

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

describe("ReaderTopBar logo and menu", () => {
  it("the logo is a link home, not part of the menu button", () => {
    const wrapper = mountBar();
    const wordmark = wrapper.get(".wordmark");
    expect(wordmark.attributes("href")).toBe("/chapters");
    expect(wordmark.attributes("data-router-link")).toBeDefined();
    expect(wordmark.attributes("aria-label")).toMatch(/home/i);
    expect(wrapper.get(".reader-menu-btn").find(".wordmark").exists()).toBe(
      false
    );
  });

  it("the logo is the book's own artwork, not the globe and the typed words", () => {
    const wrapper = mountBar();
    const logo = wrapper.get(".wordmark").get('[data-testid="book-logo"]');
    const svg = logo.get("svg");
    // The designers' file: its 308.6 × 104.2 box, the book's outline paths.
    expect(svg.attributes("viewBox")).toBe("0 0 308.6 104.2");
    expect(svg.findAll(".st1").length).toBeGreaterThan(20);
    // The link names it; the drawing is decorative.
    expect(svg.attributes("aria-hidden")).toBe("true");
    expect(wrapper.find(".wordmark-text").exists()).toBe(false);
    expect(wrapper.get(".wordmark").text()).toBe("");
    // The file's own <style> would restyle every other inline SVG.
    expect(logo.find("style").exists()).toBe(false);
  });

  it("only the eye opens the chapter menu", async () => {
    const wrapper = mountBar();
    await wrapper.get(".wordmark").trigger("click");
    expect(generalStore.reactive.activeMenu).toBe(false);
    const menu = wrapper.get(".reader-menu-btn");
    expect(menu.attributes("aria-label")).toBe("Open chapter menu");
    await menu.trigger("click");
    expect(generalStore.reactive.activeMenu).toBe(true);
  });

  it("the menu button is an open eye that closes while the menu is open", async () => {
    const wrapper = mountBar();
    const menu = wrapper.get(".reader-menu-btn");
    const eye = menu.get('[data-testid="menu-eye"]');
    expect(eye.attributes("data-eye")).toBe("open");
    expect(eye.attributes("aria-hidden")).toBe("true");
    expect(menu.attributes("aria-expanded")).toBe("false");
    await menu.trigger("click");
    expect(eye.attributes("data-eye")).toBe("closed");
    expect(eye.classes()).toContain("menu-eye--closed");
    expect(menu.attributes("aria-expanded")).toBe("true");
    generalStore.reactive.activeMenu = false;
    await wrapper.vm.$nextTick();
    expect(eye.attributes("data-eye")).toBe("open");
  });
});
