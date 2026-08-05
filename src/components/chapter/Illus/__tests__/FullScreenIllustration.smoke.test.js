import { describe, it, expect, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { ref } from "vue";

/*
 * OPENBRAIN-10 — the DB path FullScreenIllustration gained. No live chapter
 * has a DB-backed fullscreen figure yet, so this proves the wiring the way the
 * real one will exercise it: a Supabase-shaped record (absent from
 * animations.json) must resolve and render; an id unknown to both sources must
 * render nothing but WARN — never fail silently (docs/chapter1-parity/).
 */

const DB_FIGURE = {
  id: "animationDbOnlyFigure",
  title: "A DB-only fullscreen figure",
  fullscreen: true,
  loop: false,
};

vi.mock("@/composables/useAnimations", () => {
  return {
    useAnimations: () => ({
      animations: ref([DB_FIGURE]),
      fetchAnimations: vi.fn().mockResolvedValue({ data: [DB_FIGURE] }),
    }),
  };
});

// The Lottie runtime needs a real SVG pipeline — stub it; resolution logic is
// what's under test, not vector rendering.
vi.mock("@/composables/useLottie", () => ({
  loadLottie: async () => ({
    loadAnimation: () => ({
      setSubframe: () => {},
      setSpeed: () => {},
      addEventListener: () => {},
      destroy: () => {},
    }),
  }),
}));

import FullScreenIllustration from "@/components/chapter/Illus/FullScreenIllustration.vue";

describe("FullScreenIllustration (DB-first resolution smoke)", () => {
  it("renders a Supabase-only figure that animations.json does not contain", async () => {
    const w = mount(FullScreenIllustration, {
      props: { paragraph: { animationId: "animationDbOnlyFigure" } },
    });
    await flushPromises();
    // The v-if guard passed and the figure's Lottie container div exists.
    // (The title heading only renders for figures with `states`, so the
    // container is the right proof the DB record resolved.)
    expect(w.find("#containeranimationDbOnlyFigure").exists()).toBe(true);
  });

  it("still resolves Chapter 1 figures from the JSON fallback", async () => {
    // A real Chapter-1 id that is NOT in the mocked DB list.
    const w = mount(FullScreenIllustration, {
      props: { paragraph: { animationId: "animationEyeStructur" } },
    });
    await flushPromises();
    expect(w.find("div").exists()).toBe(true);
  });

  it("renders nothing but warns for an id neither source knows", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const w = mount(FullScreenIllustration, {
      props: { paragraph: { animationId: "animationDoesNotExist" } },
    });
    await flushPromises();
    expect(w.find("div").exists()).toBe(false);
    expect(
      warn.mock.calls.some((c) =>
        String(c[0]).includes("animationDoesNotExist")
      )
    ).toBe(true);
    warn.mockRestore();
  });
});
