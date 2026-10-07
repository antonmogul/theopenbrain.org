import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/services/api/client", () => ({ authedRequest: vi.fn() }));
import { authedRequest } from "@/services/api/client";
import { readDashboardRows } from "../dashboardReadRows";

beforeEach(() => vi.clearAllMocks());
describe("dashboard read pagination", () => {
  it("does not return a partial dataset when a later page fails", async () => {
    authedRequest
      .mockResolvedValueOnce([{ id: "one" }])
      .mockRejectedValueOnce(new Error("offline"));
    await expect(readDashboardRows("feedback?order=id.asc")).rejects.toThrow(
      "offline"
    );
  });
  it("rejects a server that ignores offset instead of inflating or truncating counts", async () => {
    authedRequest.mockResolvedValue([{ id: "one" }]);
    await expect(readDashboardRows("feedback?order=id.asc")).rejects.toThrow(
      "did not advance"
    );
    expect(authedRequest).toHaveBeenCalledTimes(2);
  });
  it("rejects unexpected non-row responses", async () => {
    authedRequest.mockResolvedValue({ success: true });
    await expect(readDashboardRows("feedback?order=id.asc")).rejects.toThrow(
      "Unexpected"
    );
  });
  it("abandons superseded requests before reading more pages", async () => {
    const isCurrent = vi.fn().mockReturnValueOnce(true).mockReturnValue(false);
    authedRequest.mockResolvedValue([{ id: "one" }]);
    expect(await readDashboardRows("feedback?order=id.asc", isCurrent)).toEqual(
      []
    );
    expect(authedRequest).toHaveBeenCalledTimes(1);
  });
  it("fails explicitly rather than silently returning totals at the safety limit", async () => {
    authedRequest.mockImplementation(async (q) => [{ id: q }]);
    await expect(readDashboardRows("feedback?order=id.asc")).rejects.toThrow(
      "no partial totals"
    );
    expect(authedRequest).toHaveBeenCalledTimes(200);
  });
});
