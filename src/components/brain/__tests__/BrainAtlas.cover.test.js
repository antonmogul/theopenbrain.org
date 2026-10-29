/*
 * BrainAtlas as the home cover (OPENBRAIN-158): it opens on the poster and
 * fades the live brain in once the stage reports ready; under reduced
 * motion (when told to hold still) and without WebGL it keeps the poster
 * and never fetches the stage chunk, while the chapters stay plain links
 * into the book; and the lead slot swaps the title block.
 *
 * The stage chunk is mocked, and the mock counts how often it is evaluated:
 * a module is evaluated once per file, so the tests that must not fetch it
 * run first, before any test that does.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { createPinia } from "pinia";
import { nextTick, ref } from "vue";

const state = vi.hoisted(() => ({
  motionK: 1,
  webgl: true,
  stageLoads: 0, // times the stage chunk was evaluated (never reset)
  args: null, // what createBrainStage was last given
  stage: null,
}));

vi.mock("@/helper/brain/brainStage", () => {
  state.stageLoads++;
  return {
    BRAIN_MODEL_URL: "/publicAssets/models/brain/brain-v1.glb",
    createBrainStage: vi.fn((o) => {
      state.args = o;
      state.stage = {
        setPlaying: vi.fn(),
        setOpen: vi.fn(),
        setHover: vi.fn(),
        setSelected: vi.fn(),
        setAreaStyles: vi.fn(),
        setSuspended: vi.fn(),
        dispose: vi.fn(),
      };
      return state.stage;
    }),
  };
});
vi.mock("@/helper/motion", () => ({ reducedMotionK: () => state.motionK }));
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

import BrainAtlas from "../BrainAtlas.vue";
import { BRAIN_POSTER } from "@/helper/brain/poster";

const wrappers = [];
const originalGetContext = HTMLCanvasElement.prototype.getContext;

function mountAtlas(options = {}) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/:path(.*)*", component: { template: "<div />" } }],
  });
  const w = mount(BrainAtlas, {
    ...options,
    global: { plugins: [router, createPinia()] },
    attachTo: document.body,
  });
  wrappers.push(w);
  return w;
}
/* The stage chunk arrives over real time (a dynamic import), not microtasks. */
async function settled() {
  for (let i = 0; i < 20 && !state.args; i++) {
    await flushPromises();
    await new Promise((r) => setTimeout(r, 10));
  }
}

beforeEach(() => {
  state.motionK = 1;
  state.webgl = true;
  state.args = null;
  state.stage = null;
  HTMLCanvasElement.prototype.getContext = vi.fn(() =>
    state.webgl ? { isWebGL2: true } : null
  );
});
afterEach(() => {
  wrappers.splice(0).forEach((w) => w.unmount());
  HTMLCanvasElement.prototype.getContext = originalGetContext;
  vi.restoreAllMocks();
});

describe("holding the poster (the stage chunk is never fetched)", () => {
  it("under reduced motion, when told to: contents still link into the book", async () => {
    state.motionK = 0.001;
    const w = mountAtlas({ props: { stillUnderReducedMotion: true } });
    await settled();
    expect(state.stageLoads).toBe(0);
    expect(state.args).toBeNull();
    expect(HTMLCanvasElement.prototype.getContext).not.toHaveBeenCalled();
    const stage = w.get(".atlas__stage");
    expect(stage.attributes("data-status")).toBe("error");
    expect(stage.attributes("data-still")).toBe("motion");
    expect(stage.attributes("data-reduced")).toBe("1");
    expect(w.get("img.atlas__poster").isVisible()).toBe(true);
    expect(w.text()).toContain("holds still while reduced motion is on");
    expect(w.text()).not.toContain("Drag to turn the brain");
    expect(w.find(".atlas__controls").exists()).toBe(false);

    // Plain links into the published chapters; drafts say so instead.
    expect(
      w.get('a[data-read="foundations-of-neuroscience"]').attributes("href")
    ).toBe("/chapter/1/foundations-of-neuroscience");
    expect(w.get('a[data-read="the-retina"]').attributes("href")).toBe(
      "/chapter/2/the-retina"
    );
    expect(w.find('a[data-read="stress"]').exists()).toBe(false);
    expect(w.findAll(".contents__tag").map((t) => t.text())).toEqual([
      "In preparation",
      "In preparation",
    ]);
  });

  it("without WebGL2: the poster stays and the card still links in", async () => {
    state.webgl = false;
    const w = mountAtlas();
    await settled();
    expect(state.stageLoads).toBe(0);
    expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalledWith(
      "webgl2",
      expect.objectContaining({ antialias: true, alpha: true })
    );
    const stage = w.get(".atlas__stage");
    expect(stage.attributes("data-status")).toBe("error");
    expect(stage.attributes("data-still")).toBe("webgl");
    expect(w.text()).toContain("WebGL is off or unavailable");
    expect(w.get("img.atlas__poster").isVisible()).toBe(true);
    expect(w.get('a[data-read="the-retina"]').attributes("href")).toBe(
      "/chapter/2/the-retina"
    );
    await w.get('[data-pick="the-retina"]').trigger("click");
    await nextTick();
    expect(w.get(".card__cta").attributes("href")).toBe(
      "/chapter/2/the-retina"
    );
  });
});

describe("the poster and the live brain", () => {
  it("opens on the poster, then fades to the canvas when the stage is ready", async () => {
    const w = mountAtlas();
    const poster = w.get("img.atlas__poster");
    expect(poster.attributes("src")).toBe(BRAIN_POSTER.src);
    expect(poster.attributes("srcset")).toBe(BRAIN_POSTER.srcset);
    expect(poster.attributes("alt")).toBe("");
    expect(poster.attributes("aria-hidden")).toBe("true");
    const stage = w.get(".atlas__stage");
    expect(stage.attributes("data-status")).toBe("loading");
    expect(stage.attributes("data-reduced")).toBeUndefined();
    expect(w.text()).toContain("Loading the brain");

    await settled();
    expect(state.stageLoads).toBe(1);
    expect(state.args.canvas).toBe(w.get("canvas").element);
    expect(state.args.reducedMotion).toBe(false);
    expect(state.args.playing).toBe(true);
    expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalledWith(
      "webgl2",
      expect.objectContaining({ antialias: true, alpha: true })
    );

    state.args.on.progress(0.5);
    await nextTick();
    expect(w.text()).toContain("Loading the brain… 50%");

    state.args.on.ready();
    await nextTick();
    expect(stage.attributes("data-status")).toBe("ready");
    expect(w.find("img.atlas__poster").exists()).toBe(true); // fades by CSS
    expect(w.find(".atlas__status").exists()).toBe(false);
    expect(w.text()).toContain("Pause tour");
  });

  it("reports a stage error on the poster", async () => {
    const w = mountAtlas();
    await settled();
    state.args.on.error("load");
    await nextTick();
    expect(w.get(".atlas__stage").attributes("data-still")).toBe("load");
    expect(w.text()).toContain("The 3D brain couldn't be loaded.");
  });

  it("under reduced motion by default (/brain) still loads the stage, easing nothing", async () => {
    state.motionK = 0.001;
    mountAtlas();
    await settled();
    expect(state.args).toMatchObject({ reducedMotion: true, playing: false });
  });

  it("applies a chapter chosen while the chunk was on its way", async () => {
    const w = mountAtlas();
    await w.get('[data-pick="the-retina"]').trigger("click");
    await settled();
    expect(state.stage.setSelected).toHaveBeenCalledWith(["occipital"]);
    expect(state.stage.setOpen).toHaveBeenCalledWith(true);
  });

  it("disposes the stage on unmount", async () => {
    const w = mountAtlas();
    await settled();
    const stage = state.stage;
    w.unmount();
    wrappers.length = 0;
    expect(stage.dispose).toHaveBeenCalled();
  });
});

describe("the lead slot", () => {
  it("replaces the atlas's own title block", async () => {
    const w = mountAtlas({
      slots: { lead: '<h1 class="front">The front door</h1>' },
    });
    expect(w.get("h1.front").text()).toBe("The front door");
    expect(w.text()).not.toContain("opened like a book");
    // The strap and the credit stay.
    expect(w.text()).toContain(
      "Every chapter of the book is a part of the brain"
    );
    expect(w.text()).toContain("Tyler Sloan");
  });

  it("keeps its own title without one", () => {
    const w = mountAtlas();
    expect(w.get("h1").text()).toContain("opened like a book");
  });
});
