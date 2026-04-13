<script setup>
/**
 * MediaSection Component
 *
 * Main media management section for the dashboard.
 */

import { ref, watch, computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useMediaStore } from '@/stores/dashboard/media';
import { MEDIA_TYPES, INTERACTION_TYPES, INTERACTION_TYPE_LABELS } from '@/constants/dashboard';
import LoadingState from '../shared/LoadingState.vue';
import ErrorState from '../shared/ErrorState.vue';
import EmptyState from '../shared/EmptyState.vue';
import SearchInput from '../shared/SearchInput.vue';
import FilterChips from '../shared/FilterChips.vue';
import ConfirmDialog from '../shared/ConfirmDialog.vue';
import MediaCard from './MediaCard.vue';
import MediaDetails from './MediaDetails.vue';

// Interaction type filter (client-side, secondary filter)
const interactionFilter = ref(INTERACTION_TYPES.ALL);
const interactionFilterOptions = computed(() => {
  const counts = {};
  counts[INTERACTION_TYPES.ALL] = filteredItems.value?.length || 0;
  for (const item of (items.value || [])) {
    const it = item.interaction_type;
    if (it) counts[it] = (counts[it] || 0) + 1;
  }

  return [
    { value: INTERACTION_TYPES.ALL, label: 'All Types', count: counts[INTERACTION_TYPES.ALL] },
    ...Object.entries(INTERACTION_TYPE_LABELS)
      .filter(([key]) => counts[key] > 0)
      .map(([key, label]) => ({
        value: key,
        label,
        count: counts[key] || 0,
      })),
  ];
});

// Items with both store filter + interaction type filter applied
const displayedItems = computed(() => {
  if (!filteredItems.value) return [];
  if (interactionFilter.value === INTERACTION_TYPES.ALL) return filteredItems.value;
  return filteredItems.value.filter(item => item.interaction_type === interactionFilter.value);
});

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
    <div class="flex flex-col gap-4 mb-6">
      <div class="flex flex-col sm:flex-row gap-4">
        <div class="flex-1">
          <SearchInput
            v-model="search"
            placeholder="Search animations..."
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
      <!-- Interaction type filter row -->
      <div v-if="interactionFilterOptions.length > 2" class="flex flex-wrap gap-2">
        <span class="text-xs text-gray-500 self-center mr-1">Interaction:</span>
        <button
          v-for="opt in interactionFilterOptions"
          :key="opt.value"
          @click="interactionFilter = opt.value"
          class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium transition-colors"
          :class="interactionFilter === opt.value
            ? 'bg-purple-600 text-white'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
        >
          {{ opt.label }}
          <span class="ml-1 opacity-70">({{ opt.count }})</span>
        </button>
      </div>
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
      v-else-if="displayedItems.length === 0"
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
            v-for="media in displayedItems"
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
