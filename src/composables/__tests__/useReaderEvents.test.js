import { describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({
  session: null,
  request: vi.fn(async () => ({})),
}));
vi.mock("@/services/api/client", () => ({
  getSession: () => state.session,
  authedRequest: state.request,
}));
import { recordReaderEvent } from "../useReaderEvents";
describe("reader events", () => {
  it("never records anonymously; debounces per user/module/ref and tolerates missing migration", async () => {
    expect(await recordReaderEvent("m", "video_play", "v", 0)).toBe(false);
    expect(state.request).not.toHaveBeenCalled();
    state.session = { access_token: "token", user: { id: "a" } };
    expect(await recordReaderEvent("m", "video_play", "v", 1)).toBe(true);
    expect(await recordReaderEvent("m", "video_play", "v", 2)).toBe(false);
    expect(await recordReaderEvent("m", "video_play", "v", 30002)).toBe(true);
    state.request.mockRejectedValueOnce(new Error("404"));
    expect(await recordReaderEvent("m", "widget_open", "widget", 30003)).toBe(
      false
    );
  });
});
