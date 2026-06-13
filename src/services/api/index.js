/**
 * API Services Index
 *
 * Central export for the live API services. The media/users/quizzes/analytics
 * modules were removed (zero consumers); only client/chapters/versions remain.
 */

export { default as apiClient, setSession, getSession } from './client';
export { default as chaptersApi } from './chapters';
export { default as versionsApi } from './versions';

// Re-export individual functions for convenience
export * from './chapters';
export * from './versions';
