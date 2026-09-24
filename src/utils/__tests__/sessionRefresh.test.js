import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ensureFreshSession,
  getSessionFromStorage,
  getStorageKey,
  getStoredSession,
} from "@/utils/authHelpers";

// OPENBRAIN-77: sessions are renewed with the refresh token instead of the
// reader being signed out silently after about an hour.
const now = () => Math.floor(Date.now() / 1000);
const store = (s) => localStorage.setItem(getStorageKey(), JSON.stringify(s));
const session = (expiresInS, extra = {}) => ({
  access_token: "old",
  refresh_token: "r1",
  expires_at: now() + expiresInS,
  user: { id: "u1" },
  ...extra,
});
const ok = (body) => ({ ok: true, status: 200, json: async () => body });

describe("ensureFreshSession", () => {
  beforeEach(() => {
    localStorage.clear();
    globalThis.fetch = vi.fn();
  });
  afterEach(() => vi.restoreAllMocks());

  it("returns a session that is good for a while without a request", async () => {
    store(session(3600));
    expect((await ensureFreshSession()).access_token).toBe("old");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("renews one that is about to expire, and stores the new one", async () => {
    store(session(30));
    fetch.mockResolvedValue(
      ok({
        access_token: "new",
        refresh_token: "r2",
        expires_at: now() + 3600,
        user: { id: "u1" },
      })
    );
    const fresh = await ensureFreshSession();
    expect(fresh.access_token).toBe("new");
    expect(fetch.mock.calls[0][0]).toMatch(/grant_type=refresh_token$/);
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({
      refresh_token: "r1",
    });
    expect(getStoredSession().refresh_token).toBe("r2");
  });

  it("renews an expired one, which the sync read keeps for it", async () => {
    store(session(-60));
    expect(getSessionFromStorage()).toBeNull(); // not signed in as-is…
    expect(getStoredSession()).not.toBeNull(); // …but kept to be renewed
    fetch.mockResolvedValue(
      ok({ access_token: "new", refresh_token: "r2", expires_at: now() + 3600 })
    );
    expect((await ensureFreshSession()).access_token).toBe("new");
  });

  it("shares one refresh between concurrent callers", async () => {
    store(session(10));
    fetch.mockResolvedValue(
      ok({ access_token: "new", refresh_token: "r2", expires_at: now() + 3600 })
    );
    const [a, b] = await Promise.all([
      ensureFreshSession(),
      ensureFreshSession(),
    ]);
    expect(a).toBe(b);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("signs out when Supabase refuses the refresh", async () => {
    store(session(10));
    fetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ msg: "Invalid Refresh Token" }),
    });
    expect(await ensureFreshSession()).toBeNull();
    expect(getStoredSession()).toBeNull();
  });

  it("keeps a still-valid session through a network failure", async () => {
    store(session(30));
    fetch.mockRejectedValue(new TypeError("Failed to fetch"));
    expect((await ensureFreshSession()).access_token).toBe("old");
    expect(getStoredSession()).not.toBeNull();
  });

  it("returns null without a session", async () => {
    expect(await ensureFreshSession()).toBeNull();
  });
});
