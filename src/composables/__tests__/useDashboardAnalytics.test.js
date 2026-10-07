import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { effectScope, ref } from "vue";

vi.mock("@/services/api/client", () => ({ authedRequest: vi.fn() }));
import { authedRequest } from "@/services/api/client";
import { useDashboardAnalytics } from "@/composables/useDashboardAnalytics";

const event = (
  id,
  module_id = "retina",
  user_id = "reader-a",
  event_type = "page_view"
) => ({
  id,
  module_id,
  user_id,
  event_type,
  created_at: "2026-10-04T12:00:00Z",
});
function mockData(data, cap = 500) {
  authedRequest.mockImplementation(async (endpoint) => {
    const [table, query] = endpoint.split("?");
    const params = new URLSearchParams(query);
    const offset = Number(params.get("offset") || 0);
    return (data[table] || []).slice(
      offset,
      offset + Math.min(cap, Number(params.get("limit") || 500))
    );
  });
}
const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { resolve, reject, promise };
};

describe("useDashboardAnalytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-05T12:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("formatDuration renders s / m s / h m", () => {
    const { formatDuration } = useDashboardAnalytics(ref(true));
    expect([0, 45, 90, 3661].map(formatDuration)).toEqual([
      "0s",
      "45s",
      "1m 30s",
      "1h 1m",
    ]);
  });

  it("separates repeated page views, distinct signed-in readers, and unidentified views per chapter", async () => {
    mockData({
      analytics_events: [
        event("e1"),
        event("e2"),
        event("e3", "retina", null),
        event("e4", "retina", "reader-b"),
        event("e5", "history"),
        event("e6", "history", "reader-c", "click"),
        event("e7", null),
        event("e8", "retina", ""),
      ],
      modules: [
        { id: "retina", title: "Retina" },
        { id: "history", title: "History" },
        { id: "empty", title: "No events" },
      ],
    });
    const a = useDashboardAnalytics(ref(true));
    await a.fetchAnalytics();
    expect(a.analyticsMetrics.value).toMatchObject({
      activeUsers: 3,
      totalPageViews: 7,
      unidentifiedPageViews: 2,
      unassignedPageViews: 1,
    });
    expect(a.contentPerformance.value).toEqual([
      {
        id: "retina",
        title: "Retina",
        views: 5,
        uniqueUsers: 2,
        unidentifiedViews: 2,
      },
      {
        id: "history",
        title: "History",
        views: 1,
        uniqueUsers: 1,
        unidentifiedViews: 0,
      },
      {
        id: "empty",
        title: "No events",
        views: 0,
        uniqueUsers: 0,
        unidentifiedViews: 0,
      },
    ]);
    expect(
      authedRequest.mock.calls.some(([query]) =>
        query.startsWith("reading_progress")
      )
    ).toBe(false);
    const query = authedRequest.mock.calls.find(([query]) =>
      query.startsWith("analytics_events")
    )[0];
    expect(query).toContain(
      "select=id,user_id,event_type,module_id,created_at"
    );
    expect(query).toContain("created_at=gte.2026-09-28T12:00:00.000Z");
    expect(query).toContain("created_at=lte.2026-10-05T12:00:00.000Z");
    expect(query).toContain("order=created_at.asc,id.asc");
  });

  it("loads beyond the REST default cap, continuing after short server-capped pages", async () => {
    mockData(
      {
        analytics_events: Array.from({ length: 1201 }, (_, i) =>
          event(`e${i}`, "retina", `r${i % 17}`)
        ),
      },
      400
    );
    const a = useDashboardAnalytics(ref(true));
    await a.fetchAnalytics();
    expect(a.analyticsMetrics.value.totalPageViews).toBe(1201);
    expect(a.contentPerformance.value[0]).toMatchObject({
      title: "Unavailable chapter",
      views: 1201,
      uniqueUsers: 17,
    });
    const calls = authedRequest.mock.calls
      .map(([q]) => q)
      .filter((q) => q.startsWith("analytics_events"));
    expect(
      calls.map((q) => new URLSearchParams(q.split("?")[1]).get("offset"))
    ).toEqual(["0", "400", "800", "1200", "1201"]);
  });

  it("deduplicates repeated event IDs without collapsing genuine repeated views", async () => {
    mockData(
      {
        analytics_events: [event("e1"), event("e1"), event("e2")],
        modules: [{ id: "retina", title: "Retina" }],
      },
      2
    );
    const a = useDashboardAnalytics(ref(true));
    await a.fetchAnalytics();
    expect(a.contentPerformance.value[0]).toMatchObject({
      views: 2,
      uniqueUsers: 1,
    });
  });

  it("shows every chapter, including those below the previous top-five cutoff", async () => {
    mockData({
      modules: Array.from({ length: 7 }, (_, i) => ({
        id: `m${i}`,
        title: `Chapter ${i}`,
      })),
    });
    const a = useDashboardAnalytics(ref(true));
    await a.fetchAnalytics();
    expect(a.contentPerformance.value).toHaveLength(7);
    expect(a.contentPerformance.value.every((c) => c.uniqueUsers === 0)).toBe(
      true
    );
  });

  it("resets empty ranges and failed refreshes instead of retaining chapter or quiz totals", async () => {
    mockData({
      analytics_events: [event("e1")],
      quiz_attempts: [
        {
          id: "a",
          quiz_id: "q",
          status: "completed",
          total_points: 10,
          score: 8,
        },
      ],
      quizzes: [{ id: "q", title: "Quiz" }],
      trending_highlights: [{ selected_text: "Test" }],
    });
    const a = useDashboardAnalytics(ref(true));
    await a.fetchAnalytics();
    expect(a.quizPerformance.value).toHaveLength(1);
    mockData({});
    a.analyticsDateRange.value = "30days";
    await a.fetchAnalytics();
    expect(a.contentPerformance.value).toEqual([]);
    expect(a.quizPerformance.value).toEqual([]);
    expect(a.trendingHighlights.value).toEqual([]);
    expect(a.analyticsChartData.value.labels).toEqual([]);
    expect(a.analyticsMetrics.value.totalPageViews).toBe(0);
    authedRequest.mockRejectedValue(new Error("net"));
    await a.fetchAnalytics();
    expect(a.analyticsError.value).toBe("net");
    expect(a.analyticsLoading.value).toBe(false);
    expect(a.contentPerformance.value).toEqual([]);
  });

  it.each(["resolve", "reject"])(
    "ignores an older request that %s after a newer date range finishes",
    async (method) => {
      const old = deferred();
      mockData({});
      const currentMock = authedRequest.getMockImplementation();
      let first = true;
      authedRequest.mockImplementation((endpoint) => {
        if (first && endpoint.startsWith("analytics_events")) {
          first = false;
          return old.promise;
        }
        return currentMock(endpoint);
      });
      const a = useDashboardAnalytics(ref(true));
      const oldRun = a.fetchAnalytics();
      a.analyticsDateRange.value = "90days";
      await a.fetchAnalytics();
      old[method](
        method === "resolve" ? [event("old")] : new Error("old failure")
      );
      await oldRun;
      expect(a.analyticsMetrics.value.totalPageViews).toBe(0);
      expect(a.analyticsError.value).toBeNull();
      expect(a.analyticsLoading.value).toBe(false);
    }
  );

  it("includes the partial first UTC day and does not sum daily users as range uniques", async () => {
    mockData({
      analytics_events: [
        { ...event("first"), created_at: "2026-09-28T13:00:00Z" },
        { ...event("last"), created_at: "2026-10-05T11:00:00Z" },
      ],
    });
    const a = useDashboardAnalytics(ref(true));
    await a.fetchAnalytics();
    expect(a.analyticsChartData.value.labels).toHaveLength(8);
    expect(a.analyticsChartData.value.datasets[0].data).toEqual([
      1, 0, 0, 0, 0, 0, 0, 1,
    ]);
    expect(a.analyticsMetrics.value.activeUsers).toBe(1);
  });

  it("does not read analytics without explicit creator access", async () => {
    const a = useDashboardAnalytics();
    await a.fetchAnalytics();
    expect(authedRequest).not.toHaveBeenCalled();
    expect(a.analyticsAccessDenied.value).toBe(true);
  });

  it.each(["identity", "access"])(
    "synchronously clears all analytics on %s changes and discards pending responses",
    async (kind) => {
      const scope = effectScope();
      const allowed = ref(true);
      const identity = ref("creator-one");
      const a = scope.run(() => useDashboardAnalytics(allowed, identity));
      mockData({
        analytics_events: [event("e1")],
        modules: [{ id: "retina", title: "Retina" }],
      });
      await a.fetchAnalytics();
      expect(a.contentPerformance.value).toHaveLength(1);
      if (kind === "identity") identity.value = "creator-two";
      else allowed.value = false;
      expect(a.contentPerformance.value).toEqual([]);
      expect(a.quizPerformance.value).toEqual([]);
      expect(a.trendingHighlights.value).toEqual([]);
      expect(a.analyticsChartData.value.labels).toEqual([]);
      expect(a.analyticsMetrics.value.totalPageViews).toBe(0);
      allowed.value = true;
      const pending = deferred();
      authedRequest.mockImplementationOnce(() => pending.promise);
      const oldRun = a.fetchAnalytics();
      if (kind === "identity") identity.value = "creator-three";
      else allowed.value = false;
      expect(a.analyticsLoading.value).toBe(false);
      pending.resolve([event("late")]);
      await oldRun;
      expect(a.contentPerformance.value).toEqual([]);
      expect(a.analyticsMetrics.value.totalPageViews).toBe(0);
      scope.stop();
    }
  );
});
