/**
 * Media Store
 *
 * Manages media/animation state for the dashboard.
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import mediaApi from '@/services/api/media';
import { MEDIA_TYPES } from '@/constants/dashboard';

export const useMediaStore = defineStore('dashboardMedia', () => {
  // State
  const items = ref([]);
  const loading = ref(false);
  const error = ref(null);

  // Filters
  const filter = ref(MEDIA_TYPES.ALL);
  const search = ref('');

  // Selected item
  const selectedItem = ref(null);

  // Upload modal
  const showUploadModal = ref(false);

  // Helper: get the media type from either column name (supports both legacy and new schema)
  function getMediaType(item) {
    return item.media_type || item.animation_type;
  }

  // Getters
  const filteredItems = computed(() => {
    let result = items.value;

    // Apply type filter
    if (filter.value && filter.value !== MEDIA_TYPES.ALL) {
      result = result.filter(item => getMediaType(item) === filter.value);
    }

    // Apply search filter
    if (search.value) {
      const searchTerm = search.value.toLowerCase();
      result = result.filter(item =>
        item.title?.toLowerCase().includes(searchTerm) ||
        item.animation_key?.toLowerCase().includes(searchTerm) ||
        item.description?.toLowerCase().includes(searchTerm)
      );
    }

    return result;
  });

  const itemsByType = computed(() => {
    const grouped = {
      [MEDIA_TYPES.LOTTIE]: [],
      [MEDIA_TYPES.VIDEO]: [],
      [MEDIA_TYPES.IMAGE]: [],
      [MEDIA_TYPES.YOUTUBE]: [],
    };

    items.value.forEach(item => {
      const type = getMediaType(item);
      if (grouped[type]) {
        grouped[type].push(item);
      }
    });

    return grouped;
  });

  const typeCounts = computed(() => ({
    [MEDIA_TYPES.ALL]: items.value.length,
    [MEDIA_TYPES.LOTTIE]: itemsByType.value[MEDIA_TYPES.LOTTIE].length,
    [MEDIA_TYPES.VIDEO]: itemsByType.value[MEDIA_TYPES.VIDEO].length,
    [MEDIA_TYPES.IMAGE]: itemsByType.value[MEDIA_TYPES.IMAGE].length,
    [MEDIA_TYPES.YOUTUBE]: itemsByType.value[MEDIA_TYPES.YOUTUBE].length,
  }));

  // Actions
  async function fetchMedia() {
    loading.value = true;
    error.value = null;

    try {
      // Fetch all media (filtering done client-side for better UX)
      items.value = await mediaApi.fetchMedia();
    } catch (err) {
      console.error('Error fetching media:', err);
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  }

  async function deleteItem(mediaId) {
    try {
      await mediaApi.deleteMedia(mediaId);

      // Remove from local state
      items.value = items.value.filter(item => item.id !== mediaId);

      // Clear selection if deleted item was selected
      if (selectedItem.value?.id === mediaId) {
        selectedItem.value = null;
      }
    } catch (err) {
      console.error('Error deleting media:', err);
      throw err;
    }
  }

  async function createItem(data) {
    try {
      const created = await mediaApi.createMedia(data);
      items.value.unshift(created);
      return created;
    } catch (err) {
      console.error('Error creating media:', err);
      throw err;
    }
  }

  async function updateItem(mediaId, data) {
    try {
      await mediaApi.updateMedia(mediaId, data);

      // Update local state
      const index = items.value.findIndex(item => item.id === mediaId);
      if (index !== -1) {
        items.value[index] = { ...items.value[index], ...data };
      }

      // Update selected item if it's the one being edited
      if (selectedItem.value?.id === mediaId) {
        selectedItem.value = { ...selectedItem.value, ...data };
      }
    } catch (err) {
      console.error('Error updating media:', err);
      throw err;
    }
  }

  function selectItem(item) {
    selectedItem.value = item;
  }

  function clearSelection() {
    selectedItem.value = null;
  }

  function setFilter(type) {
    filter.value = type;
  }

  function setSearch(query) {
    search.value = query;
  }

  function openUploadModal() {
    showUploadModal.value = true;
  }

  function closeUploadModal() {
    showUploadModal.value = false;
  }

  function reset() {
    items.value = [];
    loading.value = false;
    error.value = null;
    filter.value = MEDIA_TYPES.ALL;
    search.value = '';
    selectedItem.value = null;
    showUploadModal.value = false;
  }

  return {
    // State
    items,
    loading,
    error,
    filter,
    search,
    selectedItem,
    showUploadModal,

    // Getters
    filteredItems,
    itemsByType,
    typeCounts,

    // Actions
    fetchMedia,
    deleteItem,
    createItem,
    updateItem,
    selectItem,
    clearSelection,
    setFilter,
    setSearch,
    openUploadModal,
    closeUploadModal,
    reset,
  };
});

export default useMediaStore;
