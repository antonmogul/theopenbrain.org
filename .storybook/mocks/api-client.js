/*
 * Deterministic Storybook replacement for services/api/client.js.
 *
 * A story opts into data with:
 *   parameters: { api: { "modules?select=*": [{ id: "chapter-2" }] } }
 *
 * Values may also be functions receiving (endpoint, options). Unlisted reads
 * resolve to an empty list and unlisted writes to a success object. No request
 * can reach the live Supabase project from this module.
 */

let fixtures = {};
let currentSession = null;

export function configureApiMock(nextFixtures = {}) {
  fixtures = { ...nextFixtures };
  currentSession = null;
}

function resolveFixture(endpoint, options) {
  const key = Object.keys(fixtures).find(
    (candidate) => candidate === endpoint || endpoint.includes(candidate)
  );
  if (!key) {
    return options.method && options.method !== "GET" ? { success: true } : [];
  }
  const value = fixtures[key];
  return typeof value === "function" ? value(endpoint, options) : value;
}

export function setSession(session) {
  currentSession = session;
}

export function getSession() {
  return currentSession;
}

export async function apiRequest(endpoint, options = {}) {
  return structuredClone(await resolveFixture(endpoint, options));
}

export const authedRequest = apiRequest;
export const get = (endpoint, options = {}) =>
  apiRequest(endpoint, { method: "GET", ...options });
export const post = (endpoint, data, options = {}) =>
  apiRequest(endpoint, {
    method: "POST",
    body: JSON.stringify(data),
    ...options,
  });
export const patch = (endpoint, data, options = {}) =>
  apiRequest(endpoint, {
    method: "PATCH",
    body: JSON.stringify(data),
    ...options,
  });
export const del = (endpoint, options = {}) =>
  apiRequest(endpoint, { method: "DELETE", ...options });

export function buildQuery(params) {
  const parts = Object.entries(params)
    .filter(
      ([, value]) => value !== undefined && value !== null && value !== ""
    )
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`);
  return parts.length ? `?${parts.join("&")}` : "";
}

export function buildInFilter(ids) {
  return `(${ids.map((id) => `"${id}"`).join(",")})`;
}

export default {
  setSession,
  getSession,
  apiRequest,
  authedRequest,
  get,
  post,
  patch,
  del,
  buildQuery,
  buildInFilter,
};
