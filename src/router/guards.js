/*
 * Navigation guard for the auth/role boundary.
 *
 * The decision logic is a pure function of injected dependencies — no router,
 * no localStorage, no fetch — so it can be exercised in unit tests without a
 * DOM. src/router/index.js wires the real implementations and registers the
 * result with router.beforeEach.
 *
 * Decision table (route meta x session x role x lookup outcome):
 *
 *   / with session                          -> /chapters
 *   public route                            -> pass
 *   requiresAuth, no session                -> /
 *   requiresAuth, session, no role needed   -> pass
 *   role needed, session has no user id     -> /
 *   role needed, lookup throws / empty      -> /chapters?auth=role-unavailable
 *   /dashboard, role student|professor      -> /student | /professor
 *   /dashboard, role creator (or other)     -> pass
 *   requiredRole includes role              -> pass
 *   requiredRole excludes role              -> that role's own dashboard
 *
 * "Role needed" means the route declares meta.requiredRole or is the generic
 * /dashboard fan-out. In DEV a role override (useAuth's devRoleOverride)
 * replaces the lookup entirely; outside DEV it is ignored.
 */

export const ROLE_UNAVAILABLE_QUERY = "role-unavailable";

/** Redirect target for the role-unavailable fail-closed path. */
export function roleUnavailableRedirect() {
  return { path: "/chapters", query: { auth: ROLE_UNAVAILABLE_QUERY } };
}

/**
 * Map a role to its own dashboard. Unknown roles (including creator) land on
 * the generic /dashboard, matching the pre-existing redirects.
 */
export function dashboardForRole(role) {
  if (role === "student") return { path: "/student" };
  if (role === "professor") return { path: "/professor" };
  return { path: "/dashboard" };
}

/**
 * A role value is usable when it is a non-empty string. undefined/null/""
 * all mean "could not be determined" and must fail closed.
 */
function hasRole(role) {
  return typeof role === "string" && role.length > 0;
}

/**
 * @param {Object} deps
 * @param {() => Object|null} deps.getSession
 *   Returns the current session (with user.id + access_token) or null.
 * @param {(session: Object) => Promise<string|null>} deps.fetchRole
 *   Resolves the user's role. Throwing, or resolving to a falsy value, both
 *   mean the role is unavailable.
 * @param {boolean} [deps.isDev]
 *   Whether the DEV role override may be consulted.
 * @param {() => string|null|Promise<string|null>} [deps.getDevRoleOverride]
 *   Returns the override role, or null when unset. Only called when isDev.
 * @param {{ error: Function, warn: Function }} [deps.log]
 * @returns {(to: Object, from?: Object) => Promise<Object|undefined>}
 *   A Vue Router beforeEach guard: resolves to a redirect location or to
 *   undefined to let the navigation through.
 */
export function createAuthGuard({
  getSession,
  fetchRole,
  isDev = false,
  getDevRoleOverride = () => null,
  log = console,
}) {
  if (typeof getSession !== "function") {
    throw new TypeError("createAuthGuard: getSession is required");
  }
  if (typeof fetchRole !== "function") {
    throw new TypeError("createAuthGuard: fetchRole is required");
  }

  return async function authGuard(to) {
    const meta = to.meta ?? {};

    // Default-route redirect: signed-in users land on the chapter library, not
    // the anonymous marketing home. Anonymous users keep HomeView at /.
    if (to.path === "/" && getSession()) {
      return { path: "/chapters" };
    }

    if (!meta.requiresAuth) return undefined;

    const session = getSession();
    if (!session) {
      return { path: "/" };
    }

    const needsRole = Boolean(meta.requiredRole) || to.name === "dashboard";
    if (!needsRole) return undefined;

    let role = null;

    if (isDev) {
      const override = await getDevRoleOverride();
      if (hasRole(override)) role = override;
    }

    if (!hasRole(role)) {
      const userId = session.user?.id;
      if (!userId) {
        return { path: "/" };
      }

      try {
        role = await fetchRole(session);
      } catch (err) {
        log.error("Router: role lookup failed, denying navigation:", err);
        role = null;
      }

      if (!hasRole(role)) {
        // Fail closed: a route that depends on the role must not open when we
        // cannot tell what the role is (network error, non-2xx, empty result).
        log.warn(
          `Router: no role available for user ${userId}; redirecting to /chapters`
        );
        return roleUnavailableRedirect();
      }
    }

    // Generic /dashboard fans out to the role-specific dashboard.
    if (to.name === "dashboard" && role !== "creator") {
      if (role === "student" || role === "professor") {
        return dashboardForRole(role);
      }
    }

    if (meta.requiredRole) {
      const requiredRoles = Array.isArray(meta.requiredRole)
        ? meta.requiredRole
        : [meta.requiredRole];

      if (!requiredRoles.includes(role)) {
        return dashboardForRole(role);
      }
    }

    return undefined;
  };
}
