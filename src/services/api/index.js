/**
 * API Services Index
 *
 * Central export for all API services.
 */

export { default as apiClient, setSession, getSession } from './client';
export { default as chaptersApi } from './chapters';
export { default as versionsApi } from './versions';
export { default as mediaApi } from './media';
export { default as usersApi } from './users';
export { default as quizzesApi } from './quizzes';
export { default as analyticsApi } from './analytics';

// Re-export individual functions for convenience
export * from './chapters';
export * from './versions';
export * from './media';
export * from './users';
export * from './quizzes';
export * from './analytics';
