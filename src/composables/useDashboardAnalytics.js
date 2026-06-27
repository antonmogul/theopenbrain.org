import { ref } from "vue";
import { authedRequest as supabaseRest } from "@/services/api/client";
import { withAsyncState } from "@/composables/withAsyncState";

/**
 * Creator-dashboard "Analytics" section: metrics, daily-active chart, content/
 * quiz performance, trending highlights — all derived from analytics_events,
 * reading_progress and quiz_attempts over a selectable date range.
 *
 * Extracted verbatim from DashboardView.vue (#10 — dashboard section
 * composables). Behavior unchanged; only relocated. Fully self-contained:
 * reads only analyticsDateRange, writes only analytics state.
 *
 * Note: the cross-section dashboard-home aggregates (dashboardStats,
 * maxRoleCount) and the fetchDashboardData orchestrator stay in the view —
 * they compose multiple sections and belong to the shell, not here.
 */
export function useDashboardAnalytics() {
    // ---- state ----
    const analyticsLoading = ref(false);
    const analyticsError = ref(null);
    const analyticsDateRange = ref("7days"); // 7days, 30days, 90days
    const analyticsMetrics = ref({
        activeUsers: 0,
        totalPageViews: 0,
        avgTimeOnContent: 0,
        quizCompletionRate: 0,
    });
    const analyticsChartData = ref({
        labels: [],
        datasets: [],
    });
    const contentPerformance = ref([]);
    const quizPerformance = ref([]);
    const trendingHighlights = ref([]);

    // ---- fetch ----
    async function fetchAnalytics() {
        await withAsyncState(
            { loading: analyticsLoading, error: analyticsError },
            "Error fetching analytics:",
            async () => {
                await runFetchAnalytics();
            },
        );
    }

    async function runFetchAnalytics() {
            const now = new Date();
            let startDate;

            switch (analyticsDateRange.value) {
                case "7days":
                    startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
                    break;
                case "30days":
                    startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
                    break;
                case "90days":
                    startDate = new Date(now - 90 * 24 * 60 * 60 * 1000);
                    break;
                default:
                    startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
            }

            const startDateStr = startDate.toISOString();

            // Fetch analytics events
            const events = await supabaseRest(
                `analytics_events?select=*&created_at=gte.${startDateStr}&order=created_at.desc`,
            );

            // Calculate metrics
            const uniqueUsers = new Set(
                events.filter((e) => e.user_id).map((e) => e.user_id),
            );
            analyticsMetrics.value.activeUsers = uniqueUsers.size;
            analyticsMetrics.value.totalPageViews = events.filter(
                (e) => e.event_type === "page_view",
            ).length;

            // Fetch reading progress for avg time
            const progress = await supabaseRest(
                `reading_progress?select=time_spent_seconds&last_accessed_at=gte.${startDateStr}`,
            );
            const totalTime = progress.reduce(
                (sum, p) => sum + (p.time_spent_seconds || 0),
                0,
            );
            analyticsMetrics.value.avgTimeOnContent = progress.length
                ? Math.round(totalTime / progress.length)
                : 0;

            // Fetch quiz completion rate
            const quizAttempts = await supabaseRest(
                `quiz_attempts?select=status,score,total_points,quiz_id&started_at=gte.${startDateStr}`,
            );
            const completedAttempts = quizAttempts.filter(
                (a) => a.status === "completed",
            );
            const passingAttempts = completedAttempts.filter(
                (a) => a.total_points && (a.score / a.total_points) * 100 >= 70,
            );
            analyticsMetrics.value.quizCompletionRate = completedAttempts.length
                ? Math.round(
                      (passingAttempts.length / completedAttempts.length) * 100,
                  )
                : 0;

            // Build chart data (daily active users)
            const dailyData = {};
            const days =
                analyticsDateRange.value === "7days"
                    ? 7
                    : analyticsDateRange.value === "30days"
                      ? 30
                      : 90;

            for (let i = 0; i < days; i++) {
                const date = new Date(now - i * 24 * 60 * 60 * 1000);
                const dateStr = date.toISOString().split("T")[0];
                dailyData[dateStr] = new Set();
            }

            events.forEach((event) => {
                if (event.user_id && event.created_at) {
                    const dateStr = event.created_at.split("T")[0];
                    if (dailyData[dateStr]) {
                        dailyData[dateStr].add(event.user_id);
                    }
                }
            });

            const sortedDates = Object.keys(dailyData).sort();
            analyticsChartData.value = {
                labels: sortedDates.map((d) => {
                    const date = new Date(d);
                    return date.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                    });
                }),
                datasets: [
                    {
                        label: "Active Users",
                        data: sortedDates.map((d) => dailyData[d].size),
                        // Bars render via CSS (.chart-bar → rgb(var(--color-accent)));
                        // these dataset colors resolve to the same accent token.
                        borderColor: "rgb(var(--color-accent))",
                        backgroundColor: "rgb(var(--color-accent) / 0.1)",
                        fill: true,
                        tension: 0.4,
                    },
                ],
            };

            // Fetch content performance (views by module)
            const moduleViews = {};
            events
                .filter((e) => e.event_type === "page_view" && e.module_id)
                .forEach((e) => {
                    moduleViews[e.module_id] = (moduleViews[e.module_id] || 0) + 1;
                });

            const moduleIds = Object.keys(moduleViews);
            if (moduleIds.length > 0) {
                const modules = await supabaseRest(
                    `modules?id=in.(${moduleIds.join(",")})&select=id,title`,
                );
                contentPerformance.value = modules
                    .map((m) => ({
                        title: m.title,
                        views: moduleViews[m.id] || 0,
                    }))
                    .sort((a, b) => b.views - a.views)
                    .slice(0, 5);
            }

            // Fetch quiz performance
            const quizScores = {};
            quizAttempts.forEach((a) => {
                if (a.status === "completed" && a.total_points) {
                    if (!quizScores[a.quiz_id]) {
                        quizScores[a.quiz_id] = { total: 0, count: 0 };
                    }
                    quizScores[a.quiz_id].total += (a.score / a.total_points) * 100;
                    quizScores[a.quiz_id].count++;
                }
            });

            const quizIds = Object.keys(quizScores);
            if (quizIds.length > 0) {
                const quizzesData = await supabaseRest(
                    `quizzes?id=in.(${quizIds.join(",")})&select=id,title`,
                );
                quizPerformance.value = quizzesData
                    .map((q) => ({
                        title: q.title,
                        avgScore: Math.round(
                            quizScores[q.id].total / quizScores[q.id].count,
                        ),
                    }))
                    .sort((a, b) => b.avgScore - a.avgScore)
                    .slice(0, 5);
            }

            // Fetch trending highlights
            const highlights = await supabaseRest(
                "trending_highlights?select=*&order=highlight_count.desc&limit=5",
            );
            trendingHighlights.value = highlights;
    }

    function formatDuration(seconds) {
        if (!seconds) return "0s";
        if (seconds < 60) return `${seconds}s`;
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        if (minutes < 60) return `${minutes}m ${secs}s`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}m`;
    }

    return {
        // state
        analyticsLoading,
        analyticsError,
        analyticsDateRange,
        analyticsMetrics,
        analyticsChartData,
        contentPerformance,
        quizPerformance,
        trendingHighlights,
        // actions
        fetchAnalytics,
        formatDuration,
    };
}
