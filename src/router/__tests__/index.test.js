import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMemoryHistory } from "vue-router";

/*
 * Wiring test: the real route table + guard registrations, driven through a
 * memory history. Views are stubbed so a passing navigation does not pull a
 * whole screen (and its data composables) into the test; the guard's inputs
 * (session, role lookup, DEV override) are mocked at the module boundary the
 * router imports them from.
 */

const { stubView } = vi.hoisted(() => ({
  stubView: { template: "<div />" },
}));

vi.mock("@/views/HomeView.vue", () => ({ default: stubView }));
vi.mock("@/views/ChaptersView.vue", () => ({ default: stubView }));
vi.mock("@/views/EditorView.vue", () => ({ default: stubView }));
vi.mock("@/views/DashboardView.vue", () => ({ default: stubView }));
vi.mock("@/views/DeckView.vue", () => ({ default: stubView }));
vi.mock("@/views/DeckEditorView.vue", () => ({ default: stubView }));
vi.mock("@/views/StudentDashboardView.vue", () => ({ default: stubView }));

vi.mock("@/stores", async () => {
  const { reactive } = await vi.importActual("vue");
  const general = reactive({ savedPosition: undefined, activeMenu: false });
  return { useGeneral: () => general };
});

vi.mock("@/utils/authHelpers", () => {
  const getSessionFromStorage = vi.fn(() => null);
  // The guard awaits a fresh session (OPENBRAIN-77); in these tests it is
  // whatever the stored-session mock returns.
  return {
    getSessionFromStorage,
    ensureFreshSession: vi.fn(async () => getSessionFromStorage()),
  };
});

vi.mock("@/services/api/client", () => ({
  apiRequest: vi.fn(),
}));

vi.mock("@/composables/useAuth", async () => {
  const { ref } = await vi.importActual("vue");
  const devRoleOverride = ref(null);
  return { useAuth: () => ({ devRoleOverride }) };
});

import { getSessionFromStorage } from "@/utils/authHelpers";
import { apiRequest } from "@/services/api/client";
import { createAppRouter, routes, ROUTE_TITLES } from "@/router";

const SESSION = { access_token: "tok", user: { id: "user-1" } };

function makeRouter() {
  return createAppRouter({ history: createMemoryHistory() });
}

beforeEach(() => {
  vi.clearAllMocks();
  getSessionFromStorage.mockReturnValue(null);
});

describe("router wiring", () => {
  it("declares the role-gated routes the guard depends on", () => {
    const byName = Object.fromEntries(routes.map((r) => [r.name, r]));
    expect(byName.editor.meta).toEqual({
      requiresAuth: true,
      requiredRole: "creator",
    });
    expect(byName["professor-dashboard"].meta.requiredRole).toBe("professor");
    expect(byName["student-dashboard"].meta.requiredRole).toBe("student");
    expect(byName.dashboard.meta).toEqual({ requiresAuth: true });
  });

  it("bounces /editor to / when there is no session", async () => {
    const router = makeRouter();
    await router.push("/editor");
    expect(router.currentRoute.value.path).toBe("/");
    expect(apiRequest).not.toHaveBeenCalled();
  });

  it("sends a signed-in visitor from / to /chapters", async () => {
    getSessionFromStorage.mockReturnValue(SESSION);
    const router = makeRouter();
    await router.push("/");
    expect(router.currentRoute.value.path).toBe("/chapters");
  });

  it("fails closed on /editor when the role lookup errors", async () => {
    getSessionFromStorage.mockReturnValue(SESSION);
    apiRequest.mockRejectedValue(new Error("API Error 500: boom"));
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const router = makeRouter();
    await router.push("/editor");

    expect(router.currentRoute.value.path).toBe("/chapters");
    expect(router.currentRoute.value.query).toEqual({
      auth: "role-unavailable",
    });
    expect(apiRequest).toHaveBeenCalledWith(
      "profiles?id=eq.user-1&select=role",
      { headers: { Authorization: "Bearer tok" } }
    );

    error.mockRestore();
    warn.mockRestore();
  });

  it("fails closed on /editor when the profile row is missing", async () => {
    getSessionFromStorage.mockReturnValue(SESSION);
    apiRequest.mockResolvedValue([]);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const router = makeRouter();
    await router.push("/editor");

    expect(router.currentRoute.value.fullPath).toBe(
      "/chapters?auth=role-unavailable"
    );
    warn.mockRestore();
  });

  it("passes a creator through /editor to Dashboard → Chapters", async () => {
    getSessionFromStorage.mockReturnValue(SESSION);
    apiRequest.mockResolvedValue([{ role: "creator" }]);

    const router = makeRouter();
    await router.push("/editor");

    expect(router.currentRoute.value.fullPath).toBe(
      "/dashboard?section=chapters"
    );
  });
});

describe("deck routes (OPENBRAIN-129)", () => {
  const byName = () => Object.fromEntries(routes.map((r) => [r.name, r]));

  it("gates the deck editor and the draft presenter to creators", () => {
    const r = byName();
    expect(r["deck-editor"].path).toBe("/dashboard/decks/:slug");
    expect(r["deck-editor"].meta).toEqual({
      requiresAuth: true,
      requiredRole: "creator",
    });
    expect(r["deck-editor"].props).toBe(true);
    expect(r["deck-present"].path).toBe("/dashboard/decks/:slug/present");
    expect(r["deck-present"].meta).toEqual({
      requiresAuth: true,
      requiredRole: "creator",
    });
    expect(r["deck-present"].props({ params: { slug: "funding" } })).toEqual({
      source: "draft",
      slug: "funding",
    });
  });

  it("keeps /deck, /deck/templates and the share link public", () => {
    const r = byName();
    for (const name of ["deck", "deck-templates", "deck-shared"])
      expect(r[name].meta?.requiresAuth).toBeFalsy();
    expect(r.deck.props).toEqual({ source: "pinned", deck: "funding" });
    expect(r["deck-templates"].props).toEqual({
      source: "bundled",
      deck: "templates",
    });
    expect(r["deck-shared"].path).toBe("/deck/s/:token");
    expect(
      r["deck-shared"].props({ params: { token: "0123456789abcdef" } })
    ).toEqual({ source: "shared", token: "0123456789abcdef" });
  });

  it("names the deck routes' tabs", () => {
    expect(ROUTE_TITLES).toMatchObject({
      deck: "Funding deck",
      "deck-templates": "Slide templates",
      "deck-shared": "Deck",
      "deck-editor": "Edit deck",
      "deck-present": "Present deck",
    });
  });

  it("opens a share link without a session or a role lookup", async () => {
    const router = makeRouter();
    await router.push("/deck/s/00000000000000000000000000000000");
    expect(router.currentRoute.value.name).toBe("deck-shared");
    await router.push("/deck");
    expect(router.currentRoute.value.name).toBe("deck");
    expect(apiRequest).not.toHaveBeenCalled();
  });

  it("bounces the editor to / when there is no session", async () => {
    const router = makeRouter();
    await router.push("/dashboard/decks/funding");
    expect(router.currentRoute.value.path).toBe("/");
    await router.push("/dashboard/decks/funding/present");
    expect(router.currentRoute.value.path).toBe("/");
  });

  it("sends a student away from the draft presenter", async () => {
    getSessionFromStorage.mockReturnValue(SESSION);
    apiRequest.mockResolvedValue([{ role: "student" }]);
    const router = makeRouter();
    await router.push("/dashboard/decks/funding/present");
    expect(router.currentRoute.value.path).toBe("/student");
  });

  it("lets a creator into the editor", async () => {
    getSessionFromStorage.mockReturnValue(SESSION);
    apiRequest.mockResolvedValue([{ role: "creator" }]);
    const router = makeRouter();
    await router.push("/dashboard/decks/funding");
    expect(router.currentRoute.value.name).toBe("deck-editor");
    expect(router.currentRoute.value.params.slug).toBe("funding");
  });

  it("keeps the deck's own tab title when only the slide hash changes", async () => {
    const router = makeRouter();
    await router.push("/deck/templates");
    expect(document.title).toBe("Slide templates · The Open Brain");
    document.title = "Slide templates · The Open Brain (set by the view)";
    await router.replace({ hash: "#3" });
    expect(document.title).toBe(
      "Slide templates · The Open Brain (set by the view)"
    );
  });
});

describe("tab titles (OPENBRAIN-56)", () => {
  it("names non-reader routes and resets the chapter title", async () => {
    const router = makeRouter();
    document.title = "The Open Brain – The Retina";
    await router.push("/chapters");
    expect(document.title).toBe("Chapters · The Open Brain");
  });

  it("keeps the title and ramp of a page a guard didn't let the reader leave", async () => {
    const router = makeRouter();
    await router.push("/deck/templates");
    document.title = "Sentinel · set by the page";
    document.documentElement.setAttribute("data-chapter", "perc");
    // The deck editor's leave guard answering "stay" to unsaved changes.
    router.beforeEach((to, from) => from.name !== "deck-templates");
    const failure = await router.push("/chapters");
    expect(failure).toBeTruthy();
    expect(router.currentRoute.value.name).toBe("deck-templates");
    expect(document.title).toBe("Sentinel · set by the page");
    expect(document.documentElement.getAttribute("data-chapter")).toBe("perc");
    document.documentElement.removeAttribute("data-chapter");
  });
});
