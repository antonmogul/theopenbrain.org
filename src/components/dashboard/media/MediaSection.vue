<script setup>
/**
 * MediaSection Component
 *
 * Main media management section for the dashboard.
 */

import { ref, watch, computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useMediaStore } from '@/stores/dashboard/media';
import { MEDIA_TYPES } from '@/constants/dashboard';
import LoadingState from '../shared/LoadingState.vue';
import ErrorState from '../shared/ErrorState.vue';
import EmptyState from '../shared/EmptyState.vue';
import SearchInput from '../shared/SearchInput.vue';
import FilterChips from '../shared/FilterChips.vue';
import ConfirmDialog from '../shared/ConfirmDialog.vue';
import MediaCard from './MediaCard.vue';
import MediaDetails from './MediaDetails.vue';

const props = defineProps({
  active: {
    type: Boolean,
    default: false,
  },
});

const mediaStore = useMediaStore();
const {
  items,
  loading,
  error,
  filter,
  search,
  selectedItem,
  filteredItems,
  typeCounts,
} = storeToRefs(mediaStore);

// Confirm dialog state
const confirmDialog = ref({
  show: false,
  media: null,
});

// Filter options
const filterOptions = computed(() => [
  { value: MEDIA_TYPES.ALL, label: 'All', count: typeCounts.value[MEDIA_TYPES.ALL] },
  { value: MEDIA_TYPES.LOTTIE, label: 'Lottie', count: typeCounts.value[MEDIA_TYPES.LOTTIE] },
  { value: MEDIA_TYPES.VIDEO, label: 'Video', count: typeCounts.value[MEDIA_TYPES.VIDEO] },
  { value: MEDIA_TYPES.IMAGE, label: 'Image', count: typeCounts.value[MEDIA_TYPES.IMAGE] },
  { value: MEDIA_TYPES.YOUTUBE, label: 'YouTube', count: typeCounts.value[MEDIA_TYPES.YOUTUBE] },
]);

// Fetch media when section becomes active
watch(() => props.active, (isActive) => {
  if (isActive && items.value.length === 0) {
    mediaStore.fetchMedia();
  }
}, { immediate: true });

function handleSearch(query) {
  mediaStore.setSearch(query);
}

function handleFilterChange(type) {
  mediaStore.setFilter(type);
}

function handleSelectMedia(media) {
  mediaStore.selectItem(media);
}

function handleDeleteMedia(media) {
  confirmDialog.value = {
    show: true,
    media,
  };
}

async function handleConfirmDelete() {
  if (confirmDialog.value.media) {
    try {
      await mediaStore.deleteItem(confirmDialog.value.media.id);
    } catch (err) {
      console.error('Error deleting media:', err);
      alert('Failed to delete media: ' + err.message);
    }
  }
  confirmDialog.value.show = false;
}

function handleUpload() {
  mediaStore.openUploadModal();
}
</script>

<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-2xl font-bold text-gray-900">Media Library</h2>
        <p class="text-sm text-gray-500 mt-1">
          Manage animations, images, and videos
        </p>
      </div>
      <button
        @click="handleUpload"
        class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
        Upload Media
      </button>
    </div>

    <!-- Filters -->
    <div class="flex flex-col sm:flex-row gap-4 mb-6">
      <div class="flex-1">
        <SearchInput
          v-model="search"
          placeholder="Search media..."
          @search="handleSearch"
        />
      </div>
      <FilterChips
        :options="filterOptions"
        :model-value="filter"
        show-counts
        @update:model-value="handleFilterChange"
      />
    </div>

    <!-- Loading state -->
    <LoadingState v-if="loading" message="Loading media..." />

    <!-- Error state -->
    <ErrorState
      v-else-if="error"
      :message="error"
      @retry="mediaStore.fetchMedia()"
    />

    <!-- Empty state -->
    <EmptyState
      v-else-if="items.length === 0"
      title="No media yet"
      message="Upload your first media asset to get started."
      icon="folder"
      action-label="Upload Media"
      @action="handleUpload"
    />

    <!-- No results -->
    <EmptyState
      v-else-if="filteredItems.length === 0"
      title="No results found"
      message="Try adjusting your search or filter criteria."
      icon="search"
    />

    <!-- Main content -->
    <div v-else class="grid gap-6 lg:grid-cols-4">
      <!-- Media grid -->
      <div class="lg:col-span-3">
        <div class="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          <MediaCard
            v-for="media in filteredItems"
            :key="media.id"
            :media="media"
            :selected="selectedItem?.id === media.id"
            @select="handleSelectMedia"
            @delete="handleDeleteMedia"
          />
        </div>
      </div>

      <!-- Details panel -->
      <div class="lg:col-span-1">
        <div class="sticky top-4">
          <MediaDetails
            :media="selectedItem"
            @close="mediaStore.clearSelection()"
            @edit="handleSelectMedia"
            @delete="handleDeleteMedia"
          />
        </div>
      </div>
    </div>

    <!-- Confirm delete dialog -->
    <ConfirmDialog
      :show="confirmDialog.show"
      title="Delete Media"
      :message="`Are you sure you want to delete '${confirmDialog.media?.title || 'this media'}'? This action cannot be undone.`"
      variant="danger"
      confirm-label="Delete"
      @confirm="handleConfirmDelete"
      @cancel="confirmDialog.show = false"
    />
  </div>
</template>
