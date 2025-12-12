<script setup>
/**
 * AnalyticsSection Component
 *
 * Main analytics section for the dashboard.
 */

import { watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useAnalyticsStore } from '@/stores/dashboard/analytics';
import LoadingState from '../shared/LoadingState.vue';
import ErrorState from '../shared/ErrorState.vue';
import MetricCard from '../shared/MetricCard.vue';
import DateRangeSelector from './DateRangeSelector.vue';
import AnalyticsChart from './AnalyticsChart.vue';
import ContentPerformanceTable from './ContentPerformanceTable.vue';
import QuizPerformanceTable from './QuizPerformanceTable.vue';
import TrendingHighlights from './TrendingHighlights.vue';
import { UserRoleBreakdown } from '../users';

const props = defineProps({
  active: {
    type: Boolean,
    default: false,
  },
});

const analyticsStore = useAnalyticsStore();
const {
  loading,
  error,
  dateRange,
  metrics,
  chartData,
  contentPerformance,
  quizPerformance,
  trendingHighlights,
  userRoleBreakdown,
  dateRangeLabel,
} = storeToRefs(analyticsStore);

// Fetch analytics when section becomes active
watch(() => props.active, (isActive) => {
  if (isActive) {
    analyticsStore.fetchAllAnalytics();
  }
}, { immediate: true });

// Refetch when date range changes
watch(dateRange, () => {
  if (props.active) {
    analyticsStore.fetchAllAnalytics();
  }
});

function formatTime(seconds) {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
}
</script>

<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-2xl font-bold text-gray-900">Analytics</h2>
        <p class="text-sm text-gray-500 mt-1">
          Track engagement and performance metrics
        </p>
      </div>
      <DateRangeSelector v-model="dateRange" />
    </div>

    <!-- Loading state -->
    <LoadingState v-if="loading" message="Loading analytics..." />

    <!-- Error state -->
    <ErrorState
      v-else-if="error"
      :message="error"
      @retry="analyticsStore.fetchAllAnalytics()"
    />

    <!-- Analytics content -->
    <template v-else>
      <!-- Metrics cards -->
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <MetricCard
          label="Active Users"
          :value="metrics.activeUsers"
          icon="users"
          color="indigo"
        />
        <MetricCard
          label="Page Views"
          :value="metrics.totalPageViews"
          icon="eye"
          color="blue"
        />
        <MetricCard
          label="Avg Time on Content"
          :value="formatTime(metrics.avgTimeOnContent)"
          icon="clock"
          color="green"
        />
        <MetricCard
          label="Quiz Completion Rate"
          :value="metrics.quizCompletionRate"
          suffix="%"
          icon="check"
          color="yellow"
        />
      </div>

      <!-- Chart and sidebar -->
      <div class="grid gap-6 lg:grid-cols-3 mb-6">
        <div class="lg:col-span-2">
          <AnalyticsChart
            :data="chartData"
            title="Daily Active Users"
            :height="250"
          />
        </div>
        <div>
          <UserRoleBreakdown :counts="userRoleBreakdown" />
        </div>
      </div>

      <!-- Performance tables -->
      <div class="grid gap-6 lg:grid-cols-2 mb-6">
        <ContentPerformanceTable :data="contentPerformance" />
        <QuizPerformanceTable :data="quizPerformance" />
      </div>

      <!-- Trending highlights -->
      <TrendingHighlights :highlights="trendingHighlights" />
    </template>
  </div>
</template>
