<script setup>
import { onMounted } from "vue";
import { useTrendingHighlights } from "@/composables/useTrendingHighlights";

const props = defineProps({
  limit: {
    type: Number,
    default: 10,
  },
});

const {
  trending,
  loading,
  error,
  fetchTrending,
  scrollToHighlight,
  formatRelativeTime,
  truncateText,
} = useTrendingHighlights({ limit: props.limit });

onMounted(() => {
  fetchTrending();
});
</script>

<template>
  <div class="trending-highlights" data-testid="trending-highlights">
    <h3 class="section-title">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="currentColor"
        class="fire-icon"
      >
        <path
          fill-rule="evenodd"
          d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z"
          clip-rule="evenodd"
        />
      </svg>
      Trending in Class
    </h3>

    <!-- Loading state -->
    <div v-if="loading" class="loading-state">
      <div v-for="i in 3" :key="i" class="skeleton-item">
        <div class="skeleton-text"></div>
        <div class="skeleton-meta"></div>
      </div>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="error-state">
      <p>Unable to load trending highlights</p>
    </div>

    <!-- Empty state -->
    <div v-else-if="trending.length === 0" class="empty-state">
      <p>No trending highlights yet</p>
      <p class="empty-hint">Be the first to highlight something!</p>
    </div>

    <!-- Trending items -->
    <div v-else class="trending-list">
      <div
        v-for="item in trending"
        :key="item.id"
        class="trending-item"
        data-testid="trending-item"
        @click="scrollToHighlight(item)"
      >
        <p class="item-text">"{{ truncateText(item.selected_text, 100) }}"</p>
        <div class="item-meta">
          <span class="highlight-count">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            {{ item.highlight_count }}
            {{ item.highlight_count === 1 ? "person" : "people" }}
          </span>
          <span class="time-ago">
            {{ formatRelativeTime(item.last_highlighted_at) }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.trending-highlights {
  background: white;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  padding: 1.25rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: "IBM Plex Sans", sans-serif;
  font-size: 1rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 1rem 0;
}

.fire-icon {
  color: #f97316;
}

.loading-state {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.skeleton-item {
  padding: 0.75rem;
  background: #f9fafb;
  border-radius: 8px;
}

.skeleton-text {
  height: 16px;
  background: #e5e7eb;
  border-radius: 4px;
  width: 75%;
  margin-bottom: 0.5rem;
  animation: pulse 1.5s ease-in-out infinite;
}

.skeleton-meta {
  height: 12px;
  background: #f3f4f6;
  border-radius: 4px;
  width: 40%;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.error-state,
.empty-state {
  text-align: center;
  padding: 1.5rem;
  color: #9ca3af;
}

.empty-hint {
  font-size: 0.875rem;
  margin-top: 0.25rem;
}

.trending-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.trending-item {
  padding: 0.875rem;
  background: #fefce8;
  border: 1px solid #fef08a;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
}

.trending-item:hover {
  background: #fef9c3;
  transform: translateX(2px);
}

.item-text {
  font-size: 0.875rem;
  color: #374151;
  line-height: 1.5;
  margin: 0 0 0.5rem 0;
  font-style: italic;
}

.item-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.75rem;
  color: #6b7280;
}

.highlight-count {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.highlight-count svg {
  opacity: 0.7;
}

.time-ago {
  color: #9ca3af;
}
</style>
