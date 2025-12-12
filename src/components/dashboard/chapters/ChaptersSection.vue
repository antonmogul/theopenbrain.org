<script setup>
/**
 * ChaptersSection Component
 *
 * Main chapters management section for the dashboard.
 */

import { onMounted, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useChaptersStore } from '@/stores/dashboard/chapters';
import LoadingState from '../shared/LoadingState.vue';
import ErrorState from '../shared/ErrorState.vue';
import EmptyState from '../shared/EmptyState.vue';
import ChapterCard from './ChapterCard.vue';
import ChapterEditor from './ChapterEditor.vue';

const props = defineProps({
  active: {
    type: Boolean,
    default: false,
  },
});

const chaptersStore = useChaptersStore();
const {
  chapters,
  loading,
  error,
  expandedChapterId,
} = storeToRefs(chaptersStore);

// Fetch chapters when section becomes active
watch(() => props.active, (isActive) => {
  if (isActive && chapters.value.length === 0) {
    chaptersStore.fetchChapters();
  }
}, { immediate: true });

function handleToggleChapter(chapterId) {
  chaptersStore.toggleChapter(chapterId);
}

function handleEditChapter(chapter) {
  // Navigate to chapter edit page or open modal
  console.log('Edit chapter:', chapter);
}

function handleDeleteChapter(chapter) {
  if (confirm(`Are you sure you want to delete "${chapter.title}"?`)) {
    // Delete chapter
    console.log('Delete chapter:', chapter);
  }
}

function handleCreateChapter() {
  // Open create chapter modal
  console.log('Create new chapter');
}
</script>

<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-2xl font-bold text-gray-900">Chapters</h2>
        <p class="text-sm text-gray-500 mt-1">
          Manage your course content and chapters
        </p>
      </div>
      <button
        @click="handleCreateChapter"
        class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        New Chapter
      </button>
    </div>

    <!-- Loading state -->
    <LoadingState v-if="loading" message="Loading chapters..." />

    <!-- Error state -->
    <ErrorState
      v-else-if="error"
      :message="error"
      @retry="chaptersStore.fetchChapters()"
    />

    <!-- Empty state -->
    <EmptyState
      v-else-if="chapters.length === 0"
      title="No chapters yet"
      message="Create your first chapter to start building your course content."
      icon="document"
      action-label="Create Chapter"
      @action="handleCreateChapter"
    />

    <!-- Chapters list -->
    <div v-else class="space-y-4">
      <ChapterCard
        v-for="chapter in chapters"
        :key="chapter.id"
        :chapter="chapter"
        :expanded="expandedChapterId === chapter.id"
        @toggle="handleToggleChapter"
        @edit="handleEditChapter"
        @delete="handleDeleteChapter"
      >
        <template #content>
          <ChapterEditor :chapter-id="chapter.id" />
        </template>
      </ChapterCard>
    </div>
  </div>
</template>
