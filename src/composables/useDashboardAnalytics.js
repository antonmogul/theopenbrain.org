import { computed, ref, watch, getCurrentScope, onScopeDispose } from "vue";
import { authedRequest as supabaseRest } from "@/services/api/client";
import { readDashboardRows } from "@/composables/dashboardReadRows";

const emptyMetrics = () => ({
  activeUsers: 0,
  totalPageViews: 0,
  unidentifiedPageViews: 0,
  unassignedPageViews: 0,
  quizCompletionRate: 0,
});
const hasUser = (event) =>
  typeof event.user_id === "string" && event.user_id.trim().length > 0;

/** Creator metrics describe recorded events, not all traffic. This reader does
 * not introduce tracking or infer an anonymous identity from other metadata.
 */
export function useDashboardAnalytics(
  canRead = ref(false),
  identity = ref(null)
) {
  const analyticsLoading = ref(false);
  const analyticsError = ref(null);
  const analyticsDenied = ref(false);
  const analyticsAccessDenied = computed(
    () => !canRead.value || analyticsDenied.value
  );
  const analyticsDateRange = ref("7days");
  const analyticsMetrics = ref(emptyMetrics());
  const analyticsChartData = ref({ labels: [], datasets: [] });
  const contentPerformance = ref([]);
  const quizPerformance = ref([]);
  const trendingHighlights = ref([]);
  let requestId = 0;

  function reset() {
    analyticsMetrics.value = emptyMetrics();
    analyticsChartData.value = { labels: [], datasets: [] };
    contentPerformance.value = [];
    quizPerformance.value = [];
    trendingHighlights.value = [];
  }

  watch(
    [canRead, identity],
    () => {
      requestId++;
      reset();
      analyticsError.value = null;
      analyticsDenied.value = false;
      analyticsLoading.value = false;
    },
    { flush: "sync" }
  );

  if (getCurrentScope()) {
    onScopeDispose(() => {
      requestId++;
      reset();
      analyticsLoading.value = false;
    });
  }

  async function fetchAnalytics() {
    const current = ++requestId;
    const range = analyticsDateRange.value;
    const isCurrent = () =>
      requestId === current &&
      canRead.value &&
      analyticsDateRange.value === range;
    analyticsLoading.value = false;
    analyticsError.value = null;
    analyticsDenied.value = false;
    reset();
    if (!canRead.value) return;
    analyticsLoading.value = true;

    try {
      const now = new Date();
      const days = { "7days": 7, "30days": 30, "90days": 90 }[range] || 7;
      const start = new Date(now - days * 86400000).toISOString();
      const end = now.toISOString();
      const read = (query) => readDashboardRows(query, isCurrent);
      const [events, quizAttempts, modules] = await Promise.all([
        read(
          `analytics_events?select=id,user_id,event_type,module_id,created_at&created_at=gte.${start}&created_at=lte.${end}&order=created_at.asc,id.asc`
        ),
        read(
          `quiz_attempts?select=id,status,score,total_points,quiz_id&started_at=gte.${start}&started_at=lte.${end}&order=id.asc`
        ),
        read("modules?select=id,title&order=id.asc"),
      ]);
      if (!isCurrent()) return;

      const views = events.filter((e) => e.event_type === "page_view");
      const completed = quizAttempts.filter((a) => a.status === "completed");
      const passing = completed.filter(
        (a) => a.total_points && (a.score / a.total_points) * 100 >= 70
      );
      const metrics = {
        activeUsers: new Set(events.filter(hasUser).map((e) => e.user_id)).size,
        totalPageViews: views.length,
        unidentifiedPageViews: views.filter((e) => !hasUser(e)).length,
        unassignedPageViews: views.filter((e) => !e.module_id).length,
        quizCompletionRate: completed.length
          ? Math.round((passing.length / completed.length) * 100)
          : 0,
      };

      const byModule = new Map(
        modules.map((m) => [
          m.id,
          {
            id: m.id,
            title: m.title,
            views: 0,
            users: new Set(),
            unidentifiedViews: 0,
          },
        ])
      );
      for (const event of views) {
        if (!event.module_id) continue;
        if (!byModule.has(event.module_id)) {
          byModule.set(event.module_id, {
            id: event.module_id,
            title: "Unavailable chapter",
            views: 0,
            users: new Set(),
            unidentifiedViews: 0,
          });
        }
        const chapter = byModule.get(event.module_id);
        chapter.views++;
        if (hasUser(event)) chapter.users.add(event.user_id);
        else chapter.unidentifiedViews++;
      }
      const chapters = [...byModule.values()]
        .map(({ users, ...chapter }) => ({
          ...chapter,
          uniqueUsers: users.size,
        }))
        .sort((a, b) => b.views - a.views || a.title.localeCompare(b.title));

      // Include the partial first UTC day of the rolling window, rather than
      // silently dropping events at that boundary from the daily chart.
      const daily = new Map();
      const firstDay = new Date(start.slice(0, 10));
      for (
        let date = firstDay;
        date <= now;
        date = new Date(+date + 86400000)
      ) {
        daily.set(date.toISOString().slice(0, 10), new Set());
      }
      for (const event of events) {
        if (hasUser(event) && event.created_at) {
          daily.get(event.created_at.slice(0, 10))?.add(event.user_id);
        }
      }
      const chart = events.length
        ? {
            labels: [...daily.keys()].map((date) =>
              new Date(date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                timeZone: "UTC",
              })
            ),
            datasets: [
              {
                label: "Unique signed-in users",
                data: [...daily.values()].map((users) => users.size),
              },
            ],
          }
        : { labels: [], datasets: [] };

      const quizScores = new Map();
      for (const attempt of completed) {
        if (!attempt.total_points || !attempt.quiz_id) continue;
        const score = quizScores.get(attempt.quiz_id) || { total: 0, count: 0 };
        score.total += (attempt.score / attempt.total_points) * 100;
        score.count++;
        quizScores.set(attempt.quiz_id, score);
      }
      const quizzes = quizScores.size
        ? await read("quizzes?select=id,title&order=id.asc")
        : [];
      if (!isCurrent()) return;
      const highlights = await supabaseRest(
        "trending_highlights?select=*&order=highlight_count.desc&limit=5"
      );
      if (!isCurrent()) return;

      // Publish one consistent snapshot. Older responses and failed refreshes
      // cannot leave old chapter totals beside a newly selected date range.
      analyticsMetrics.value = metrics;
      analyticsChartData.value = chart;
      contentPerformance.value = chapters;
      quizPerformance.value = quizzes
        .filter((q) => quizScores.has(q.id))
        .map((q) => ({
          title: q.title,
          avgScore: Math.round(
            quizScores.get(q.id).total / quizScores.get(q.id).count
          ),
        }))
        .sort((a, b) => b.avgScore - a.avgScore)
        .slice(0, 5);
      trendingHighlights.value = highlights;
    } catch (error) {
      if (isCurrent()) {
        reset();
        if (error.status === 401 || error.status === 403)
          analyticsDenied.value = true;
        else
          analyticsError.value = error.message || "Could not load analytics.";
      }
    } finally {
      if (requestId === current) analyticsLoading.value = false;
    }
  }

  function formatDuration(seconds) {
    if (!seconds) return "0s";
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (minutes < 60) return `${minutes}m ${secs}s`;
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  }

  return {
    analyticsLoading,
    analyticsError,
    analyticsAccessDenied,
    analyticsDateRange,
    analyticsMetrics,
    analyticsChartData,
    contentPerformance,
    quizPerformance,
    trendingHighlights,
    fetchAnalytics,
    formatDuration,
  };
}
