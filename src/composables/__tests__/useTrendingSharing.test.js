import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { effectScope, nextTick, ref } from "vue";
import { flushPromises } from "@vue/test-utils";

// The share switch's deploy gate (OPENBRAIN-128): the toolbar offers "Share
// with readers" only once the database has the migration that keeps shared
// highlight rows private, which public.trending_sharing_ready() proves.
const { post, auth } = vi.hoisted(() => ({
  post: vi.fn(),
  auth: { isAuthenticated: null },
}));
vi.mock("@/services/api/client", () => ({ post }));
vi.mock("@/composables/useAuth", () => ({ useAuth: () => auth }));

let scopes = [];
let errors;

// A fresh module per test: the answer is cached for the page load.
async function consumer() {
  const { useTrendingSharing } = await import("../useTrendingSharing");
  const scope = effectScope();
  scopes.push(scope);
  return scope.run(() => useTrendingSharing());
}

function apiError(status, body) {
  const error = new Error(`API Error ${status}: ${body}`);
  error.status = status;
  return error;
}

beforeEach(() => {
  vi.resetModules();
  post.mockReset();
  auth.isAuthenticated = ref(true);
  errors = vi.spyOn(console, "error");
});

afterEach(() => {
  scopes.forEach((scope) => scope.stop());
  scopes = [];
  // Nothing here is worth a console error, before the push least of all.
  expect(errors).not.toHaveBeenCalled();
  errors.mockRestore();
});

describe("useTrendingSharing", () => {
  it("offers sharing once the database answers true", async () => {
    post.mockResolvedValue(true);
    const { sharingReady } = await consumer();
    expect(sharingReady.value).toBe(false); // not before it answers
    await flushPromises();

    expect(post).toHaveBeenCalledWith("rpc/trending_sharing_ready", {});
    expect(sharingReady.value).toBe(true);
  });

  it.each([
    [
      "before the push (404 PGRST202)",
      () =>
        Promise.reject(
          apiError(
            404,
            '{"code":"PGRST202","message":"Could not find the function public.trending_sharing_ready"}'
          )
        ),
    ],
    ["offline", () => Promise.reject(new TypeError("Failed to fetch"))],
    ["on a server error", () => Promise.reject(apiError(500, "{}"))],
    ["on any answer but true", () => Promise.resolve({ success: true })],
  ])("keeps the switch hidden %s, quietly", async (_, answer) => {
    post.mockImplementation(answer);
    const { sharingReady } = await consumer();
    await flushPromises();

    expect(post).toHaveBeenCalledTimes(1);
    expect(sharingReady.value).toBe(false);
  });

  it("asks once per page load, for every toolbar", async () => {
    post.mockResolvedValue(true);
    const first = await consumer();
    const second = await consumer();
    await flushPromises();
    const third = await consumer();

    expect(post).toHaveBeenCalledTimes(1);
    for (const { sharingReady } of [first, second, third])
      expect(sharingReady.value).toBe(true);
  });

  it("never asks for, or offers sharing to, an anonymous reader", async () => {
    post.mockResolvedValue(true);
    auth.isAuthenticated.value = false;
    const { sharingReady } = await consumer();
    await flushPromises();
    expect(post).not.toHaveBeenCalled();
    expect(sharingReady.value).toBe(false);

    // Signing in asks; signing out hides it again without asking.
    auth.isAuthenticated.value = true;
    await nextTick();
    await flushPromises();
    expect(post).toHaveBeenCalledTimes(1);
    expect(sharingReady.value).toBe(true);

    auth.isAuthenticated.value = false;
    await nextTick();
    expect(sharingReady.value).toBe(false);
    expect(post).toHaveBeenCalledTimes(1);
  });
});
