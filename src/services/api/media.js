/**
 * Media API Service
 *
 * Handles all media/animation related API operations.
 */

import { get, post, patch, del } from './client';
import { MEDIA_TYPES } from '@/constants/dashboard';

/**
 * Fetch all media items with optional filtering
 * @param {Object} options - Filter options
 * @param {string} options.type - Media type filter ('all', 'lottie', 'video', 'image', 'youtube')
 * @param {string} options.search - Search query
 * @returns {Promise<Array>} Media items
 */
export async function fetchMedia({ type = MEDIA_TYPES.ALL, search = '' } = {}) {
  let query = 'animations?select=*&order=created_at.desc';

  // Apply type filter (supports both media_type and legacy animation_type columns)
  if (type && type !== MEDIA_TYPES.ALL) {
    query += `&media_type=eq.${type}`;
  }

  // Apply search filter (searches title, animation_key, description)
  if (search) {
    const searchTerm = search.toLowerCase();
    query += `&or=(title.ilike.*${searchTerm}*,animation_key.ilike.*${searchTerm}*,description.ilike.*${searchTerm}*)`;
  }

  return get(query);
}

/**
 * Fetch a single media item by ID
 * @param {string} mediaId - Media ID
 * @returns {Promise<Object>} Media data
 */
export async function fetchMediaItem(mediaId) {
  const [item] = await get(`animations?id=eq.${mediaId}&select=*`);
  return item;
}

/**
 * Fetch media item by animation key
 * @param {string} animationKey - Animation key
 * @returns {Promise<Object>} Media data
 */
export async function fetchMediaByKey(animationKey) {
  const [item] = await get(`animations?animation_key=eq.${animationKey}&select=*`);
  return item;
}

/**
 * Create a new media item
 * @param {Object} data - Media data
 * @returns {Promise<Object>} Created media
 */
export async function createMedia(data) {
  const [created] = await post('animations', {
    title: data.title,
    animation_key: data.animation_key,
    animation_type: data.animation_type,
    description: data.description || '',
    file_path: data.file_path,
    thumbnail_path: data.thumbnail_path,
    component_name: data.component_name,
    metadata: data.metadata || {},
  });
  return created;
}

/**
 * Update a media item
 * @param {string} mediaId - Media ID
 * @param {Object} data - Updated data
 * @returns {Promise<Object>} Success indicator
 */
export async function updateMedia(mediaId, data) {
  return patch(`animations?id=eq.${mediaId}`, {
    ...data,
    updated_at: new Date().toISOString(),
  });
}

/**
 * Delete a media item
 * @param {string} mediaId - Media ID
 * @returns {Promise<Object>} Success indicator
 */
export async function deleteMedia(mediaId) {
  return del(`animations?id=eq.${mediaId}`);
}

/**
 * Get media type counts for filter badges
 * @returns {Promise<Object>} Counts by type
 */
export async function getMediaTypeCounts() {
  const allMedia = await get('animations?select=animation_type');

  const counts = {
    [MEDIA_TYPES.ALL]: allMedia.length,
    [MEDIA_TYPES.LOTTIE]: 0,
    [MEDIA_TYPES.VIDEO]: 0,
    [MEDIA_TYPES.IMAGE]: 0,
    [MEDIA_TYPES.YOUTUBE]: 0,
  };

  allMedia.forEach(item => {
    if (counts[item.animation_type] !== undefined) {
      counts[item.animation_type]++;
    }
  });

  return counts;
}

/**
 * Fetch animation states for a specific animation
 * @param {string} animationId - Animation UUID
 * @returns {Promise<Array>} Animation states
 */
export async function fetchAnimationStates(animationId) {
  return get(`animation_states?animation_id=eq.${animationId}&order=order_index`);
}

/**
 * Fetch animation variants for a specific animation
 * @param {string} animationId - Animation UUID
 * @returns {Promise<Array>} Animation variants
 */
export async function fetchAnimationVariants(animationId) {
  return get(`animation_variants?animation_id=eq.${animationId}&order=order_index`);
}

/**
 * Create an animation state
 * @param {Object} data - State data
 * @returns {Promise<Object>} Created state
 */
export async function createAnimationState(data) {
  const [created] = await post('animation_states', data);
  return created;
}

/**
 * Update an animation state
 * @param {string} stateId - State UUID
 * @param {Object} data - Updated data
 * @returns {Promise<Object>} Success indicator
 */
export async function updateAnimationState(stateId, data) {
  return patch(`animation_states?id=eq.${stateId}`, data);
}

/**
 * Delete an animation state
 * @param {string} stateId - State UUID
 * @returns {Promise<Object>} Success indicator
 */
export async function deleteAnimationState(stateId) {
  return del(`animation_states?id=eq.${stateId}`);
}

/**
 * Create an animation variant
 * @param {Object} data - Variant data
 * @returns {Promise<Object>} Created variant
 */
export async function createAnimationVariant(data) {
  const [created] = await post('animation_variants', data);
  return created;
}

/**
 * Update an animation variant
 * @param {string} variantId - Variant UUID
 * @param {Object} data - Updated data
 * @returns {Promise<Object>} Success indicator
 */
export async function updateAnimationVariant(variantId, data) {
  return patch(`animation_variants?id=eq.${variantId}`, data);
}

/**
 * Delete an animation variant
 * @param {string} variantId - Variant UUID
 * @returns {Promise<Object>} Success indicator
 */
export async function deleteAnimationVariant(variantId) {
  return del(`animation_variants?id=eq.${variantId}`);
}

export default {
  fetchMedia,
  fetchMediaItem,
  fetchMediaByKey,
  createMedia,
  updateMedia,
  deleteMedia,
  getMediaTypeCounts,
  fetchAnimationStates,
  fetchAnimationVariants,
  createAnimationState,
  updateAnimationState,
  deleteAnimationState,
  createAnimationVariant,
  updateAnimationVariant,
  deleteAnimationVariant,
};
