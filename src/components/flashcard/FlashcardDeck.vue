<script setup>
import { ref, onMounted } from "vue";
import { useFlashcards } from "@/composables/useFlashcards";

const props = defineProps({
  moduleId: {
    type: String,
    required: true,
  },
  moduleTitle: {
    type: String,
    default: "Flashcards",
  },
});

const emit = defineEmits(["start"]);

const { getStudyStats, fetchSessionHistory } = useFlashcards();

const stats = ref(null);
const lastSession = ref(null);
const loadingStats = ref(true);

onMounted(async () => {
  try {
    stats.value = await getStudyStats(props.moduleId);
    const history = await fetchSessionHistory(1);
    if (history.length > 0) {
      lastSession.value = history[0];
    }
  } catch (e) {
    console.error("FlashcardDeck: Error loading stats:", e);
  } finally {
    loadingStats.value = false;
  }
});

function handleStart() {
  emit("start", props.moduleId);
}

function formatDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
</script>

<template>
  <div class="flashcard-deck" data-testid="flashcard-deck">
    <div class="deck-header">
      <div class="deck-icon">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <rect x="2" y="4" width="20" height="16" rx="2"></rect>
          <path d="M7 8h10"></path>
          <path d="M7 12h4"></path>
        </svg>
      </div>
      <h3 class="deck-title">{{ moduleTitle }}</h3>
    </div>

    <div v-if="loadingStats" class="loading-stats">
      <div class="skeleton-stat"></div>
      <div class="skeleton-stat"></div>
    </div>

    <div v-else-if="stats" class="deck-stats">
      <div class="stat">
        <span class="stat-value">{{ stats.totalCards }}</span>
        <span class="stat-label">Total Cards</span>
      </div>
      <div class="stat due">
        <span class="stat-value">{{ stats.dueCards }}</span>
        <span class="stat-label">Due for Review</span>
      </div>
      <div class="stat mastered">
        <span class="stat-value">{{ stats.masteredCards }}</span>
        <span class="stat-label">Mastered</span>
      </div>
    </div>

    <div v-if="lastSession" class="last-session">
      <span class="session-label">Last studied:</span>
      <span class="session-date">{{ formatDate(lastSession.completed_at) }}</span>
    </div>

    <button
      @click="handleStart"
      class="start-btn"
      :disabled="stats && stats.totalCards === 0"
      data-testid="start-flashcards"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <polygon points="5 3 19 12 5 21 5 3"></polygon>
      </svg>
      {{ stats?.dueCards > 0 ? `Study ${stats.dueCards} Due Cards` : "Start Studying" }}
    </button>
  </div>
</template>

<style scoped>
.flashcard-deck {
  background: white;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  padding: 1.5rem;
  transition: all 0.2s;
}

.flashcard-deck:hover {
  border-color: #8b5cf6;
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.1);
}

.deck-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.deck-icon {
  width: 40px;
  height: 40px;
  background: #f3e8ff;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #8b5cf6;
}

.deck-title {
  font-family: "IBM Plex Sans", sans-serif;
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.loading-stats {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.skeleton-stat {
  flex: 1;
  height: 48px;
  background: #f3f4f6;
  border-radius: 8px;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.deck-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.stat {
  background: #f9fafb;
  border-radius: 8px;
  padding: 0.75rem;
  text-align: center;
}

.stat.due {
  background: #fef3c7;
}

.stat.mastered {
  background: #dcfce7;
}

.stat-value {
  display: block;
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
}

.stat.due .stat-value {
  color: #d97706;
}

.stat.mastered .stat-value {
  color: #16a34a;
}

.stat-label {
  display: block;
  font-size: 0.6875rem;
  color: #6b7280;
  margin-top: 0.125rem;
}

.last-session {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #6b7280;
  margin-bottom: 1rem;
}

.session-date {
  color: #374151;
  font-weight: 500;
}

.start-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: #8b5cf6;
  color: white;
  border: none;
  border-radius: 8px;
  font-family: "IBM Plex Sans", sans-serif;
  font-size: 0.9375rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.start-btn:hover:not(:disabled) {
  background: #7c3aed;
}

.start-btn:disabled {
  background: #d1d5db;
  cursor: not-allowed;
}

.start-btn svg {
  margin-left: -2px;
}
</style>
