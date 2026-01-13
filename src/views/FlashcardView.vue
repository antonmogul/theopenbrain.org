<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useFlashcards } from "@/composables/useFlashcards";
import { useAuth } from "@/composables/useAuth";

import FlashcardCard from "@/components/flashcard/FlashcardCard.vue";
import FlashcardRating from "@/components/flashcard/FlashcardRating.vue";
import FlashcardStats from "@/components/flashcard/FlashcardStats.vue";

const route = useRoute();
const router = useRouter();
const { isAuthenticated } = useAuth();

const {
  flashcards,
  currentCard,
  currentCardIndex,
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

// View states
const viewState = ref("loading"); // loading, empty, studying, complete
const sessionSummary = ref(null);
const showExitConfirm = ref(false);

// Get module ID from route
const moduleId = computed(() => route.params.moduleId);

// Keyboard shortcuts
function handleKeydown(e) {
  if (viewState.value !== "studying") return;

  switch (e.key) {
    case " ": // Spacebar to flip
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

// Load and start session on mount
onMounted(async () => {
  if (!isAuthenticated.value) {
    router.push("/");
    return;
  }

  if (moduleId.value) {
    try {
      await startSession(moduleId.value);
      if (hasCards.value) {
        viewState.value = "studying";
      } else {
        viewState.value = "empty";
      }
    } catch (e) {
      console.error("FlashcardView: Error starting session:", e);
      viewState.value = "error";
    }
  }

  // Add keyboard listener
  window.addEventListener("keydown", handleKeydown);
});

// Cleanup on unmount
onUnmounted(() => {
  window.removeEventListener("keydown", handleKeydown);
  resetSession();
});

// Rate card and move to next
async function rateAndMoveNext(rating) {
  try {
    await rateCard(rating);

    // Check if we've reviewed all cards
    if (isLastCard.value) {
      await handleEndSession();
    }
  } catch (e) {
    console.error("FlashcardView: Error rating card:", e);
  }
}

// Handle skip
function handleSkip() {
  skipCard();
  if (isLastCard.value) {
    handleEndSession();
  }
}

// End session
async function handleEndSession() {
  try {
    const summary = await endSession();
    sessionSummary.value = summary;
    viewState.value = "complete";
  } catch (e) {
    console.error("FlashcardView: Error ending session:", e);
  }
}

// Study again
async function handleStudyAgain() {
  sessionSummary.value = null;
  viewState.value = "loading";

  try {
    await startSession(moduleId.value);
    if (hasCards.value) {
      viewState.value = "studying";
    } else {
      viewState.value = "empty";
    }
  } catch (e) {
    console.error("FlashcardView: Error restarting session:", e);
    viewState.value = "error";
  }
}

// Exit to dashboard
function handleExit() {
  router.push("/student");
}

// Confirm exit during session
function confirmExit() {
  showExitConfirm.value = true;
}

function cancelExit() {
  showExitConfirm.value = false;
}

async function doExit() {
  await endSession();
  handleExit();
}

// Format duration for display
const formattedDuration = computed(() => {
  const secs = sessionDuration.value;
  const mins = Math.floor(secs / 60);
  const remainingSecs = secs % 60;
  return `${mins}:${remainingSecs.toString().padStart(2, "0")}`;
});
</script>

<template>
  <div class="flashcard-view">
    <!-- Loading State -->
    <div v-if="viewState === 'loading' || loading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>Loading flashcards...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="viewState === 'error' || error" class="error-container">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
      <h2>Unable to load flashcards</h2>
      <p>{{ error || "No flashcards found for this module" }}</p>
      <button @click="handleExit" class="btn-primary">Go Back</button>
    </div>

    <!-- Empty State -->
    <div v-else-if="viewState === 'empty'" class="empty-container">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="48"
        height="48"
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
      <h2>No Flashcards Available</h2>
      <p>There are no flashcards for this module yet.</p>
      <button @click="handleExit" class="btn-primary">Go Back</button>
    </div>

    <!-- Studying State -->
    <div v-else-if="viewState === 'studying'" class="study-container">
      <div class="study-header">
        <button @click="confirmExit" class="exit-btn" title="Exit Study Session">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        <div class="session-info">
          <span class="session-timer">{{ formattedDuration }}</span>
          <div class="session-stats">
            <span class="stat correct">{{ sessionStats.correct }}</span>
            <span class="stat-separator">/</span>
            <span class="stat incorrect">{{ sessionStats.incorrect }}</span>
          </div>
        </div>
      </div>

      <!-- Progress bar -->
      <div class="progress-container">
        <div class="progress-bar">
          <div
            class="progress-fill"
            :style="{ width: progress.percentage + '%' }"
          ></div>
        </div>
      </div>

      <!-- Card -->
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

      <!-- Rating (only show when flipped) -->
      <Transition name="fade">
        <div v-if="isFlipped" class="rating-area">
          <FlashcardRating
            @rate="rateAndMoveNext"
            @skip="handleSkip"
          />
        </div>
      </Transition>

      <!-- Keyboard hints -->
      <div class="keyboard-hints">
        <span v-if="!isFlipped">Press <kbd>Space</kbd> to flip</span>
        <span v-else>Press <kbd>1</kbd>-<kbd>4</kbd> to rate</span>
      </div>
    </div>

    <!-- Complete State -->
    <div v-else-if="viewState === 'complete' && sessionSummary" class="complete-container">
      <FlashcardStats
        :stats="sessionSummary"
        @study-again="handleStudyAgain"
        @continue="handleExit"
      />
    </div>

    <!-- Exit Confirmation Modal -->
    <Teleport to="body">
      <div v-if="showExitConfirm" class="modal-overlay" @click.self="cancelExit">
        <div class="confirm-modal">
          <h3>End Study Session?</h3>
          <p>Your progress will be saved.</p>
          <div class="modal-actions">
            <button @click="cancelExit" class="btn-secondary">Continue Studying</button>
            <button @click="doExit" class="btn-primary">End Session</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.flashcard-view {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%);
  padding: 1.5rem;
}

/* Loading State */
.loading-container,
.error-container,
.empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 80vh;
  gap: 1rem;
  color: #6b7280;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e5e7eb;
  border-top-color: #8b5cf6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.error-container svg,
.empty-container svg {
  color: #8b5cf6;
}

.error-container h2,
.empty-container h2 {
  margin: 0;
  color: #1f2937;
}

/* Study Container */
.study-container {
  max-width: 600px;
  margin: 0 auto;
}

.study-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}

.exit-btn {
  width: 40px;
  height: 40px;
  border: none;
  background: white;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  transition: all 0.15s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.exit-btn:hover {
  background: #fef2f2;
  color: #dc2626;
}

.session-info {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.session-timer {
  font-size: 1rem;
  font-weight: 500;
  color: #6b7280;
  font-variant-numeric: tabular-nums;
}

.session-stats {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 1rem;
  font-weight: 600;
}

.stat.correct {
  color: #16a34a;
}

.stat.incorrect {
  color: #dc2626;
}

.stat-separator {
  color: #d1d5db;
}

.progress-container {
  margin-bottom: 2rem;
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
  margin-bottom: 2rem;
}

.rating-area {
  margin-bottom: 2rem;
}

.keyboard-hints {
  text-align: center;
  font-size: 0.875rem;
  color: #9ca3af;
}

.keyboard-hints kbd {
  display: inline-block;
  padding: 0.125rem 0.375rem;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-family: monospace;
  font-size: 0.8125rem;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

/* Complete Container */
.complete-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 80vh;
  padding: 2rem;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.confirm-modal {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  max-width: 400px;
  width: 100%;
  text-align: center;
}

.confirm-modal h3 {
  margin: 0 0 0.5rem 0;
  color: #1f2937;
}

.confirm-modal p {
  color: #6b7280;
  margin: 0 0 1.5rem 0;
}

.modal-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
}

/* Buttons */
.btn-primary,
.btn-secondary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-family: "IBM Plex Sans", sans-serif;
  font-size: 0.9375rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-primary {
  background: #8b5cf6;
  color: white;
  border: none;
}

.btn-primary:hover {
  background: #7c3aed;
}

.btn-secondary {
  background: white;
  color: #374151;
  border: 1px solid #d1d5db;
}

.btn-secondary:hover {
  background: #f3f4f6;
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
