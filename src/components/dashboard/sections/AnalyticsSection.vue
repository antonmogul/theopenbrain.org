<script setup>
// Creator-dashboard "Analytics" section (#11 split). Presentational: parent
// owns the useDashboardAnalytics instance.
import {
    SectionHeader,
    BaseCard,
    StatCard,
    StatGrid,
    ListRow,
    StatusBadge,
    EmptyState,
    LoadingState,
    ErrorState,
    SegmentedControl,
} from "@/components/dashboard/shared";

defineProps({
    analyticsLoading: { type: Boolean, default: false },
    analyticsError: { type: [String, null], default: null },
    analyticsDateRange: { type: String, default: "7days" },
    analyticsRangeOptions: { type: Array, default: () => [] },
    analyticsMetrics: { type: Object, default: () => ({}) },
    analyticsChartData: { type: Object, default: () => ({ labels: [], datasets: [] }) },
    contentPerformance: { type: Array, default: () => [] },
    quizPerformance: { type: Array, default: () => [] },
    trendingHighlights: { type: Array, default: () => [] },
    formatDuration: { type: Function, required: true },
});

defineEmits(["fetch", "range-change"]);
</script>

<template>
    <section class="section">
        <SectionHeader eyebrow="07 · Analytics" title="Platform analytics">
            <template #actions>
                <SegmentedControl
                    :model-value="analyticsDateRange"
                    :options="analyticsRangeOptions"
                    aria-label="Analytics date range"
                    @update:model-value="$emit('range-change', $event)"
                />
            </template>
        </SectionHeader>

        <LoadingState v-if="analyticsLoading" message="Loading analytics…" />
        <ErrorState v-else-if="analyticsError" :message="analyticsError" @retry="$emit('fetch')" />

        <template v-else>
            <!-- Overview metrics -->
            <StatGrid :columns="4">
                <StatCard :value="analyticsMetrics.activeUsers" label="Active users" />
                <StatCard :value="analyticsMetrics.totalPageViews" label="Page views" />
                <StatCard :value="formatDuration(analyticsMetrics.avgTimeOnContent)" label="Avg time on content" />
                <StatCard :value="analyticsMetrics.quizCompletionRate" suffix="%" label="Quiz pass rate" />
            </StatGrid>

            <!-- Engagement chart -->
            <BaseCard padding="lg">
                <h3 class="card-title">User engagement over time</h3>
                <div class="chart-wrapper mt-3">
                    <EmptyState
                        v-if="analyticsChartData.labels.length === 0"
                        title="No engagement data for this period"
                        message="Active-user data will appear here once readers visit the book in this window."
                    />
                    <div v-else class="chart-bars">
                        <div
                            v-for="(value, index) in analyticsChartData.datasets[0]?.data || []"
                            :key="index"
                            class="chart-bar-col"
                        >
                            <div
                                class="chart-bar"
                                :style="{ height: Math.max(4, (value / Math.max(...analyticsChartData.datasets[0].data, 1)) * 100) + '%' }"
                            >
                                <span class="bar-value">{{ value }}</span>
                            </div>
                            <span class="bar-label">{{ analyticsChartData.labels[index] }}</span>
                        </div>
                    </div>
                </div>
            </BaseCard>

            <!-- Two-column performance tables -->
            <div class="grid-2">
                <BaseCard padding="md">
                    <h3 class="card-title sm">Content performance</h3>
                    <EmptyState v-if="contentPerformance.length === 0" title="No content views recorded" />
                    <div v-else class="mt-3">
                        <ListRow
                            v-for="(item, index) in contentPerformance"
                            :key="index"
                            :label="`${index + 1}. ${item.title}`"
                            :hint="`${item.views} views`"
                        />
                    </div>
                </BaseCard>

                <BaseCard padding="md">
                    <h3 class="card-title sm">Quiz performance</h3>
                    <EmptyState v-if="quizPerformance.length === 0" title="No quiz attempts recorded" />
                    <div v-else class="mt-3">
                        <ListRow
                            v-for="(item, index) in quizPerformance"
                            :key="index"
                            :label="`${index + 1}. ${item.title}`"
                            :hint="`${item.avgScore}% avg`"
                        />
                    </div>
                </BaseCard>
            </div>

            <BaseCard padding="md">
                <h3 class="card-title sm">Trending highlights</h3>
                <EmptyState v-if="trendingHighlights.length === 0" title="No highlights recorded" />
                <div v-else class="mt-3">
                    <ListRow
                        v-for="(item, index) in trendingHighlights"
                        :key="index"
                        :label="`“${item.selected_text?.slice(0, 100) || ''}…”`"
                    >
                        <StatusBadge variant="accent">{{ item.highlight_count }} users</StatusBadge>
                    </ListRow>
                </div>
            </BaseCard>
        </template>
    </section>
</template>

<style scoped>
@import "@/styles/dashboard-sections.css";
</style>
