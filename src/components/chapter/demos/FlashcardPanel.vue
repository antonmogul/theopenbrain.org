<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useFlashcards } from "@/composables/useFlashcards";

import FlashcardCard from "@/components/flashcard/FlashcardCard.vue";
import FlashcardRating from "@/components/flashcard/FlashcardRating.vue";
import FlashcardStats from "@/components/flashcard/FlashcardStats.vue";

const props = defineProps({
  moduleId: { type: String, required: true },
});

const emit = defineEmits(["close"]);

const {
  currentCard,
  isFlipped,
  loading,
  error,
  sessionStats,
  progress,
  isLastCard,
  hasCards,
  sessionDuration,
  startSession,
  flipCard,
  rateCard,
  skipCard,
  endSession,
  resetSession,
} = useFlashcards();

const viewState = ref("loading");
const sessionSummary = ref(null);

function handleKeydown(e) {
  if (viewState.value !== "studying") return;

  switch (e.key) {
    case " ":
      e.preventDefault();
      flipCard();
      break;
    case "1":
      if (isFlipped.value) rateAndMoveNext(1);
      break;
    case "2":
      if (isFlipped.value) rateAndMoveNext(2);
      break;
    case "3":
      if (isFlipped.value) rateAndMoveNext(3);
      break;
    case "4":
      if (isFlipped.value) rateAndMoveNext(4);
      break;
    case "s":
    case "S":
      if (isFlipped.value) handleSkip();
      break;
  }
}

onMounted(async () => {
  if (props.moduleId) {
    try {
      await startSession(props.moduleId);
      viewState.value = hasCards.value ? "studying" : "empty";
    } catch (e) {
      console.error("FlashcardPanel: Error starting session:", e);
      viewState.value = "error";
    }
  }
  window.addEventListener("keydown", handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleKeydown);
  resetSession();
});

async function rateAndMoveNext(rating) {
  try {
    await rateCard(rating);
    if (isLastCard.value) {
      await handleEndSession();
    }
  } catch (e) {
    console.error("FlashcardPanel: Error rating card:", e);
  }
}

function handleSkip() {
  skipCard();
  if (isLastCard.value) {
    handleEndSession();
  }
}

async function handleEndSession() {
  try {
    const summary = await endSession();
    sessionSummary.value = summary;
    viewState.value = "complete";
  } catch (e) {
    console.error("FlashcardPanel: Error ending session:", e);
  }
}

async function handleStudyAgain() {
  sessionSummary.value = null;
  viewState.value = "loading";
  try {
    await startSession(props.moduleId);
    viewState.value = hasCards.value ? "studying" : "empty";
  } catch (e) {
    console.error("FlashcardPanel: Error restarting session:", e);
    viewState.value = "error";
  }
}

const formattedDuration = computed(() => {
  const secs = sessionDuration.value;
  const mins = Math.floor(secs / 60);
  const remainingSecs = secs % 60;
  return `${mins}:${remainingSecs.toString().padStart(2, "0")}`;
});
</script>

<template>
  <div class="flashcard-panel">
    <!-- Loading -->
    <div v-if="viewState === 'loading' || loading" class="state-center">
      <div class="spinner"></div>
      <p>Loading flashcards...</p>
    </div>

    <!-- Error -->
    <div v-else-if="viewState === 'error' || error" class="state-center">
      <p class="error-text">{{ error || "Unable to load flashcards" }}</p>
      <button @click="emit('close')" class="btn-primary">Close</button>
    </div>

    <!-- Empty -->
    <div v-else-if="viewState === 'empty'" class="state-center">
      <p>No flashcards available for this module.</p>
      <button @click="emit('close')" class="btn-primary">Close</button>
    </div>

    <!-- Studying -->
    <div v-else-if="viewState === 'studying'" class="studying">
      <div class="study-header">
        <span class="timer">{{ formattedDuration }}</span>
        <div class="stats">
          <span class="correct">{{ sessionStats.correct }}</span>
          <span class="sep">/</span>
          <span class="incorrect">{{ sessionStats.incorrect }}</span>
        </div>
      </div>

      <div class="progress-bar-wrap">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: progress.percentage + '%' }"></div>
        </div>
      </div>

      <div class="card-area">
        <FlashcardCard
          v-if="currentCard"
          :card="currentCard"
          :is-flipped="isFlipped"
          :card-number="progress.current"
          :total-cards="progress.total"
          @flip="flipCard"
        />
      </div>

      <Transition name="fade">
        <div v-if="isFlipped" class="rating-area">
          <FlashcardRating @rate="rateAndMoveNext" @skip="handleSkip" />
        </div>
      </Transition>

      <div class="kbd-hints">
        <span v-if="!isFlipped">Press <kbd>Space</kbd> to flip</span>
        <span v-else>Press <kbd>1</kbd>-<kbd>4</kbd> to rate</span>
      </div>
    </div>

    <!-- Complete -->
    <div v-else-if="viewState === 'complete' && sessionSummary" class="complete">
      <FlashcardStats
        :stats="sessionSummary"
        @study-again="handleStudyAgain"
        @continue="emit('close')"
      />
    </div>
  </div>
</template>

<style scoped>
.flashcard-panel {
  min-height: 400px;
  font-size: 16px;
}

.state-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  gap: 16px;
  color: #6b7280;
  font-size: 16px;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e5e7eb;
  border-top-color: #8b5cf6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-text {
  color: #dc2626;
  font-weight: 500;
}

/* Studying */
.studying {
  max-width: 560px;
  margin: 0 auto;
}

.study-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.timer {
  font-size: 15px;
  font-weight: 500;
  color: #6b7280;
  font-variant-numeric: tabular-nums;
}

.stats {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 15px;
  font-weight: 600;
}

.correct { color: #16a34a; }
.incorrect { color: #dc2626; }
.sep { color: #d1d5db; }

.progress-bar-wrap {
  margin-bottom: 1.5rem;
}

.progress-bar {
  height: 4px;
  background: rgba(139, 92, 246, 0.2);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #8b5cf6;
  border-radius: 2px;
  transition: width 0.3s ease;
}

.card-area {
  margin-bottom: 1.5rem;
}

.rating-area {
  margin-bottom: 1.5rem;
}

.kbd-hints {
  text-align: center;
  font-size: 13px;
  color: #9ca3af;
}

.kbd-hints kbd {
  display: inline-block;
  padding: 2px 6px;
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
}

/* Complete */
.complete {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
}

/* Buttons */
.btn-primary {
  padding: 10px 20px;
  border-radius: 8px;
  font-family: "IBM Plex Sans", sans-serif;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  background: #8b5cf6;
  color: white;
  border: none;
  transition: all 0.15s;
}

.btn-primary:hover {
  background: #7c3aed;
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
