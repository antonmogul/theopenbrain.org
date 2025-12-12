/**
 * Analytics API Service
 *
 * Handles all analytics-related API operations.
 */

import { get } from './client';
import { DATE_RANGES } from '@/constants/dashboard';

/**
 * Get date range filter based on range option
 * @param {string} range - Date range ('7days', '30days', '90days')
 * @returns {string} ISO date string for filtering
 */
function getDateFilter(range) {
  const now = new Date();
  let daysBack = 7;

  switch (range) {
    case DATE_RANGES.MONTH:
      daysBack = 30;
      break;
    case DATE_RANGES.QUARTER:
      daysBack = 90;
      break;
    default:
      daysBack = 7;
  }

  const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
  return startDate.toISOString();
}

/**
 * Fetch analytics metrics
 * @param {string} dateRange - Date range option
 * @returns {Promise<Object>} Metrics object
 */
export async function fetchMetrics(dateRange = DATE_RANGES.WEEK) {
  const startDate = getDateFilter(dateRange);

  // Fetch active users (users with any activity in date range)
  const activeUsers = await get(
    `user_activity?created_at=gte.${startDate}&select=user_id`
  ).catch(() => []);

  // Fetch page views
  const pageViews = await get(
    `page_views?created_at=gte.${startDate}&select=id`
  ).catch(() => []);

  // Fetch quiz attempts for completion rate
  const quizAttempts = await get(
    `quiz_attempts?started_at=gte.${startDate}&select=id,completed_at`
  ).catch(() => []);

  const completedAttempts = quizAttempts.filter(a => a.completed_at);
  const completionRate = quizAttempts.length > 0
    ? Math.round((completedAttempts.length / quizAttempts.length) * 100)
    : 0;

  // Fetch time on content (if tracked)
  const timeData = await get(
    `content_engagement?created_at=gte.${startDate}&select=time_spent_seconds`
  ).catch(() => []);

  const avgTime = timeData.length > 0
    ? Math.round(timeData.reduce((sum, t) => sum + (t.time_spent_seconds || 0), 0) / timeData.length)
    : 0;

  return {
    activeUsers: new Set(activeUsers.map(u => u.user_id)).size,
    totalPageViews: pageViews.length,
    avgTimeOnContent: avgTime,
    quizCompletionRate: completionRate,
  };
}

/**
 * Fetch daily active users chart data
 * @param {string} dateRange - Date range option
 * @returns {Promise<Object>} Chart data { labels, datasets }
 */
export async function fetchDailyActiveUsers(dateRange = DATE_RANGES.WEEK) {
  const startDate = getDateFilter(dateRange);

  const activity = await get(
    `user_activity?created_at=gte.${startDate}&select=user_id,created_at&order=created_at.asc`
  ).catch(() => []);

  // Group by day
  const dailyCounts = {};
  activity.forEach(item => {
    const day = item.created_at.split('T')[0];
    if (!dailyCounts[day]) {
      dailyCounts[day] = new Set();
    }
    dailyCounts[day].add(item.user_id);
  });

  // Convert to chart format
  const labels = Object.keys(dailyCounts).sort();
  const data = labels.map(day => dailyCounts[day].size);

  return {
    labels,
    datasets: [{
      label: 'Daily Active Users',
      data,
      borderColor: '#4F46E5',
      backgroundColor: 'rgba(79, 70, 229, 0.1)',
      fill: true,
    }],
  };
}

/**
 * Fetch content performance (views by module)
 * @param {string} dateRange - Date range option
 * @returns {Promise<Array>} Content performance data
 */
export async function fetchContentPerformance(dateRange = DATE_RANGES.WEEK) {
  const startDate = getDateFilter(dateRange);

  // Fetch modules
  const modules = await get('modules?select=id,title&order=order_index.asc');

  // Fetch page views grouped by module
  const pageViews = await get(
    `page_views?created_at=gte.${startDate}&select=module_id`
  ).catch(() => []);

  // Count views per module
  const viewCounts = {};
  pageViews.forEach(pv => {
    if (pv.module_id) {
      viewCounts[pv.module_id] = (viewCounts[pv.module_id] || 0) + 1;
    }
  });

  return modules.map(mod => ({
    id: mod.id,
    title: mod.title,
    views: viewCounts[mod.id] || 0,
  }));
}

/**
 * Fetch quiz performance data
 * @param {string} dateRange - Date range option
 * @returns {Promise<Array>} Quiz performance data
 */
export async function fetchQuizPerformance(dateRange = DATE_RANGES.WEEK) {
  const startDate = getDateFilter(dateRange);

  // Fetch quizzes
  const quizzes = await get('quizzes?select=id,title');

  // Fetch attempts in date range
  const attempts = await get(
    `quiz_attempts?started_at=gte.${startDate}&select=quiz_id,score,passed`
  ).catch(() => []);

  return quizzes.map(quiz => {
    const quizAttempts = attempts.filter(a => a.quiz_id === quiz.id);
    const avgScore = quizAttempts.length > 0
      ? Math.round(quizAttempts.reduce((sum, a) => sum + (a.score || 0), 0) / quizAttempts.length)
      : 0;
    const passRate = quizAttempts.length > 0
      ? Math.round((quizAttempts.filter(a => a.passed).length / quizAttempts.length) * 100)
      : 0;

    return {
      id: quiz.id,
      title: quiz.title,
      attempts: quizAttempts.length,
      avgScore,
      passRate,
    };
  });
}

/**
 * Fetch trending highlights (most highlighted text)
 * @param {number} limit - Max results to return
 * @returns {Promise<Array>} Trending highlights
 */
export async function fetchTrendingHighlights(limit = 10) {
  const highlights = await get(
    `user_highlights?select=text,paragraph_id,count&order=count.desc&limit=${limit}`
  ).catch(() => []);

  return highlights;
}

/**
 * Fetch user role breakdown
 * @returns {Promise<Object>} Role counts
 */
export async function fetchUserRoleBreakdown() {
  const users = await get('profiles?select=role');

  const breakdown = {
    creators: 0,
    professors: 0,
    students: 0,
  };

  users.forEach(user => {
    if (user.role === 'creator') breakdown.creators++;
    else if (user.role === 'professor') breakdown.professors++;
    else if (user.role === 'student') breakdown.students++;
  });

  return breakdown;
}

/**
 * Fetch all analytics data at once
 * @param {string} dateRange - Date range option
 * @returns {Promise<Object>} All analytics data
 */
export async function fetchAllAnalytics(dateRange = DATE_RANGES.WEEK) {
  const [
    metrics,
    chartData,
    contentPerformance,
    quizPerformance,
    trendingHighlights,
    userRoleBreakdown,
  ] = await Promise.all([
    fetchMetrics(dateRange),
    fetchDailyActiveUsers(dateRange),
    fetchContentPerformance(dateRange),
    fetchQuizPerformance(dateRange),
    fetchTrendingHighlights(),
    fetchUserRoleBreakdown(),
  ]);

  return {
    metrics,
    chartData,
    contentPerformance,
    quizPerformance,
    trendingHighlights,
    userRoleBreakdown,
  };
}

export default {
  fetchMetrics,
  fetchDailyActiveUsers,
  fetchContentPerformance,
  fetchQuizPerformance,
  fetchTrendingHighlights,
  fetchUserRoleBreakdown,
  fetchAllAnalytics,
};
