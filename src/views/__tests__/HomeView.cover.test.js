/*
 * The home page as the book's front door (OPENBRAIN-158): the brain atlas
 * is behind an async boundary (HomeView is the one eagerly imported view,
 * and three.js must stay out of the entry chunk), and what the front door
 * kept from the old cover is still there: Start reading, the chapter list,
 * how to read the book, the playground, the colophon and Storybook.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { flushPromises, mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { createPinia } from "pinia";
import { ref } from "vue";

const state = vi.hoisted(() => ({ stageLoads: 0, authed: false }));

vi.mock("@/helper/brain/brainStage", () => {
  state.stageLoads++;
  return { BRAIN_MODEL_URL: "/x.glb", createBrainStage: vi.fn() };
});
// Reduced motion: the cover holds the poster, so the test needs no stage.
vi.mock("@/helper/motion", () => ({ reducedMotionK: () => 0.001 }));
vi.mock("@/composables/useAuth", () => ({
  useAuth: () => ({
    isAuthenticated: ref(state.authed),
    isCreator: ref(false),
  }),
}));
vi.mock("@/composables/useChapterCatalog", () => {
  const modules = ref([
    {
      id: "m1",
      slug: "foundations-of-neuroscience",
      title: "Foundations of Neuroscience",
      order_index: 1,
      ramp: "fund",
      status: "published",
    },
    {
      id: "m2",
      slug: "the-retina",
      title: "The Retina",
      order_index: 2,
      ramp: "perc",
      status: "published",
    },
  ]);
  return {
    useChapterCatalog: () => ({
      modules,
      loaded: ref(true),
      loading: ref(false),
      fetchCatalog: vi.fn(() => Promise.resolve(modules.value)),
    }),
  };
});

import HomeView from "../HomeView.vue";

const ROOT = path.resolve(__dirname, "../../..");
const read = (p) => readFileSync(path.join(ROOT, p), "utf8");

const wrappers = [];
afterEach(() => {
  wrappers.splice(0).forEach((w) => w.unmount());
});

async function mountHome() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/:path(.*)*", component: { template: "<div />" } }],
  });
  const w = mount(HomeView, {
    global: { plugins: [router, createPinia()] },
    attachTo: document.body,
  });
  wrappers.push(w);
  // The atlas chunk arrives over real time (a dynamic import).
  for (let i = 0; i < 50 && !w.find(".atlas").exists(); i++) {
    await flushPromises();
    await new Promise((r) => setTimeout(r, 20));
  }
  return w;
}

describe("the async boundary", () => {
  it("loads the atlas with defineAsyncComponent, never statically", () => {
    const home = read("src/views/HomeView.vue");
    expect(home).toMatch(
      /defineAsyncComponent\(\s*\(\) => import\("@\/components\/brain\/BrainAtlas\.vue"\)/
    );
    expect(home).not.toMatch(/^import .* from "@\/components\/brain\//m);
    expect(home).not.toMatch(/brainStage|from "three"/);
  });

  it("keeps three.js behind the atlas's own dynamic import", () => {
    const atlas = read("src/components/brain/BrainAtlas.vue");
    expect(atlas).toMatch(/await import\("@\/helper\/brain\/brainStage"\)/);
    expect(atlas).not.toMatch(
      /^import .* from "@\/helper\/brain\/brainStage"/m
    );
    expect(atlas).not.toMatch(/from "three"/);
    // poster.js, which the atlas does import statically, imports nothing.
    expect(read("src/helper/brain/poster.js")).not.toMatch(/^import /m);
    // The router still reaches HomeView eagerly and /brain lazily.
    const router = read("src/router/index.js");
    expect(router).toMatch(/^import HomeView from "@\/views\/HomeView\.vue"/m);
    expect(router).not.toMatch(/^import .*Brain(View|Atlas)/m);
  });
});

describe("the front door", () => {
  it("opens on the atlas with the book's title block and the ways in", async () => {
    const w = await mountHome();
    expect(w.find(".atlas").exists()).toBe(true);
    expect(state.stageLoads).toBe(0); // reduced motion: poster only
    expect(w.get(".atlas__stage").attributes("data-still")).toBe("motion");
    expect(w.get("img.atlas__poster").exists()).toBe(true);

    // The lead slot: the book, not the atlas's own title.
    const h1 = w.get("h1");
    expect(h1.text()).toContain("The Open Brain:");
    expect(h1.text()).toContain("open access neuroscience textbook");
    expect(w.text()).not.toContain("opened like a book");
    expect(w.get("img.cover__logo").attributes("alt")).toBe("The Open Brain");
    expect(w.text()).toContain("Two chapters to read now, more on the way.");

    // Kept from the old cover.
    const links = w.findAll("a").map((a) => [a.text(), a.attributes("href")]);
    expect(links).toContainEqual([
      "Start reading",
      "/chapter/1/foundations-of-neuroscience",
    ]);
    expect(links).toContainEqual(["All chapters", "/chapters"]);
    expect(links).toContainEqual([
      "Open the Python playground →",
      "/playground",
    ]);
    expect(links).toContainEqual(["Storybook", "/storybook/index.html"]);
    expect(w.text()).toContain("How to read this book");
    expect(w.text()).toContain("Read with the figures");
    expect(w.text()).toContain("Creative Commons Attribution 4.0");
    expect(w.text()).toContain("Tanenbaum Open Science Institute");
    expect(w.find("button.btn--link").text()).toBe("Sign in");

    // The contents: every chapter a row, the published ones linked.
    expect(w.findAll(".contents__row")).toHaveLength(4);
    expect(w.get('a[data-read="the-retina"]').attributes("href")).toBe(
      "/chapter/2/the-retina"
    );
    expect(w.findAll(".contents__tag")).toHaveLength(2);
    expect(w.text()).toContain("Not in the book yet");
    expect(w.text()).toContain("Tyler Sloan");
  });

  it("drops the sign-in button once signed in", async () => {
    state.authed = true;
    const w = await mountHome();
    expect(w.find("button.btn--link").exists()).toBe(false);
    state.authed = false;
  });
});
