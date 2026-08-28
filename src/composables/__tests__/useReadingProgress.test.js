import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { h } from "vue";
import { flushPromises, mount } from "@vue/test-utils";
import { useReadingProgress } from "@/composables/useReadingProgress";

const authedRequest = vi.hoisted(() => vi.fn());
const authState = vi.hoisted(() => ({ user: null }));

vi.mock("@/services/api/client", () => ({ authedRequest }));
vi.mock("@/composables/useAuth", async () => {
  const { ref: makeRef } = await vi.importActual("vue");
  const user = makeRef({ id: "student-1" });
  authState.user = user;
  return {
    useAuth: () => ({ user }),
  };
});

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

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
  authState.user.value = { id: "student-1" };
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

  it("uses an explicit conflict target and exact null-course identity", async () => {
    let api;
    const wrapper = mount({
      setup() {
        api = useReadingProgress("module-1");
        return () => h("div");
      },
    });
    await flushPromises();

    expect(authedRequest.mock.calls[0][0]).toContain("course_id=is.null");
    await api.saveProgress(41);

    const [endpoint, options] = authedRequest.mock.calls.at(-1);
    expect(endpoint).toBe(
      "reading_progress?on_conflict=user_id,module_id,course_id"
    );
    expect(JSON.parse(options.body).course_id).toBeNull();
    wrapper.unmount();
  });

  it("serializes overlapping saves and coalesces queued positions", async () => {
    const harness = mountProgress();
    await flushPromises();
    const firstWrite = deferred();
    authedRequest.mockImplementationOnce(() => firstWrite.promise);

    const first = harness.api.saveProgress(40, "section-1");
    const second = harness.api.saveProgress(50, "section-2");
    const third = harness.api.saveProgress(60, "section-3");

    expect(authedRequest).toHaveBeenCalledTimes(2); // load + first write
    firstWrite.resolve([]);
    await first;
    await flushPromises();

    expect(authedRequest).toHaveBeenCalledTimes(3);
    const queuedPayload = JSON.parse(authedRequest.mock.calls[2][1].body);
    expect(queuedPayload.scroll_position).toBe(60);
    expect(queuedPayload.last_section_id).toBe("section-3");
    await expect(Promise.all([second, third])).resolves.toEqual([true, true]);
    harness.wrapper.unmount();
  });

  it("keeps elapsed time through a final save queued behind an in-flight save", async () => {
    const harness = mountProgress();
    await flushPromises();
    vi.advanceTimersByTime(30_000);

    const firstWrite = deferred();
    authedRequest.mockImplementationOnce(() => firstWrite.promise);
    const periodicSave = harness.api.saveProgress(40);
    vi.advanceTimersByTime(5_000);
    const finalSave = harness.api.stopTracking();

    firstWrite.resolve([]);
    await periodicSave;
    await finalSave;

    const finalPayload = JSON.parse(authedRequest.mock.calls.at(-1)[1].body);
    expect(finalPayload.time_spent_seconds).toBe(155);
    harness.wrapper.unmount();
  });

  it("never regresses a completed chapter on a later low-position save", async () => {
    authedRequest.mockResolvedValueOnce([
      {
        scroll_position: 100,
        time_spent_seconds: 120,
        is_completed: true,
        completed_at: "2026-08-20T10:00:00Z",
      },
    ]);
    const harness = mountProgress();
    await flushPromises();

    await harness.api.saveProgress(10);
    const payload = JSON.parse(authedRequest.mock.calls.at(-1)[1].body);
    expect(payload.is_completed).toBe(true);
    expect(payload.completed_at).toBe("2026-08-20T10:00:00Z");
    harness.wrapper.unmount();
  });

  it("ignores a stale module load and exposes readiness by generation", async () => {
    const oldLoad = deferred();
    authedRequest.mockImplementationOnce(() => oldLoad.promise);
    authedRequest.mockResolvedValueOnce([
      { scroll_position: 72, time_spent_seconds: 9 },
    ]);
    const harness = mountProgress();

    await harness.api.initForModule("module-2", "course-2");
    expect(harness.api.identityVersion.value).toBe(1);
    expect(harness.api.readyIdentityVersion.value).toBe(1);
    expect(harness.api.progress.value.scroll_position).toBe(72);

    oldLoad.resolve([{ scroll_position: 10, time_spent_seconds: 100 }]);
    await flushPromises();
    expect(harness.api.progress.value.scroll_position).toBe(72);
    expect(harness.api.timeSpent.value).toBe(9);
    harness.wrapper.unmount();
  });

  it("resets and reloads progress when the authenticated user changes", async () => {
    const harness = mountProgress();
    await flushPromises();
    authedRequest.mockResolvedValueOnce([
      { scroll_position: 8, time_spent_seconds: 3 },
    ]);

    authState.user.value = { id: "student-2" };
    await flushPromises();

    const reloadEndpoint = authedRequest.mock.calls.at(-1)[0];
    expect(reloadEndpoint).toContain("user_id=eq.student-2");
    expect(harness.api.progress.value.scroll_position).toBe(8);
    expect(harness.api.timeSpent.value).toBe(3);
    expect(harness.api.readyIdentityVersion.value).toBe(
      harness.api.identityVersion.value
    );
    harness.wrapper.unmount();
  });

  it("does not retry a failed save after the module identity changes", async () => {
    const harness = mountProgress();
    await flushPromises();
    await harness.api.stopTracking();

    authedRequest.mockRejectedValueOnce(new Error("offline"));
    await harness.api.saveProgress(44);
    expect(harness.api.saveError.value).not.toBeNull();

    authedRequest.mockResolvedValueOnce([]);
    await harness.api.initForModule("module-2", "course-2");
    const callCount = authedRequest.mock.calls.length;
    await expect(harness.api.retrySave()).resolves.toBe(false);
    expect(authedRequest).toHaveBeenCalledTimes(callCount);
    harness.wrapper.unmount();
  });
});
