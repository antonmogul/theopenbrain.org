/**
 * Analytics Store
 *
 * Manages analytics state for the dashboard.
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import analyticsApi from '@/services/api/analytics';
import { DATE_RANGES } from '@/constants/dashboard';

export const useAnalyticsStore = defineStore('dashboardAnalytics', () => {
  // State
  const loading = ref(false);
  const error = ref(null);

  // Date range filter
  const dateRange = ref(DATE_RANGES.WEEK);

  // Metrics
  const metrics = ref({
    activeUsers: 0,
    totalPageViews: 0,
    avgTimeOnContent: 0,
    quizCompletionRate: 0,
  });

  // Chart data
  const chartData = ref({
    labels: [],
    datasets: [],
  });

  // Performance data
  const contentPerformance = ref([]);
  const quizPerformance = ref([]);

  // Trending highlights
  const trendingHighlights = ref([]);

  // User breakdown
  const userRoleBreakdown = ref({
    creators: 0,
    professors: 0,
    students: 0,
  });

  // Getters
  const totalUsers = computed(() =>
    userRoleBreakdown.value.creators +
    userRoleBreakdown.value.professors +
    userRoleBreakdown.value.students
  );

  const topPerformingContent = computed(() =>
    [...contentPerformance.value]
      .sort((a, b) => b.views - a.views)
      .slice(0, 5)
  );

  const topPerformingQuizzes = computed(() =>
    [...quizPerformance.value]
      .sort((a, b) => b.attempts - a.attempts)
      .slice(0, 5)
  );

  const dateRangeLabel = computed(() => {
    switch (dateRange.value) {
      case DATE_RANGES.WEEK:
        return 'Last 7 days';
      case DATE_RANGES.MONTH:
        return 'Last 30 days';
      case DATE_RANGES.QUARTER:
        return 'Last 90 days';
      default:
        return 'Last 7 days';
    }
  });

  // Actions
  async function fetchAllAnalytics() {
    loading.value = true;
    error.value = null;

    try {
      const data = await analyticsApi.fetchAllAnalytics(dateRange.value);

      metrics.value = data.metrics;
      chartData.value = data.chartData;
      contentPerformance.value = data.contentPerformance;
      quizPerformance.value = data.quizPerformance;
      trendingHighlights.value = data.trendingHighlights;
      userRoleBreakdown.value = data.userRoleBreakdown;
    } catch (err) {
      console.error('Error fetching analytics:', err);
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  }

  async function fetchMetrics() {
    try {
      metrics.value = await analyticsApi.fetchMetrics(dateRange.value);
    } catch (err) {
      console.error('Error fetching metrics:', err);
    }
  }

  async function fetchChartData() {
    try {
      chartData.value = await analyticsApi.fetchDailyActiveUsers(dateRange.value);
    } catch (err) {
      console.error('Error fetching chart data:', err);
    }
  }

  async function fetchContentPerformance() {
    try {
      contentPerformance.value = await analyticsApi.fetchContentPerformance(dateRange.value);
    } catch (err) {
      console.error('Error fetching content performance:', err);
    }
  }

  async function fetchQuizPerformance() {
    try {
      quizPerformance.value = await analyticsApi.fetchQuizPerformance(dateRange.value);
    } catch (err) {
      console.error('Error fetching quiz performance:', err);
    }
  }

  async function fetchTrendingHighlights() {
    try {
      trendingHighlights.value = await analyticsApi.fetchTrendingHighlights();
    } catch (err) {
      console.error('Error fetching trending highlights:', err);
    }
  }

  async function fetchUserRoleBreakdown() {
    try {
      userRoleBreakdown.value = await analyticsApi.fetchUserRoleBreakdown();
    } catch (err) {
      console.error('Error fetching user role breakdown:', err);
    }
  }

  function setDateRange(range) {
    dateRange.value = range;
  }

  function reset() {
    loading.value = false;
    error.value = null;
    dateRange.value = DATE_RANGES.WEEK;
    metrics.value = {
      activeUsers: 0,
      totalPageViews: 0,
      avgTimeOnContent: 0,
      quizCompletionRate: 0,
    };
    chartData.value = {
      labels: [],
      datasets: [],
    };
    contentPerformance.value = [];
    quizPerformance.value = [];
    trendingHighlights.value = [];
    userRoleBreakdown.value = {
      creators: 0,
      professors: 0,
      students: 0,
    };
  }

  return {
    // State
    loading,
    error,
    dateRange,
    metrics,
    chartData,
    contentPerformance,
    quizPerformance,
    trendingHighlights,
    userRoleBreakdown,

    // Getters
    totalUsers,
    topPerformingContent,
    topPerformingQuizzes,
    dateRangeLabel,

    // Actions
    fetchAllAnalytics,
    fetchMetrics,
    fetchChartData,
    fetchContentPerformance,
    fetchQuizPerformance,
    fetchTrendingHighlights,
    fetchUserRoleBreakdown,
    setDateRange,
    reset,
  };
});

export default useAnalyticsStore;
