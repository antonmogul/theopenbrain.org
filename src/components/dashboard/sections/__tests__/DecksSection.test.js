/*
 * Dashboard → Decks (OPENBRAIN-129): the loading state, the cards, the
 * empty state's two ways in, the migration-missing state and the delete
 * confirmation for the deck shown at /deck.
 */
import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { mountSection } from "@/test/mountSection";

vi.mock("@/services/api/client", () => ({
  apiRequest: vi.fn(),
  authedRequest: vi.fn(),
  isApiConfigured: () => true,
}));
// The shared barrel brings DashboardRail, and with it useAuth's session
// start-up; the section itself never reads auth.
vi.mock("@/composables/useAuth", () => ({ useAuth: () => ({}) }));

import { authedRequest } from "@/services/api/client";
import DecksSection from "../DecksSection.vue";
import { DECK_LIST_ROWS, decksApi } from "@/stories/deckFixtures.js";

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    disconnect() {}
  };
});

let router;
async function mountDecks() {
  router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/:pathMatch(.*)*", component: { template: "<div />" } }],
  });
  await router.push("/dashboard?section=decks");
  const w = mountSection(DecksSection, {}, { plugins: [router] });
  await flushPromises();
  return w;
}
const button = (w, text) =>
  w.findAll("button").find((b) => b.text().trim() === text);
const apiError = (status, response) =>
  Object.assign(new Error(`API Error ${status}`), { status, response });

beforeEach(() => {
  vi.clearAllMocks();
});

describe("DecksSection", () => {
  it("shows the loading state until the list arrives", async () => {
    authedRequest.mockReturnValue(new Promise(() => {}));
    const w = await mountDecks();
    expect(w.text()).toContain("Loading decks…");
    expect(authedRequest).toHaveBeenCalledWith(
      "decks?select=id,slug,title,kind,status,slide_count,version,published_version,published_at,updated_at,pinned,share_token,first_slide:slides->0&order=updated_at.desc"
    );
  });

  it("lists the decks in use as cards, archived ones under Archived", async () => {
    authedRequest.mockResolvedValue(structuredClone(DECK_LIST_ROWS));
    const w = await mountDecks();

    const titles = w.findAll(".ds-title").map((t) => t.text());
    expect(titles).toEqual(["The Open Brain — Funding deck", "SfN 2026 pitch"]);

    const [funding, pitch] = w.findAll(".ds-card");
    expect(funding.text()).toContain("Published");
    expect(funding.text()).toContain("Shown at /deck");
    expect(funding.text()).toContain("Unpublished changes");
    expect(funding.text()).toMatch(/9 slides · edited /);
    expect(funding.find(".slide-preview").exists()).toBe(true);
    expect(funding.find('a[href="/dashboard/decks/funding"]').exists()).toBe(
      true
    );
    const present = funding.find('a[href="/dashboard/decks/funding/present"]');
    expect(present.attributes("target")).toBe("_blank");
    expect(funding.text()).toContain("Copy link");

    expect(pitch.text()).toContain("Draft");
    expect(pitch.text()).not.toContain("Shown at /deck");
    expect(pitch.text()).not.toContain("Unpublished changes");
    expect(pitch.text()).not.toContain("Copy link");

    await button(w, "Archived1").trigger("click");
    expect(w.findAll(".ds-title").map((t) => t.text())).toEqual([
      "MNI seminar — reading with figures",
    ]);
    await w
      .find('[data-menu-for="9f8e7d6c-5b4a-4392-8170-6f5e4d3c2b1a"]')
      .trigger("click");
    expect(button(w, "Restore")).toBeTruthy();
  });

  it("offers New deck and a copy of the funding deck when there are none", async () => {
    authedRequest.mockResolvedValueOnce([]);
    const w = await mountDecks();
    expect(w.text()).toContain("No decks yet");
    expect(button(w, "New deck")).toBeTruthy();

    authedRequest.mockImplementation(async (endpoint, options = {}) =>
      options.method === "POST"
        ? [{ id: "d1", slug: "funding-copy", status: "draft" }]
        : []
    );
    const push = vi.spyOn(router, "push");
    await button(w, "Copy the funding deck").trigger("click");
    await flushPromises();

    const [, options] = authedRequest.mock.calls.find(
      ([, o]) => o?.method === "POST"
    );
    const body = JSON.parse(options.body);
    expect(body.slug).toBe("funding-copy");
    expect(body.kind).toBe("funding");
    expect(body.slides).toHaveLength(9);
    expect(push).toHaveBeenCalledWith("/dashboard/decks/funding-copy");
  });

  it("asks for the migration instead of a retry when the table is missing", async () => {
    authedRequest.mockRejectedValue(
      apiError(404, '{"code":"PGRST205","message":"Could not find the table"}')
    );
    const w = await mountDecks();
    expect(w.text()).toContain("Decks need a database update");
    expect(w.text()).toContain("supabase db push");
    expect(w.text()).toContain("20261007010000_decks.sql");
    expect(button(w, "Try again")).toBeUndefined();
    expect(button(w, "New deck").attributes("disabled")).toBeDefined();
  });

  it("offers a retry when the list fails to load", async () => {
    authedRequest.mockRejectedValueOnce(apiError(500, "boom"));
    const w = await mountDecks();
    expect(w.text()).toContain("The decks couldn't load");
    authedRequest.mockResolvedValue(structuredClone(DECK_LIST_ROWS));
    await button(w, "Try again").trigger("click");
    await flushPromises();
    expect(w.findAll(".ds-card")).toHaveLength(2);
  });

  it("warns that /deck falls back before deleting the pinned deck", async () => {
    authedRequest.mockResolvedValue(structuredClone(DECK_LIST_ROWS));
    const w = await mountDecks();
    await w
      .find('[data-menu-for="0b7e9a52-1c34-4f0e-9d1a-5b2e6c7f8a90"]')
      .trigger("click");
    await button(w, "Delete").trigger("click");
    await flushPromises();
    expect(w.text()).toContain("Delete this deck?");
    // The address of the site the page is on (the domain may not serve it).
    expect(w.text()).toContain(
      `${location.host}/deck goes back to the bundled October copy.`
    );

    authedRequest.mockImplementation(async (endpoint, options = {}) =>
      options.method === "DELETE"
        ? [{ id: "0b7e9a52-1c34-4f0e-9d1a-5b2e6c7f8a90" }]
        : structuredClone(DECK_LIST_ROWS.slice(1))
    );
    await button(w, "Delete deck").trigger("click");
    await flushPromises();
    expect(
      authedRequest.mock.calls.some(
        ([endpoint, o]) =>
          o?.method === "DELETE" &&
          endpoint.startsWith(
            "decks?id=eq.0b7e9a52-1c34-4f0e-9d1a-5b2e6c7f8a90"
          )
      )
    ).toBe(true);
    expect(w.text()).not.toContain("Delete this deck?");
    expect(w.findAll(".ds-title").map((t) => t.text())).toEqual([
      "SfN 2026 pitch",
    ]);
  });

  it("shows a failed write on its card and refetches", async () => {
    authedRequest.mockResolvedValue(structuredClone(DECK_LIST_ROWS));
    const w = await mountDecks();
    authedRequest.mockImplementation(async (endpoint, options = {}) => {
      if (options.method === "PATCH") return [];
      return structuredClone(DECK_LIST_ROWS);
    });
    await w
      .find('[data-menu-for="5d2c8e14-7a9b-4c3d-8e2f-1a0b9c8d7e6f"]')
      .trigger("click");
    await button(w, "Archive").trigger("click");
    await flushPromises();
    const pitch = w.findAll(".ds-card")[1];
    expect(pitch.find('[role="alert"]').text()).toContain("Only creators");
    const gets = authedRequest.mock.calls.filter(
      ([e, o]) => !o?.method && e.startsWith("decks?select=")
    );
    expect(gets.length).toBeGreaterThanOrEqual(2);
  });

  describe("focus after a card's action", () => {
    const FUNDING = "0b7e9a52-1c34-4f0e-9d1a-5b2e6c7f8a90";
    const PITCH = "5d2c8e14-7a9b-4c3d-8e2f-1a0b9c8d7e6f";
    let attached;
    async function mountAttached() {
      // The in-memory API the stories use, so a write changes the list.
      const api = decksApi();
      authedRequest.mockImplementation(async (endpoint, options = {}) => {
        const key = Object.keys(api).find((k) => endpoint.includes(k));
        const value = key ? api[key] : [];
        return structuredClone(
          await (typeof value === "function" ? value(endpoint, options) : value)
        );
      });
      router = createRouter({
        history: createMemoryHistory(),
        routes: [
          { path: "/:pathMatch(.*)*", component: { template: "<div />" } },
        ],
      });
      await router.push("/dashboard?section=decks");
      attached = mount(DecksSection, {
        attachTo: document.body,
        global: { stubs: { teleport: true }, plugins: [router] },
      });
      await flushPromises();
      return attached;
    }
    const more = (w, id) => w.get(`[data-menu-for="${id}"]`);
    const item = (w, text) =>
      w.findAll(".ds-menu button").find((b) => b.text().trim() === text);

    it("keeps focus on More while a duplicate is made, and after", async () => {
      const w = await mountAttached();
      more(w, PITCH).element.focus();
      await more(w, PITCH).trigger("click");
      await item(w, "Duplicate").trigger("click");
      // Busy, but still focusable: aria-disabled, not disabled.
      expect(more(w, PITCH).attributes("aria-disabled")).toBe("true");
      expect(more(w, PITCH).attributes("disabled")).toBeUndefined();
      await flushPromises();
      expect(document.activeElement).toBe(more(w, PITCH).element);
      expect(w.findAll(".ds-card")).toHaveLength(3);
      attached.unmount();
    });

    it("moves focus to the next card when an archived card leaves the list", async () => {
      const w = await mountAttached();
      more(w, FUNDING).element.focus();
      await more(w, FUNDING).trigger("click");
      await item(w, "Archive").trigger("click");
      await flushPromises();
      expect(w.findAll(".ds-card")).toHaveLength(1);
      expect(document.activeElement).toBe(more(w, PITCH).element);
      attached.unmount();
    });
  });
});
