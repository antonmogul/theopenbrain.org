// @vitest-environment happy-dom
/*
 * The chapter's close (OPENBRAIN-179): what it offers is what is really
 * there, a signed-out reader is told a button signs them in, and the stats
 * are only numbers that are true.
 */
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
vi.mock("vue-router", () => ({ useRouter: () => ({ push }) }));

const get = vi.fn();
vi.mock("@/services/api/client", () => ({ get: (...a) => get(...a) }));

const openFeedback = vi.fn();
vi.mock("@/composables/useFeedback", () => ({
  useFeedback: () => ({ openFeedback }),
}));

import EndOfChapterCallout from "../EndOfChapterCallout.vue";
import { useAuthStore } from "@/stores/auth";

// A router link that shows where it goes.
const RouterLink = {
  props: ["to"],
  template: '<a :href="to" data-router-link><slot /></a>',
};

const TAKEAWAYS = ["One.", "Two.", "Three."];
const NEXT = {
  number: 2,
  slug: "the-retina",
  title: "The Retina",
  description: "How the eye turns light into signals.",
  cover: "/publicAssets/images/00-matisse-bg.jpg",
  ramp: "perc",
};

// What the chapter has: a list of quiz rows, a number of flashcards.
function chapterHas({ quizzes = [], cards = 0 } = {}) {
  get.mockImplementation(async (endpoint) =>
    endpoint.startsWith("quizzes?")
      ? quizzes
      : Array.from({ length: cards }, (_, i) => ({ id: `c${i}` }))
  );
}

const wrappers = [];
async function mountClose(props = {}) {
  const wrapper = mount(EndOfChapterCallout, {
    props: {
      chapterNumber: 1,
      chapterTitle: "Foundations of Neuroscience",
      moduleId: "m1",
      keyTakeaways: TAKEAWAYS,
      nextChapter: NEXT,
      ...props,
    },
    global: { stubs: { RouterLink } },
    attachTo: document.body,
  });
  wrappers.push(wrapper);
  await flushPromises();
  return wrapper;
}

beforeEach(() => {
  setActivePinia(createPinia());
  push.mockReset();
  get.mockReset();
  openFeedback.mockReset();
  chapterHas();
});
afterEach(() => {
  for (const w of wrappers.splice(0)) w.unmount();
});

describe("the chapter in short", () => {
  it("heads the takeaways with the chapter's title and how many there are", async () => {
    const wrapper = await mountClose();
    expect(wrapper.find(".cc-kicker").text()).toMatch(
      /^Chapter 1\s+·\s+In short$/
    );
    expect(wrapper.find(".cc-title-lead").text()).toBe(
      "Foundations of Neuroscience"
    );
    expect(wrapper.find(".cc-title-rest").text()).toBe("in three ideas");
    expect(wrapper.findAll(".cc-takeaway-text").map((p) => p.text())).toEqual(
      TAKEAWAYS
    );
    expect(wrapper.findAll(".cc-takeaway-n").map((n) => n.text())).toEqual([
      "01",
      "02",
      "03",
    ]);
  });

  it("says one idea for one, and keeps a figure past nine", async () => {
    const one = await mountClose({ keyTakeaways: ["Only."] });
    expect(one.find(".cc-title-rest").text()).toBe("in one idea");
    const many = await mountClose({
      keyTakeaways: Array.from({ length: 11 }, (_, i) => `T${i}`),
    });
    expect(many.find(".cc-title-rest").text()).toBe("in 11 ideas");
  });

  it("closes a chapter without takeaways without an empty list", async () => {
    const wrapper = await mountClose({ keyTakeaways: [] });
    expect(wrapper.find(".cc-takeaways").exists()).toBe(false);
    expect(wrapper.find(".cc-kicker").text()).toMatch(/The end$/);
    expect(wrapper.find(".cc-title-rest").text()).toBe("ends here.");
    // Null (the column's value for a chapter without any) is no takeaways.
    const none = await mountClose({ keyTakeaways: null });
    expect(none.find(".cc-takeaways").exists()).toBe(false);
  });
});

describe("the reader's own numbers", () => {
  it("shows a signed-out reader none: there are none kept for them", async () => {
    const wrapper = await mountClose({
      timeSpentSeconds: 0,
      highlightCount: 0,
      noteCount: 0,
    });
    expect(wrapper.find(".cc-stats").exists()).toBe(false);
    // The old "1 min read" floor and "98% complete" are gone.
    expect(wrapper.text()).not.toMatch(/min read|complete/i);
  });

  it("shows a signed-in reader only the numbers there are", async () => {
    const wrapper = await mountClose({
      isAuthenticated: true,
      timeSpentSeconds: 2820,
      highlightCount: 1,
      noteCount: 0,
    });
    expect(wrapper.findAll(".cc-stat").map((s) => s.text())).toEqual([
      "47 min reading",
      "1 highlight",
    ]);
    const nothingYet = await mountClose({
      isAuthenticated: true,
      timeSpentSeconds: 40,
    });
    expect(nothingYet.find(".cc-stats").exists()).toBe(false);
  });
});

describe("test your knowledge", () => {
  it("offers nothing when the chapter has neither a quiz nor cards", async () => {
    const wrapper = await mountClose();
    expect(wrapper.find("[data-chapter-test]").exists()).toBe(false);
    expect(wrapper.html()).not.toContain('"/quiz"');
  });

  it("looks up the chapter's published quiz and its cards", async () => {
    await mountClose();
    const asked = get.mock.calls.map(([endpoint]) => endpoint);
    expect(asked).toContainEqual(
      expect.stringMatching(/^quizzes\?module_id=eq\.m1&is_published=is\.true/)
    );
    expect(asked).toContainEqual("flashcards?module_id=eq.m1&select=id");
  });

  it("offers the flashcards, by their number, to a signed-in reader", async () => {
    chapterHas({ cards: 24 });
    const wrapper = await mountClose({ isAuthenticated: true });
    const action = wrapper.find("[data-test-action]");
    expect(action.attributes("href")).toBe("/flashcards/m1");
    expect(action.text()).toContain("Review the flashcards");
    expect(wrapper.find(".cc-test-facts").text()).toContain(
      "24 flashcards from this chapter."
    );
    expect(wrapper.find(".cc-test-note").exists()).toBe(false);
  });

  it("leads with the quiz when there is one, the cards beside it", async () => {
    chapterHas({
      quizzes: [
        {
          id: "q1",
          title: "History quiz",
          time_limit_minutes: 10,
          quiz_questions: [{ count: 12 }],
        },
      ],
      cards: 1,
    });
    const wrapper = await mountClose({ isAuthenticated: true });
    const action = wrapper.find("[data-test-action]");
    expect(action.attributes("href")).toBe("/quiz/q1");
    expect(action.text()).toContain("Take the quiz");
    expect(wrapper.find(".cc-test-facts").text()).toContain(
      "12 questions, about 10 min"
    );
    const also = wrapper.find(".cc-button--quiet");
    expect(also.attributes("href")).toBe("/flashcards/m1");
    expect(also.text()).toBe("1 flashcard");
  });

  it("tells a signed-out reader the button signs them in, and carries on once they are in", async () => {
    chapterHas({ cards: 24 });
    const wrapper = await mountClose();
    const auth = useAuthStore();
    const action = wrapper.find("[data-test-action]");
    // Not a link to a route that would drop them on the home page.
    expect(action.element.tagName).toBe("BUTTON");
    expect(action.text()).toContain("Sign in to review them");
    expect(wrapper.find(".cc-test-note").text()).toMatch(/need an account/);

    await action.trigger("click");
    expect(auth.activeAuth).toBe(true);
    expect(auth.authView).toBe("login");
    expect(push).not.toHaveBeenCalled();

    await wrapper.setProps({ isAuthenticated: true });
    expect(push).toHaveBeenCalledWith("/flashcards/m1");
  });

  it("forgets the errand when the sign-in dialog is closed", async () => {
    chapterHas({ cards: 3 });
    const wrapper = await mountClose();
    const auth = useAuthStore();
    await wrapper.find("[data-test-action]").trigger("click");
    auth.activeAuth = false;
    await flushPromises();
    // Signing in later, from the top bar, does not send them to the cards.
    await wrapper.setProps({ isAuthenticated: true });
    expect(push).not.toHaveBeenCalled();
  });

  it("offers nothing rather than a broken link when the lookup fails", async () => {
    get.mockRejectedValue(new Error("offline"));
    const wrapper = await mountClose({ isAuthenticated: true });
    expect(wrapper.find("[data-chapter-test]").exists()).toBe(false);
  });
});

describe("the ways on", () => {
  it("links the overview, opens feedback about this chapter, and goes to the top", async () => {
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    const wrapper = await mountClose();
    const [overview, feedback, top] = wrapper.findAll(".cc-link");
    expect(overview.attributes("href")).toBe("/chapter/1");
    await feedback.trigger("click");
    expect(openFeedback).toHaveBeenCalledWith({
      moduleId: "m1",
      label: "Chapter 1 · Foundations of Neuroscience",
    });
    await top.trigger("click");
    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 0 }));
    scrollTo.mockRestore();
  });

  it("leads out to the next chapter, in its own colour, with its cover", async () => {
    const wrapper = await mountClose();
    const next = wrapper.find("[data-chapter-next]");
    expect(next.attributes("href")).toBe("/chapter/2/the-retina");
    expect(next.attributes("data-chapter")).toBe("perc");
    expect(next.find(".cc-next-kicker").text()).toMatch(
      /^Up next\s+·\s+Chapter\s+2$/
    );
    expect(next.find(".cc-next-title").text()).toBe("The Retina");
    expect(next.find(".cc-next-desc").text()).toBe(NEXT.description);
    expect(next.find("img").attributes("src")).toBe(NEXT.cover);
    expect(next.find("img").attributes("alt")).toBe("");
  });

  it("keeps the card without a cover that does not load", async () => {
    const wrapper = await mountClose();
    await wrapper.find(".cc-next-cover img").trigger("error");
    expect(wrapper.find(".cc-next-cover").exists()).toBe(false);
    expect(wrapper.find("[data-chapter-next]").classes()).toContain(
      "cc-next--plain"
    );
  });

  it("leads the last chapter back to the book", async () => {
    const wrapper = await mountClose({ nextChapter: null });
    const next = wrapper.find("[data-chapter-next]");
    expect(next.attributes("href")).toBe("/chapters");
    expect(next.find(".cc-next-title").text()).toBe("All chapters");
    expect(next.attributes("data-chapter")).toBeUndefined();
  });
});

describe("arriving", () => {
  it("shows the takeaways at once where nothing can bring them in", async () => {
    // happy-dom has no IntersectionObserver unless a test supplies one.
    const original = globalThis.IntersectionObserver;
    delete globalThis.IntersectionObserver;
    const wrapper = await mountClose();
    expect(wrapper.find(".cc").classes()).not.toContain("cc--waiting");
    globalThis.IntersectionObserver = original;
  });

  it("holds them until the close comes on screen, then lets them in", async () => {
    const original = globalThis.IntersectionObserver;
    let seen = null;
    const disconnect = vi.fn();
    globalThis.IntersectionObserver = class {
      constructor(callback) {
        seen = callback;
      }
      observe() {}
      disconnect() {
        disconnect();
      }
    };
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    const wrapper = await mountClose();
    expect(wrapper.find(".cc").classes()).toContain("cc--waiting");
    seen([{ isIntersecting: false }]);
    await flushPromises();
    expect(wrapper.find(".cc").classes()).toContain("cc--waiting");
    seen([{ isIntersecting: true }]);
    await flushPromises();
    expect(wrapper.find(".cc").classes()).not.toContain("cc--waiting");
    expect(disconnect).toHaveBeenCalled();
    vi.unstubAllGlobals();
    globalThis.IntersectionObserver = original;
  });

  it("does not hold them under reduced motion", async () => {
    const original = globalThis.IntersectionObserver;
    globalThis.IntersectionObserver = class {
      observe() {}
      disconnect() {}
    };
    document.documentElement.setAttribute("data-reduce-motion", "1");
    const wrapper = await mountClose();
    expect(wrapper.find(".cc").classes()).not.toContain("cc--waiting");
    document.documentElement.removeAttribute("data-reduce-motion");
    globalThis.IntersectionObserver = original;
  });
});
