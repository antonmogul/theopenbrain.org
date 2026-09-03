import { describe, it, expect, vi } from "vitest";
import {
  createAuthGuard,
  dashboardForRole,
  roleUnavailableRedirect,
  ROLE_UNAVAILABLE_QUERY,
} from "@/router/guards";

/*
 * Pure decision-table tests for the auth/role guard. No router, no DOM: every
 * dependency (session, role lookup, DEV override) is injected, so each row of
 * the table in guards.js is a one-line assertion here.
 */

const SESSION = { access_token: "tok", user: { id: "user-1" } };

function route(overrides = {}) {
  return { path: "/x", name: "x", meta: {}, ...overrides };
}

const HOME = route({ path: "/", name: "home" });
const CHAPTERS = route({ path: "/chapters", name: "chapters" });
const SETTINGS = route({
  path: "/settings",
  name: "settings",
  meta: { requiresAuth: true },
});
const DASHBOARD = route({
  path: "/dashboard",
  name: "dashboard",
  meta: { requiresAuth: true },
});
const EDITOR = route({
  path: "/editor",
  name: "editor",
  meta: { requiresAuth: true, requiredRole: "creator" },
});
const PROFESSOR = route({
  path: "/professor",
  name: "professor-dashboard",
  meta: { requiresAuth: true, requiredRole: "professor" },
});
const STUDENT = route({
  path: "/student",
  name: "student-dashboard",
  meta: { requiresAuth: true, requiredRole: "student" },
});

const ROLE_UNAVAILABLE = {
  path: "/chapters",
  query: { auth: "role-unavailable" },
};

function makeGuard(overrides = {}) {
  const deps = {
    getSession: vi.fn(() => SESSION),
    fetchRole: vi.fn(async () => "creator"),
    isDev: false,
    getDevRoleOverride: vi.fn(() => null),
    log: { error: vi.fn(), warn: vi.fn() },
    ...overrides,
  };
  return { guard: createAuthGuard(deps), deps };
}

describe("createAuthGuard: construction", () => {
  it("requires getSession and fetchRole", () => {
    expect(() => createAuthGuard({ fetchRole: async () => null })).toThrow(
      TypeError
    );
    expect(() => createAuthGuard({ getSession: () => null })).toThrow(
      TypeError
    );
  });

  it("exposes the fail-closed redirect shape", () => {
    expect(ROLE_UNAVAILABLE_QUERY).toBe("role-unavailable");
    expect(roleUnavailableRedirect()).toEqual(ROLE_UNAVAILABLE);
  });

  it("maps roles to their own dashboard", () => {
    expect(dashboardForRole("student")).toEqual({ path: "/student" });
    expect(dashboardForRole("professor")).toEqual({ path: "/professor" });
    expect(dashboardForRole("creator")).toEqual({ path: "/dashboard" });
    expect(dashboardForRole("anything-else")).toEqual({ path: "/dashboard" });
  });
});

describe("createAuthGuard: public routes and the root redirect", () => {
  it("lets a public route through without a session", async () => {
    const { guard, deps } = makeGuard({ getSession: vi.fn(() => null) });
    await expect(guard(CHAPTERS)).resolves.toBeUndefined();
    expect(deps.fetchRole).not.toHaveBeenCalled();
  });

  it("lets a public route through with a session", async () => {
    const { guard, deps } = makeGuard();
    await expect(guard(CHAPTERS)).resolves.toBeUndefined();
    expect(deps.fetchRole).not.toHaveBeenCalled();
  });

  it("tolerates a route with no meta at all", async () => {
    const { guard } = makeGuard({ getSession: vi.fn(() => null) });
    await expect(
      guard({ path: "/styleguide", name: "styleguide" })
    ).resolves.toBeUndefined();
  });

  it("sends a signed-in visitor from / to /chapters", async () => {
    const { guard } = makeGuard();
    await expect(guard(HOME)).resolves.toEqual({ path: "/chapters" });
  });

  it("keeps an anonymous visitor on /", async () => {
    const { guard } = makeGuard({ getSession: vi.fn(() => null) });
    await expect(guard(HOME)).resolves.toBeUndefined();
  });
});

describe("createAuthGuard: requiresAuth", () => {
  it("redirects to / when there is no session", async () => {
    const { guard, deps } = makeGuard({ getSession: vi.fn(() => null) });
    await expect(guard(SETTINGS)).resolves.toEqual({ path: "/" });
    expect(deps.fetchRole).not.toHaveBeenCalled();
  });

  it("passes with a session when no role is required (no lookup)", async () => {
    const { guard, deps } = makeGuard();
    await expect(guard(SETTINGS)).resolves.toBeUndefined();
    expect(deps.fetchRole).not.toHaveBeenCalled();
  });

  it("redirects to / when a role is needed but the session has no user id", async () => {
    const { guard, deps } = makeGuard({
      getSession: vi.fn(() => ({ access_token: "tok", user: {} })),
    });
    await expect(guard(EDITOR)).resolves.toEqual({ path: "/" });
    expect(deps.fetchRole).not.toHaveBeenCalled();
  });
});

describe("createAuthGuard: requiredRole", () => {
  it("hands the session to fetchRole", async () => {
    const { guard, deps } = makeGuard();
    await guard(EDITOR);
    expect(deps.fetchRole).toHaveBeenCalledTimes(1);
    expect(deps.fetchRole).toHaveBeenCalledWith(SESSION);
  });

  it.each([
    ["creator", EDITOR],
    ["professor", PROFESSOR],
    ["student", STUDENT],
  ])("lets a %s onto their own route", async (role, target) => {
    const { guard } = makeGuard({ fetchRole: vi.fn(async () => role) });
    await expect(guard(target)).resolves.toBeUndefined();
  });

  it("accepts an array of allowed roles", async () => {
    const shared = route({
      path: "/shared",
      name: "shared",
      meta: { requiresAuth: true, requiredRole: ["creator", "professor"] },
    });
    const professor = makeGuard({ fetchRole: vi.fn(async () => "professor") });
    await expect(professor.guard(shared)).resolves.toBeUndefined();

    const student = makeGuard({ fetchRole: vi.fn(async () => "student") });
    await expect(student.guard(shared)).resolves.toEqual({ path: "/student" });
  });

  it.each([
    ["student", EDITOR, { path: "/student" }],
    ["professor", EDITOR, { path: "/professor" }],
    ["creator", PROFESSOR, { path: "/dashboard" }],
    ["creator", STUDENT, { path: "/dashboard" }],
    ["student", PROFESSOR, { path: "/student" }],
    ["professor", STUDENT, { path: "/professor" }],
  ])(
    "sends a %s who hits a route for another role to their own dashboard",
    async (role, target, expected) => {
      const { guard } = makeGuard({ fetchRole: vi.fn(async () => role) });
      await expect(guard(target)).resolves.toEqual(expected);
    }
  );

  it("sends an unrecognised (but present) role to the generic dashboard", async () => {
    const { guard } = makeGuard({ fetchRole: vi.fn(async () => "admin") });
    await expect(guard(EDITOR)).resolves.toEqual({ path: "/dashboard" });
  });
});

describe("createAuthGuard: /dashboard fan-out", () => {
  it("sends a student to /student", async () => {
    const { guard } = makeGuard({ fetchRole: vi.fn(async () => "student") });
    await expect(guard(DASHBOARD)).resolves.toEqual({ path: "/student" });
  });

  it("sends a professor to /professor", async () => {
    const { guard } = makeGuard({ fetchRole: vi.fn(async () => "professor") });
    await expect(guard(DASHBOARD)).resolves.toEqual({ path: "/professor" });
  });

  it("lets a creator stay on /dashboard", async () => {
    const { guard } = makeGuard({ fetchRole: vi.fn(async () => "creator") });
    await expect(guard(DASHBOARD)).resolves.toBeUndefined();
  });
});

describe("createAuthGuard: fails closed when the role is unavailable", () => {
  it("redirects to /chapters?auth=role-unavailable when the lookup throws", async () => {
    const boom = new Error("API Error 500: nope");
    const { guard, deps } = makeGuard({
      fetchRole: vi.fn(async () => {
        throw boom;
      }),
    });
    await expect(guard(EDITOR)).resolves.toEqual(ROLE_UNAVAILABLE);
    expect(deps.log.error).toHaveBeenCalledTimes(1);
    expect(deps.log.error.mock.calls[0]).toContain(boom);
  });

  it("does not let /dashboard through when the lookup throws", async () => {
    const { guard } = makeGuard({
      fetchRole: vi.fn(async () => {
        throw new Error("network down");
      }),
    });
    await expect(guard(DASHBOARD)).resolves.toEqual(ROLE_UNAVAILABLE);
  });

  it.each([[null], [undefined], [""]])(
    "redirects when the lookup resolves to %o (no profile row)",
    async (value) => {
      const { guard, deps } = makeGuard({
        fetchRole: vi.fn(async () => value),
      });
      await expect(guard(EDITOR)).resolves.toEqual(ROLE_UNAVAILABLE);
      await expect(guard(DASHBOARD)).resolves.toEqual(ROLE_UNAVAILABLE);
      expect(deps.log.warn).toHaveBeenCalled();
    }
  );

  it("treats a non-string role as unavailable rather than matching it", async () => {
    const { guard } = makeGuard({ fetchRole: vi.fn(async () => 42) });
    await expect(guard(EDITOR)).resolves.toEqual(ROLE_UNAVAILABLE);
  });

  it("does not fail closed on routes that never needed a role", async () => {
    const { guard } = makeGuard({
      fetchRole: vi.fn(async () => {
        throw new Error("should not be called");
      }),
    });
    await expect(guard(SETTINGS)).resolves.toBeUndefined();
    await expect(guard(CHAPTERS)).resolves.toBeUndefined();
  });
});

describe("createAuthGuard: DEV role override", () => {
  it("honours the override for requiredRole and skips the lookup", async () => {
    const { guard, deps } = makeGuard({
      isDev: true,
      getDevRoleOverride: vi.fn(() => "student"),
    });
    await expect(guard(EDITOR)).resolves.toEqual({ path: "/student" });
    await expect(guard(STUDENT)).resolves.toBeUndefined();
    expect(deps.fetchRole).not.toHaveBeenCalled();
  });

  it("honours the override for the /dashboard fan-out", async () => {
    const professor = makeGuard({
      isDev: true,
      getDevRoleOverride: vi.fn(() => "professor"),
    });
    await expect(professor.guard(DASHBOARD)).resolves.toEqual({
      path: "/professor",
    });

    const creator = makeGuard({
      isDev: true,
      getDevRoleOverride: vi.fn(() => "creator"),
    });
    await expect(creator.guard(DASHBOARD)).resolves.toBeUndefined();
    expect(creator.deps.fetchRole).not.toHaveBeenCalled();
  });

  it("supports an async override getter", async () => {
    const { guard, deps } = makeGuard({
      isDev: true,
      getDevRoleOverride: vi.fn(async () => "creator"),
    });
    await expect(guard(EDITOR)).resolves.toBeUndefined();
    expect(deps.fetchRole).not.toHaveBeenCalled();
  });

  it("falls back to the lookup when the override is unset", async () => {
    const { guard, deps } = makeGuard({
      isDev: true,
      getDevRoleOverride: vi.fn(() => null),
      fetchRole: vi.fn(async () => "professor"),
    });
    await expect(guard(EDITOR)).resolves.toEqual({ path: "/professor" });
    expect(deps.fetchRole).toHaveBeenCalledTimes(1);
  });

  it("still fails closed in DEV when there is no override and the lookup fails", async () => {
    const { guard } = makeGuard({
      isDev: true,
      getDevRoleOverride: vi.fn(() => null),
      fetchRole: vi.fn(async () => null),
    });
    await expect(guard(EDITOR)).resolves.toEqual(ROLE_UNAVAILABLE);
  });

  it("still requires a session in DEV even with an override set", async () => {
    const { guard } = makeGuard({
      isDev: true,
      getSession: vi.fn(() => null),
      getDevRoleOverride: vi.fn(() => "creator"),
    });
    await expect(guard(EDITOR)).resolves.toEqual({ path: "/" });
  });

  it("ignores the override outside DEV", async () => {
    const { guard, deps } = makeGuard({
      isDev: false,
      getDevRoleOverride: vi.fn(() => "creator"),
      fetchRole: vi.fn(async () => "student"),
    });
    await expect(guard(EDITOR)).resolves.toEqual({ path: "/student" });
    expect(deps.getDevRoleOverride).not.toHaveBeenCalled();
    expect(deps.fetchRole).toHaveBeenCalledTimes(1);
  });
});
