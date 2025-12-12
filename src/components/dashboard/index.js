/**
 * Dashboard Components Index
 *
 * Central export for all dashboard components.
 */

// Shared components
export * from './shared';

// Feature sections
export { ChaptersSection } from './chapters';
export { VersionsSection } from './versions';
export { MediaSection } from './media';
export { UsersSection } from './users';
export { QuizzesSection } from './quizzes';
export { AnalyticsSection } from './analytics';

// Re-export existing components
export { default as DashboardHeader } from './DashboardHeader.vue';
export { default as DashboardSidebar } from './DashboardSidebar.vue';
