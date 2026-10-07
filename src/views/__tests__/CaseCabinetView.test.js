import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import CaseCabinetView from "@/views/CaseCabinetView.vue";
const wrappers = [];
async function cabinet() {
  const w = mount(CaseCabinetView, { attachTo: document.body });
  wrappers.push(w);
  await flushPromises();
  return w;
}
beforeEach(() => {
  document.documentElement.dataset.reduceMotion = "1";
});
afterEach(() => {
  wrappers.splice(0).forEach((w) => w.unmount());
  delete document.documentElement.dataset.reduceMotion;
  vi.restoreAllMocks();
});

describe("source-backed case cabinet", () => {
  it("opens every original case and pairs the correct map", async () => {
    const w = await cabinet();
    expect(w.findAll(".story-folder")).toHaveLength(7);
    await w.find('[data-id="nc"]').trigger("click");
    expect(w.find(".casefile__title").text()).toBe("Case 31 · N.C.");
    expect(w.find(".brain-map img").attributes("src")).toContain("image84.png");
    await w.find('[data-point="19"]').trigger("click");
    expect(w.findAll(".note")).toHaveLength(3);
    expect(w.find(".transcript").text()).toContain('"I had a dream.');
  });
  it.each([false, true])(
    "retries focus after inert release (focus dropped to body: %s)",
    async (dropFocus) => {
      const w = await cabinet();
      let retry;
      vi.spyOn(window, "requestAnimationFrame").mockImplementation(
        (callback) => {
          retry = callback;
          return 1;
        }
      );
      const focus = HTMLElement.prototype.focus;
      let blocked = true;
      vi.spyOn(HTMLElement.prototype, "focus").mockImplementation(function (
        ...args
      ) {
        if (this.classList.contains("casefile__title") && blocked) {
          blocked = false;
          if (dropFocus) document.activeElement.blur();
          return;
        }
        return focus.apply(this, args);
      });
      await w.find('[data-id="rw"]').trigger("click");
      await flushPromises();
      expect(document.activeElement).toBe(
        dropFocus ? document.body : w.find(".back-button").element
      );
      expect(retry).toBeTypeOf("function");
      retry();
      expect(document.activeElement).toBe(w.find(".casefile__title").element);
    }
  );
  it("keeps zoom boundary controls focusable so Escape stays within the case", async () => {
    const w = await cabinet();
    await w.find('[data-id="rw"]').trigger("click");
    const enlarge = w.find('[aria-label="Enlarge map"]');
    const reduce = w.find('[aria-label="Reduce map magnification"]');
    for (let i = 0; i < 4; i++) await enlarge.trigger("click");
    expect(enlarge.attributes("aria-disabled")).toBe("true");
    expect(enlarge.element.disabled).toBe(false);
    expect(w.find(".map-zoom span").text()).toBe("250%");
    reduce.element.focus();
    for (let i = 0; i < 4; i++) await reduce.trigger("click");
    expect(reduce.attributes("aria-disabled")).toBe("true");
    expect(reduce.element.disabled).toBe(false);
    expect(w.find(".map-zoom span").text()).toBe("100%");
    expect(document.activeElement).toBe(reduce.element);
    await reduce.trigger("keydown", { key: "Escape" });
    expect(w.attributes("data-phase")).toBe("closed");
    expect(w.find(".casefile").exists()).toBe(false);
  });
  it("attributes R.W. 24 correctly and keeps A.Bra. repeat events", async () => {
    const w = await cabinet();
    await w.find('[data-id="rw"]').trigger("click");
    await w.find('[data-point="24"]').trigger("click");
    expect(w.find(".transcript").text()).toContain(
      "Yes, the robbers, they are coming after me."
    );
    expect(w.find(".transcript").text()).not.toContain("White Christmas");
    await w
      .findAll(".case-tabs button")
      .find((b) => b.text().includes("A. Bra."))
      .trigger("click");
    await flushPromises();
    expect(w.findAll(".note")).toHaveLength(0);
    await w.find('[data-point="15"]').trigger("click");
    expect(w.findAll(".note")).toHaveLength(3);
    expect(w.find(".transcript").text()).toContain("White Christmas");
    expect(w.find(".transcript").text()).toContain("26 minutes");
  });
  it("keeps unresolved points readable without invented diagram buttons", async () => {
    const w = await cabinet();
    await w.find('[data-id="gp"]').trigger("click");
    expect(w.find('[data-point="16"]').exists()).toBe(false);
    await w.find('[data-point-option="16"]').trigger("click");
    expect(w.find(".transcript").text()).toContain("j'entend");
    expect(w.find(".transcript").text()).toContain("17d");
    await w
      .findAll(".case-tabs button")
      .find((b) => b.text().includes("G.E."))
      .trigger("click");
    await flushPromises();
    expect(w.find('[data-point="4"]').exists()).toBe(false);
    await w.find('[data-point="1b"]').trigger("click");
    expect(w.find(".transcript h4").text()).toContain("1b");
    await w.find('[data-point-option="4"]').trigger("click");
    expect(w.findAll(".note")).toHaveLength(2);
    expect(w.find(".transcript").text()).toContain(
      "Was that my mother yelling"
    );
  });
  it("Escape closes only the open case and restores folder focus on repeated use", async () => {
    const w = await cabinet();
    for (let i = 0; i < 2; i++) {
      await w.find('[data-id="rw"]').trigger("click");
      await w.find('[data-point="24"]').trigger("click");
      await w.find(".cabinet").trigger("keydown", { key: "Escape" });
      expect(w.find(".casefile").exists()).toBe(false);
      expect(document.activeElement).toBe(w.find('[data-id="rw"]').element);
    }
  });
});

function mediaState({ desktop = true, reduced = false } = {}) {
  const queries = new Map();
  vi.spyOn(window, "matchMedia").mockImplementation((query) => {
    if (!queries.has(query)) {
      const listeners = new Set();
      queries.set(query, {
        matches: query.includes("min-width")
          ? desktop
          : query.includes("prefers-reduced-motion")
            ? reduced
            : false,
        media: query,
        addEventListener: (_type, listener) => listeners.add(listener),
        removeEventListener: (_type, listener) => listeners.delete(listener),
        change(value) {
          this.matches = value;
          for (const listener of listeners) listener({ matches: value });
        },
      });
    }
    return queries.get(query);
  });
  return queries;
}
async function animatedCabinet() {
  delete document.documentElement.dataset.reduceMotion;
  mediaState();
  return cabinet();
}
async function finishOpen(w, id = "rw") {
  await w.find(`[data-id="${id}"]`).trigger("click");
  await flushPromises();
  const timeline = window.__cc.tl;
  timeline.pause().progress(1);
  await flushPromises();
  return timeline;
}

describe("restored desktop folder storyboard", () => {
  it("retains the lift, quarter-turn, hinged cover and unscaled reading handoff", async () => {
    const w = await animatedCabinet();
    expect(w.findAll(".story-folder")).toHaveLength(7);
    expect(w.findAll(".story-tab__initials").map((tab) => tab.text())).toEqual([
      "G.E.",
      "S. Be.",
      "G.P.",
      "Y.N.",
      "N.C.",
      "A. Bra.",
      "R.W.",
    ]);
    await w.find('[data-id="rw"]').trigger("click");
    await flushPromises();
    const timeline = window.__cc.tl;
    timeline.pause();
    const motions = timeline.getChildren().map((tween) => tween.vars);
    expect(motions.some((vars) => vars.rot === 12 && vars.y === 548)).toBe(
      true
    );
    expect(
      motions.some(
        (vars) => vars.rot === 90 && vars.w === 780 && vars.h === 600
      )
    ).toBe(true);
    expect(motions.some((vars) => vars.rotationY === -180)).toBe(true);
    expect(w.attributes("data-phase")).toBe("opening");
    expect(w.find(".casefile").attributes("inert")).toBeDefined();
    expect(document.activeElement).toBe(w.find(".back-button").element);
    timeline.progress(1);
    await flushPromises();
    expect(w.attributes("data-phase")).toBe("open");
    expect(w.find(".casefile").attributes("inert")).toBeUndefined();
    expect(w.find(".casefile").element.style.transform).toBe("");
    expect(w.find(".casefile").element.style.opacity).toBe("1");
    expect(w.find(".casefile").element.style.visibility).not.toBe("hidden");
    expect(w.find(".storyboard").element.style.visibility).toBe("hidden");
    expect(w.find(".brain-map img").attributes("src")).toContain("image79.png");
    expect(document.activeElement).toBe(w.find(".casefile__title").element);
  });

  it("reverses the same timeline on close and can open repeatedly without stale notes", async () => {
    const w = await animatedCabinet();
    for (let i = 0; i < 2; i++) {
      const timeline = await finishOpen(w);
      await w.find('[data-point="24"]').trigger("click");
      expect(w.find(".transcript").text()).toContain("robbers");
      expect(w.find(".casefile").element.style.opacity).toBe("1");
      expect(w.find(".casefile").element.style.visibility).not.toBe("hidden");
      await w.find(".back-button").trigger("click");
      expect(w.attributes("data-phase")).toBe("closing");
      expect(timeline.reversed()).toBe(true);
      timeline.pause().progress(0);
      await flushPromises();
      expect(w.attributes("data-phase")).toBe("closed");
      expect(w.find(".casefile").exists()).toBe(false);
      expect(w.find(".storyboard").element.style.visibility).toBe("inherit");
      expect(document.activeElement).toBe(w.find('[data-id="rw"]').element);
    }
  });

  it("Escape safely reverses an interrupted lift and also closes a zero-progress opening", async () => {
    const w = await animatedCabinet();
    for (const progress of [0.4, 0]) {
      await w.find('[data-id="rw"]').trigger("click");
      await flushPromises();
      const timeline = window.__cc.tl;
      timeline.pause().progress(progress);
      await w.find(".cabinet").trigger("keydown", { key: "Escape" });
      if (progress) {
        expect(timeline.reversed()).toBe(true);
        timeline.progress(0);
      }
      await flushPromises();
      expect(w.attributes("data-phase")).toBe("closed");
      expect(w.find(".story-flyer").exists()).toBe(false);
    }
  });

  it("returns the old folder before opening another case and allows Escape to cancel that queue", async () => {
    const w = await animatedCabinet();
    let timeline = await finishOpen(w);
    await w.find('[data-point="24"]').trigger("click");
    await w
      .findAll(".case-tabs button")
      .find((b) => b.text().includes("G.E."))
      .trigger("click");
    timeline.pause().progress(0);
    await flushPromises();
    expect(w.attributes("data-phase")).toBe("opening");
    expect(w.find(".casefile__title").text()).toBe("Case 32 · G.E.");
    timeline = window.__cc.tl;
    timeline.pause().progress(1);
    await flushPromises();
    expect(w.findAll(".note")).toHaveLength(0);
    expect(w.find(".brain-map img").attributes("src")).toContain("image85.png");
    await w
      .findAll(".case-tabs button")
      .find((b) => b.text().includes("R.W."))
      .trigger("click");
    await w.find(".cabinet").trigger("keydown", { key: "Escape" });
    timeline.pause().progress(0);
    await flushPromises();
    expect(w.attributes("data-phase")).toBe("closed");
    expect(w.find(".casefile").exists()).toBe(false);
  });

  it("settles into readable mobile panes when the viewport changes mid-open", async () => {
    delete document.documentElement.dataset.reduceMotion;
    const queries = mediaState();
    const w = await cabinet();
    await w.find('[data-id="rw"]').trigger("click");
    await flushPromises();
    const timeline = window.__cc.tl;
    timeline.pause().progress(0.4);
    queries.get("(min-width: 761px)").change(false);
    await flushPromises();
    expect(w.attributes("data-phase")).toBe("open");
    expect(w.attributes("data-animation-mode")).toBe("immediate");
    expect(w.find(".storyboard").exists()).toBe(false);
    expect(w.find(".casefile").element.style.transform).toBe("");
    expect(w.find(".casefile").element.style.opacity).toBe("1");
    expect(w.find(".casefile").element.style.visibility).not.toBe("hidden");
    await w.find('[data-point="24"]').trigger("click");
    expect(w.find(".transcript").text()).toContain("robbers");
    await w.find(".back-button").trigger("click");
    await flushPromises();
    expect(w.findAll(".folder")).toHaveLength(7);
  });

  it("deliberately skips spatial motion for reduced-motion and narrow viewports", async () => {
    mediaState();
    const w = await cabinet();
    await w.find('[data-id="rw"]').trigger("click");
    await flushPromises();
    expect(w.attributes("data-phase")).toBe("open");
    expect(w.attributes("data-animation-mode")).toBe("immediate");
    expect(window.__cc).toBeUndefined();
    expect(w.find(".casefile").element.style.opacity).toBe("1");
    expect(w.find(".casefile").element.style.visibility).not.toBe("hidden");
    await w.find(".back-button").trigger("click");
    await flushPromises();
    expect(w.attributes("data-phase")).toBe("closed");
  });

  it("settles an in-progress lift when the app reduced-motion setting changes", async () => {
    const w = await animatedCabinet();
    await w.find('[data-id="rw"]').trigger("click");
    await flushPromises();
    const timeline = window.__cc.tl;
    timeline.pause().progress(0.4);
    document.documentElement.dataset.reduceMotion = "1";
    await flushPromises();
    expect(w.attributes("data-phase")).toBe("open");
    expect(w.attributes("data-animation-mode")).toBe("immediate");
    expect(window.__cc).toBeUndefined();
    expect(w.find(".casefile").element.style.opacity).toBe("1");
    expect(w.find(".casefile").element.style.visibility).not.toBe("hidden");
    await w.find(".back-button").trigger("click");
    await flushPromises();
    expect(w.attributes("data-phase")).toBe("closed");
  });

  it("cancels an opening before its first render without creating a stale timeline", async () => {
    const w = await animatedCabinet();
    w.find('[data-id="rw"]').element.click();
    w.element.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
    );
    await flushPromises();
    expect(w.attributes("data-phase")).toBe("closed");
    expect(w.find(".casefile").exists()).toBe(false);
    expect(window.__cc).toBeUndefined();
  });

  it("kills the timeline and pending handoff on unmount", async () => {
    const w = await animatedCabinet();
    await w.find('[data-id="rw"]').trigger("click");
    await flushPromises();
    const timeline = window.__cc.tl;
    const kill = vi.spyOn(timeline, "kill");
    w.unmount();
    wrappers.splice(wrappers.indexOf(w), 1);
    expect(kill).toHaveBeenCalled();
    expect(window.__cc).toBeUndefined();
  });
});
