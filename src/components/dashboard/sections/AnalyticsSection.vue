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
  analyticsAccessDenied: { type: Boolean, default: false },
  analyticsDateRange: { type: String, default: "7days" },
  analyticsRangeOptions: { type: Array, default: () => [] },
  analyticsMetrics: { type: Object, default: () => ({}) },
  analyticsChartData: {
    type: Object,
    default: () => ({ labels: [], datasets: [] }),
  },
  contentPerformance: { type: Array, default: () => [] },
  quizPerformance: { type: Array, default: () => [] },
  trendingHighlights: { type: Array, default: () => [] },
});

defineEmits(["fetch", "range-change"]);
</script>

<template>
  <section class="section">
    <SectionHeader eyebrow="08 · Analytics" title="Recorded activity">
      <template #actions>
        <SegmentedControl
          :model-value="analyticsDateRange"
          :options="analyticsRangeOptions"
          aria-label="Analytics date range"
          @update:model-value="$emit('range-change', $event)"
        />
      </template>
    </SectionHeader>

    <BaseCard padding="md">
      <p class="analytics-note">
        Visit tracking is not currently emitted by the app. These figures
        describe stored events available to your account, not total chapter
        readership. No recorded events does not mean there were no visitors.
      </p>
      <p class="analytics-note">
        Unique signed-in users count distinct user IDs in the selected rolling
        date range. Chapter counts use page-view events only; repeated views by
        one user count once per chapter. Views without a user ID are counted as
        views only. Anonymous unique visitors cannot be determined.
      </p>
    </BaseCard>

    <ErrorState
      v-if="analyticsAccessDenied"
      title="Access denied"
      message="A signed-in creator account with analytics read access is required."
      :show-retry="false"
    />
    <LoadingState v-else-if="analyticsLoading" message="Loading analytics…" />
    <ErrorState
      v-else-if="analyticsError"
      :message="analyticsError"
      @retry="$emit('fetch')"
    />

    <template v-else>
      <!-- Overview metrics -->
      <StatGrid :columns="4">
        <StatCard
          :value="analyticsMetrics.activeUsers"
          label="Unique signed-in users"
        />
        <StatCard
          :value="analyticsMetrics.totalPageViews"
          label="Recorded page views"
        />
        <StatCard
          :value="analyticsMetrics.unidentifiedPageViews || 0"
          label="Views without a user ID"
        />
        <StatCard
          :value="analyticsMetrics.quizCompletionRate"
          suffix="%"
          label="Quiz pass rate"
        />
      </StatGrid>

      <!-- Engagement chart -->
      <BaseCard padding="lg">
        <h3 class="card-title">Daily unique signed-in users (UTC)</h3>
        <div class="chart-wrapper mt-3">
          <EmptyState
            v-if="analyticsChartData.labels.length === 0"
            title="No engagement data for this period"
            message="Only recorded events in the selected date range appear here."
          />
          <div v-else class="chart-bars">
            <div
              v-for="(value, index) in analyticsChartData.datasets[0]?.data ||
              []"
              :key="index"
              class="chart-bar-col"
            >
              <div
                class="chart-bar"
                :style="{
                  height:
                    Math.max(
                      4,
                      (value /
                        Math.max(...analyticsChartData.datasets[0].data, 1)) *
                        100
                    ) + '%',
                }"
              >
                <span class="bar-value">{{ value }}</span>
              </div>
              <span class="bar-label">{{
                analyticsChartData.labels[index]
              }}</span>
            </div>
          </div>
        </div>
      </BaseCard>

      <!-- Two-column performance tables -->
      <div class="grid-2">
        <BaseCard padding="md">
          <h3 class="card-title sm">Chapter visits</h3>
          <p class="analytics-note">
            {{ analyticsMetrics.unassignedPageViews || 0 }} recorded page views
            have no chapter assigned and are excluded from the chapter list. A
            user reading several chapters appears once in each chapter.
          </p>
          <EmptyState
            v-if="contentPerformance.length === 0"
            title="No chapter data available"
          />
          <div v-else class="mt-3">
            <ListRow
              v-for="(item, index) in contentPerformance"
              :key="item.id || index"
              :label="`${index + 1}. ${item.title}`"
              :hint="`${item.uniqueUsers || 0} unique signed-in users · ${item.views} page views · ${item.unidentifiedViews || 0} views without a user ID`"
            />
          </div>
        </BaseCard>

        <BaseCard padding="md">
          <h3 class="card-title sm">Quiz performance</h3>
          <EmptyState
            v-if="quizPerformance.length === 0"
            title="No quiz attempts recorded"
          />
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
        <EmptyState
          v-if="trendingHighlights.length === 0"
          title="No highlights recorded"
        />
        <div v-else class="mt-3">
          <ListRow
            v-for="(item, index) in trendingHighlights"
            :key="index"
            :label="`“${item.selected_text?.slice(0, 100) || ''}…”`"
          >
            <StatusBadge variant="accent"
              >{{ item.highlight_count }} users</StatusBadge
            >
          </ListRow>
        </div>
      </BaseCard>
    </template>
  </section>
</template>

<style scoped>
@import "@/styles/dashboard-sections.css";
.analytics-note {
  font-size: var(--ui-size-13);
  line-height: 1.5;
  color: rgb(var(--color-mute));
}
</style>
