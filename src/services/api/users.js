/**
 * Users API Service
 *
 * Handles all user management API operations.
 */

import { get, patch } from './client';
import { USER_ROLES, PAGINATION } from '@/constants/dashboard';

/**
 * Fetch users with filtering and pagination
 * @param {Object} options - Filter options
 * @param {string} options.role - Role filter ('all', 'creator', 'professor', 'student')
 * @param {string} options.search - Search query (name or email)
 * @param {number} options.page - Page number (1-indexed)
 * @param {number} options.pageSize - Items per page
 * @returns {Promise<Object>} { users, total }
 */
export async function fetchUsers({
  role = 'all',
  search = '',
  page = 1,
  pageSize = PAGINATION.DEFAULT_PAGE_SIZE,
} = {}) {
  let query = 'profiles?select=*';
  const filters = [];

  // Apply role filter
  if (role && role !== 'all') {
    filters.push(`role=eq.${role}`);
  }

  // Apply search filter
  if (search) {
    const searchTerm = search.toLowerCase();
    filters.push(`or=(full_name.ilike.*${searchTerm}*,email.ilike.*${searchTerm}*)`);
  }

  if (filters.length > 0) {
    query += '&' + filters.join('&');
  }

  // Add ordering
  query += '&order=created_at.desc';

  // Calculate pagination
  const offset = (page - 1) * pageSize;
  query += `&offset=${offset}&limit=${pageSize}`;

  // Get total count first
  const countQuery = query.replace('select=*', 'select=id');
  const allUsers = await get(countQuery.replace(/&offset=\d+&limit=\d+/, ''));
  const total = allUsers.length;

  // Get paginated results
  const users = await get(query);

  return { users, total };
}

/**
 * Fetch a single user by ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} User data
 */
export async function fetchUser(userId) {
  const [user] = await get(`profiles?id=eq.${userId}&select=*`);
  return user;
}

/**
 * Update user role
 * @param {string} userId - User ID
 * @param {string} role - New role
 * @returns {Promise<Object>} Success indicator
 */
export async function updateUserRole(userId, role) {
  return patch(`profiles?id=eq.${userId}`, { role });
}

/**
 * Update user profile
 * @param {string} userId - User ID
 * @param {Object} data - Updated data
 * @returns {Promise<Object>} Success indicator
 */
export async function updateUser(userId, data) {
  return patch(`profiles?id=eq.${userId}`, {
    ...data,
    updated_at: new Date().toISOString(),
  });
}

/**
 * Get user role breakdown counts
 * @returns {Promise<Object>} Counts by role
 */
export async function getUserRoleCounts() {
  const users = await get('profiles?select=role');

  const counts = {
    [USER_ROLES.CREATOR]: 0,
    [USER_ROLES.PROFESSOR]: 0,
    [USER_ROLES.STUDENT]: 0,
    total: users.length,
  };

  users.forEach(user => {
    if (counts[user.role] !== undefined) {
      counts[user.role]++;
    }
  });

  return counts;
}

/**
 * Get users by course enrollment
 * @param {string} courseId - Course ID
 * @returns {Promise<Array>} Users enrolled in course
 */
export async function fetchUsersByCourse(courseId) {
  // This would require a course_enrollments table join
  // For now, return empty - implement when course structure is defined
  return [];
}

export default {
  fetchUsers,
  fetchUser,
  updateUserRole,
  updateUser,
  getUserRoleCounts,
  fetchUsersByCourse,
};
