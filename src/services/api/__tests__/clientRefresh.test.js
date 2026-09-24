import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  apiRequest,
  setSession,
  setSessionRefresher,
} from "@/services/api/client";

// OPENBRAIN-77: a request that meets an expired token renews the session
// once and repeats itself.
describe("apiRequest after a 401", () => {
  beforeEach(() => {
    setSession({ access_token: "old" });
    globalThis.fetch = vi.fn();
  });

  it("refreshes and retries once with the new token", async () => {
    fetch
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => "JWT expired",
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => '[{"id":1}]',
      });
    const refresher = vi.fn(async () => ({ access_token: "new" }));
    setSessionRefresher(refresher);
    expect(await apiRequest("modules?select=id")).toEqual([{ id: 1 }]);
    expect(refresher).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[1][1].headers.Authorization).toBe("Bearer new");
  });

  it("gives up with the 401 when the refresh brings no new token", async () => {
    fetch.mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => "JWT expired",
    });
    setSessionRefresher(async () => null);
    await expect(apiRequest("modules?select=id")).rejects.toThrow(/401/);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
