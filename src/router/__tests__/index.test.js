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

vi.mock("@/stores", async () => {
  const { reactive } = await vi.importActual("vue");
  const general = reactive({ savedPosition: undefined, activeMenu: false });
  return { useGeneral: () => general };
});

vi.mock("@/utils/authHelpers", () => ({
  getSessionFromStorage: vi.fn(() => null),
}));

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
import { createAppRouter, routes } from "@/router";

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

  it("lets a creator onto /editor", async () => {
    getSessionFromStorage.mockReturnValue(SESSION);
    apiRequest.mockResolvedValue([{ role: "creator" }]);

    const router = makeRouter();
    await router.push("/editor");

    expect(router.currentRoute.value.path).toBe("/editor");
  });
});
