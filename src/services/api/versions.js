/**
 * Versions API Service
 *
 * Handles all content version related API operations.
 */

import { get, post, patch, del } from './client';

/**
 * Fetch all content versions with module counts
 * @returns {Promise<Array>} Versions with module counts
 */
export async function fetchVersions() {
  const versions = await get('content_versions?select=*&order=created_at.desc');

  // Get module counts for each version
  const versionsWithCounts = await Promise.all(
    versions.map(async (version) => {
      const modules = await get(`modules?content_version_id=eq.${version.id}&select=id`);
      return {
        ...version,
        moduleCount: modules.length,
      };
    })
  );

  return versionsWithCounts;
}

/**
 * Fetch a single version by ID
 * @param {string} versionId - Version ID
 * @returns {Promise<Object>} Version data
 */
export async function fetchVersion(versionId) {
  const [version] = await get(`content_versions?id=eq.${versionId}&select=*`);
  return version;
}

/**
 * Create a new content version
 * @param {Object} data - Version data
 * @param {string} createdBy - User ID who created the version
 * @returns {Promise<Object>} Created version
 */
export async function createVersion(data, createdBy) {
  const [created] = await post('content_versions', {
    version_number: data.version_number,
    release_notes: data.release_notes || '',
    status: 'draft',
    created_by: createdBy,
  });
  return created;
}

/**
 * Update a content version
 * @param {string} versionId - Version ID
 * @param {Object} data - Updated data
 * @returns {Promise<Object>} Success indicator
 */
export async function updateVersion(versionId, data) {
  const updates = { ...data };

  // If publishing, set published_at timestamp
  if (data.status === 'published') {
    updates.published_at = new Date().toISOString();
  }

  return patch(`content_versions?id=eq.${versionId}`, updates);
}

/**
 * Update version status
 * @param {string} versionId - Version ID
 * @param {string} status - New status ('draft', 'published', 'archived')
 * @returns {Promise<Object>} Success indicator
 */
export async function updateVersionStatus(versionId, status) {
  return updateVersion(versionId, { status });
}

/**
 * Delete a content version
 * @param {string} versionId - Version ID
 * @returns {Promise<Object>} Success indicator
 */
export async function deleteVersion(versionId) {
  return del(`content_versions?id=eq.${versionId}`);
}

/**
 * Get modules for a specific version
 * @param {string} versionId - Version ID
 * @returns {Promise<Array>} Modules
 */
export async function fetchVersionModules(versionId) {
  return get(`modules?content_version_id=eq.${versionId}&select=*&order=order_index.asc`);
}

export default {
  fetchVersions,
  fetchVersion,
  createVersion,
  updateVersion,
  updateVersionStatus,
  deleteVersion,
  fetchVersionModules,
};
