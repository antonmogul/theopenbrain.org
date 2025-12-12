/**
 * Supabase REST API Client
 *
 * Centralized API client for all dashboard operations.
 * Handles authentication, error handling, and request/response transformation.
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

// Session holder - will be set by useAuth composable
let currentSession = null;

/**
 * Set the current session for authenticated requests
 * @param {Object} session - Supabase session object
 */
export function setSession(session) {
  currentSession = session;
}

/**
 * Get the current session
 * @returns {Object|null} Current session
 */
export function getSession() {
  return currentSession;
}

/**
 * Make a REST API request to Supabase
 * @param {string} endpoint - API endpoint (without base URL)
 * @param {Object} options - Fetch options
 * @returns {Promise<any>} Response data
 */
export async function apiRequest(endpoint, options = {}) {
  const { headers: optionHeaders, ...restOptions } = options;

  const response = await fetch(`${supabaseUrl}/rest/v1/${endpoint}`, {
    ...restOptions,
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${currentSession?.access_token || supabaseKey}`,
      'Content-Type': 'application/json',
      ...optionHeaders,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    const error = new Error(`API Error ${response.status}: ${errorText}`);
    error.status = response.status;
    error.response = errorText;
    throw error;
  }

  // For PATCH/DELETE, return success indicator
  if (options.method === 'PATCH' || options.method === 'DELETE') {
    return { success: true };
  }

  // For HEAD requests or 204 responses, return empty
  if (options.method === 'HEAD' || response.status === 204) {
    return { success: true };
  }

  return response.json();
}

/**
 * GET request helper
 * @param {string} endpoint - API endpoint
 * @param {Object} options - Additional fetch options
 * @returns {Promise<any>} Response data
 */
export async function get(endpoint, options = {}) {
  return apiRequest(endpoint, { method: 'GET', ...options });
}

/**
 * POST request helper
 * @param {string} endpoint - API endpoint
 * @param {Object} data - Request body
 * @param {Object} options - Additional fetch options
 * @returns {Promise<any>} Response data
 */
export async function post(endpoint, data, options = {}) {
  return apiRequest(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
    headers: { Prefer: 'return=representation' },
    ...options,
  });
}

/**
 * PATCH request helper
 * @param {string} endpoint - API endpoint
 * @param {Object} data - Request body
 * @param {Object} options - Additional fetch options
 * @returns {Promise<any>} Response data
 */
export async function patch(endpoint, data, options = {}) {
  return apiRequest(endpoint, {
    method: 'PATCH',
    body: JSON.stringify(data),
    headers: { Prefer: 'return=minimal' },
    ...options,
  });
}

/**
 * DELETE request helper
 * @param {string} endpoint - API endpoint
 * @param {Object} options - Additional fetch options
 * @returns {Promise<any>} Response data
 */
export async function del(endpoint, options = {}) {
  return apiRequest(endpoint, { method: 'DELETE', ...options });
}

/**
 * Build query string for filtering/sorting
 * @param {Object} params - Query parameters
 * @returns {string} Query string
 */
export function buildQuery(params) {
  const parts = [];

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      parts.push(`${key}=${encodeURIComponent(value)}`);
    }
  }

  return parts.length > 0 ? `?${parts.join('&')}` : '';
}

/**
 * Build PostgREST filter string for "in" queries
 * @param {string[]} ids - Array of IDs
 * @returns {string} Filter string like (id1,id2,id3)
 */
export function buildInFilter(ids) {
  return `(${ids.map(id => `"${id}"`).join(',')})`;
}

export default {
  setSession,
  getSession,
  apiRequest,
  get,
  post,
  patch,
  del,
  buildQuery,
  buildInFilter,
};
