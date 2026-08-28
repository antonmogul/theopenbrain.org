import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { h, ref } from "vue";
import { flushPromises, mount } from "@vue/test-utils";
import { useReadingProgress } from "@/composables/useReadingProgress";

const authedRequest = vi.hoisted(() => vi.fn());

vi.mock("@/services/api/client", () => ({ authedRequest }));
vi.mock("@/composables/useAuth", () => ({
  useAuth: () => ({ user: ref({ id: "student-1" }) }),
}));

function mountProgress() {
  let api;
  const wrapper = mount({
    setup() {
      api = useReadingProgress("module-1", "course-1");
      return () => h("div");
    },
  });
  return {
    wrapper,
    get api() {
      return api;
    },
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-08-27T12:00:00Z"));
  authedRequest.mockReset();
  authedRequest.mockResolvedValue([
    { scroll_position: 30, time_spent_seconds: 120 },
  ]);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useReadingProgress", () => {
  it("adds only the current session elapsed time to the persisted total", async () => {
    const harness = mountProgress();
    await flushPromises();
    vi.advanceTimersByTime(10_000);

    authedRequest.mockResolvedValueOnce([]);
    await harness.api.saveProgress(40);

    const payload = JSON.parse(authedRequest.mock.calls.at(-1)[1].body);
    expect(payload.time_spent_seconds).toBe(130);
    expect(harness.api.timeSpent.value).toBe(130);
    harness.wrapper.unmount();
  });

  it("surfaces a save failure and clears it after a successful retry", async () => {
    const harness = mountProgress();
    await flushPromises();

    authedRequest.mockRejectedValueOnce(new Error("offline"));
    await harness.api.saveProgress(42);
    expect(harness.api.saveError.value).toContain("could not be saved");

    authedRequest.mockResolvedValueOnce([]);
    expect(await harness.api.retrySave()).toBe(true);
    expect(harness.api.saveError.value).toBeNull();
    harness.wrapper.unmount();
  });
});
