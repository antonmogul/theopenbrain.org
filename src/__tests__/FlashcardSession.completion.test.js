import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { ref } from "vue";
import FlashcardPanel from "@/components/chapter/demos/FlashcardPanel.vue";
import FlashcardView from "@/views/FlashcardView.vue";

const api = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("@/services/api/client", () => ({ authedRequest: api.request }));
vi.mock("@/composables/useAuth", () => ({
  useAuth: () => ({
    user: ref({ id: "student-1" }),
    isAuthenticated: ref(true),
  }),
}));
vi.mock("vue-router", () => ({
  useRoute: () => ({ params: { moduleId: "chapter-1" } }),
  useRouter: () => ({ push: vi.fn() }),
}));

let cards;
const wrappers = [];
const cardStub = {
  props: ["card"],
  emits: ["flip"],
  template:
    '<button class="test-card" @click="$emit(\'flip\')">{{ card.id }}</button>',
};
const statsStub = {
  props: ["stats"],
  emits: ["study-again"],
  template:
    '<div class="test-summary">{{ stats.correct }} correct; {{ stats.skipped }} skipped<button @click="$emit(\'study-again\')">Study again</button></div>',
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(Math, "random").mockReturnValue(0.5);
  cards = [
    { id: "first", tags: [] },
    { id: "last", tags: [] },
  ];
  api.request.mockImplementation(async (path, options) => {
    if (path.startsWith("flashcards?")) return cards.map((c) => ({ ...c }));
    if (path.startsWith("flashcard_responses?")) return [];
    if (path === "flashcard_sessions" && options?.method === "POST")
      return [{ id: "session-1" }];
    return [];
  });
});
afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
  vi.restoreAllMocks();
});

const writes = (path, method) =>
  api.request.mock.calls.filter(
    ([p, options]) => p === path && options?.method === method
  );

for (const [name, component] of [
  ["reader panel", FlashcardPanel],
  ["study page", FlashcardView],
]) {
  describe(`Flashcards ${name}: complete only after the final card`, () => {
    async function open() {
      const wrapper = mount(component, {
        props: component === FlashcardPanel ? { moduleId: "chapter-1" } : {},
        global: {
          stubs: {
            FlashcardCard: cardStub,
            FlashcardStats: statsStub,
            FlashcardGuide: true,
            Teleport: true,
            Transition: false,
          },
        },
      });
      wrappers.push(wrapper);
      await flushPromises();
      return wrapper;
    }

    it.each(["rate", "skip"])(
      "presents and processes the last card when using %s",
      async (action) => {
        const wrapper = await open();
        const selector =
          action === "rate"
            ? '[data-testid="rate-3"]'
            : '[data-testid="skip-card"]';
        await wrapper.get(".test-card").trigger("click");
        await wrapper.get(selector).trigger("click");
        await flushPromises();
        expect(
          writes("flashcard_sessions?id=eq.session-1", "PATCH")
        ).toHaveLength(0);
        expect(wrapper.get(".test-card").text()).toBe("last");
        await wrapper.get(".test-card").trigger("click");
        await wrapper.get(selector).trigger("click");
        await flushPromises();
        expect(
          writes("flashcard_sessions?id=eq.session-1", "PATCH")
        ).toHaveLength(1);
        expect(wrapper.get(".test-summary").text()).toContain(
          action === "rate" ? "2 correct" : "2 skipped"
        );
        if (action === "rate") {
          expect(
            writes("flashcard_responses", "POST").map(
              ([, options]) => JSON.parse(options.body).flashcard_id
            )
          ).toEqual(["first", "last"]);
        }
      }
    );

    it("keeps a failed answer on the same card and counts its successful retry once", async () => {
      const wrapper = await open();
      const normalRequest = api.request.getMockImplementation();
      let failOnce = true;
      vi.spyOn(console, "error").mockImplementation(() => {});
      api.request.mockImplementation((path, options) => {
        if (path === "flashcard_responses" && failOnce) {
          failOnce = false;
          return Promise.reject(new Error("offline"));
        }
        return normalRequest(path, options);
      });
      await wrapper.get(".test-card").trigger("click");
      await wrapper.get('[data-testid="rate-3"]').trigger("click");
      await flushPromises();
      expect(wrapper.get(".test-card").text()).toBe("first");
      expect(
        writes("flashcard_sessions?id=eq.session-1", "PATCH")
      ).toHaveLength(0);
      await wrapper.get('[data-testid="rate-3"]').trigger("click");
      await flushPromises();
      await wrapper.get(".test-card").trigger("click");
      await wrapper.get('[data-testid="rate-3"]').trigger("click");
      await flushPromises();
      expect(wrapper.get(".test-summary").text()).toContain("2 correct");
    });

    it("ignores repeated rating and skip keys while an answer is saving", async () => {
      const wrapper = await open();
      const normalRequest = api.request.getMockImplementation();
      let finish;
      api.request.mockImplementation((path, options) => {
        if (path === "flashcard_responses")
          return new Promise((resolve) => {
            finish = resolve;
          });
        return normalRequest(path, options);
      });
      await wrapper.get(".test-card").trigger("click");
      await wrapper.get('[data-testid="rate-3"]').trigger("click");
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "3" }));
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "s" }));
      expect(writes("flashcard_responses", "POST")).toHaveLength(1);
      finish([]);
      await flushPromises();
      expect(wrapper.get(".test-card").text()).toBe("last");
      expect(
        writes("flashcard_sessions?id=eq.session-1", "PATCH")
      ).toHaveLength(0);
    });

    it("finishes a one-card deck only after answering and can start it again", async () => {
      cards = [{ id: "only", tags: [] }];
      const wrapper = await open();
      expect(
        writes("flashcard_sessions?id=eq.session-1", "PATCH")
      ).toHaveLength(0);
      await wrapper.get(".test-card").trigger("click");
      await wrapper.get('[data-testid="rate-3"]').trigger("click");
      await flushPromises();
      expect(wrapper.get(".test-summary").text()).toContain("1 correct");
      await wrapper.get(".test-summary button").trigger("click");
      await flushPromises();
      expect(wrapper.get(".test-card").text()).toBe("only");
      expect(writes("flashcard_sessions", "POST")).toHaveLength(2);
    });
  });
}
