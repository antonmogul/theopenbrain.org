<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useAuth } from "@/composables/useAuth";
import { useStudentCourses } from "@/composables/useStudentCourses";
import { useHighlights } from "@/composables/useHighlights";
import { useNotes } from "@/composables/useNotes";
import { useQuizzes } from "@/composables/useQuizzes";
import { useFlashcards } from "@/composables/useFlashcards";
import { useStudentStore } from "@/stores/student";

// Components
import StudentSidebar from "@/components/student/StudentSidebar.vue";
import CourseCard from "@/components/student/CourseCard.vue";
import StudyStats from "@/components/student/StudyStats.vue";
import ProgressCard from "@/components/student/ProgressCard.vue";
import TrendingHighlights from "@/components/chapter/TrendingHighlights.vue";
import QuizCard from "@/components/quiz/QuizCard.vue";
import FlashcardDeck from "@/components/flashcard/FlashcardDeck.vue";

const router = useRouter();
const { user, profile, loading: authLoading, signOut } = useAuth();
const studentStore = useStudentStore();

// Composables
const {
  courses,
  loading: coursesLoading,
  error: coursesError,
  fetchEnrolledCourses,
  continueReading,
} = useStudentCourses();

const { highlights, fetchRecentHighlights } = useHighlights();
const { notes, fetchRecentNotes } = useNotes();
const {
  availableQuizzes,
  recentAttempts,
  loading: quizzesLoading,
  fetchAvailableQuizzes,
  fetchRecentAttempts,
} = useQuizzes();
const {
  flashcardDecks,
  dueCardsCount,
  loading: flashcardsLoading,
  fetchAvailableDecks,
  fetchDueCardsCount,
} = useFlashcards();

// UI State
const activeSection = ref("dashboard");
const recentHighlights = ref([]);
const recentNotes = ref([]);
const moduleQuizzes = ref([]);
const moduleFlashcards = ref([]);

// Navigation items for Student Dashboard
const navItems = [
  { id: "dashboard", label: "Dashboard", icon: "grid" },
  { id: "courses", label: "My Courses", icon: "book" },
  { id: "quizzes", label: "Quizzes", icon: "quiz" },
  { id: "flashcards", label: "Flashcards", icon: "flashcard" },
  { id: "highlights", label: "My Highlights", icon: "highlight" },
  { id: "notes", label: "My Notes", icon: "notes" },
  { id: "progress", label: "Progress", icon: "progress" },
  { id: "settings", label: "Settings", icon: "settings" },
];

// Format current date
const currentDate = computed(() => {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
});

// User display name
const displayName = computed(() => {
  return profile.value?.full_name || user.value?.email?.split("@")[0] || "Student";
});

// Load data on mount
onMounted(async () => {
  await fetchEnrolledCourses();
  recentHighlights.value = await fetchRecentHighlights(5);
  recentNotes.value = await fetchRecentNotes(5);
  await studentStore.fetchStudyStats();

  // Load quizzes and flashcards for enrolled courses
  await loadQuizzesAndFlashcards();
});

// Load quizzes and flashcards for all enrolled courses
async function loadQuizzesAndFlashcards() {
  if (courses.value.length === 0) return;

  // Collect module IDs from enrolled courses
  const moduleIds = courses.value
    .flatMap((enrollment) => enrollment.course?.modules || [])
    .map((module) => module.id);

  if (moduleIds.length > 0) {
    await Promise.all([
      fetchAvailableQuizzes(moduleIds),
      fetchAvailableDecks(moduleIds),
      fetchRecentAttempts(5),
      fetchDueCardsCount(moduleIds),
    ]);
  }
}

// Navigation handlers
function handleFooterClick() {
  if (continueReading.value?.module) {
    router.push({
      name: "chapter",
      params: {
        number: continueReading.value.module.order_index || 1,
        slug: continueReading.value.module.slug,
      },
    });
  } else {
    // Navigate to first available course
    router.push({ name: "home" });
  }
}

async function handleSignOut() {
  await signOut();
  router.push({ name: "home" });
}

// Format date for recent items
function formatRelativeDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

// Get highlight color class
function getHighlightColorClass(color) {
  const colors = {
    yellow: "bg-yellow-100 border-yellow-300",
    green: "bg-green-100 border-green-300",
    blue: "bg-blue-100 border-blue-300",
    pink: "bg-pink-100 border-pink-300",
    purple: "bg-purple-100 border-purple-300",
  };
  return colors[color] || colors.yellow;
}

// Quiz and Flashcard navigation
function startQuiz(quizId) {
  router.push({ name: "quiz", params: { quizId } });
}

function startFlashcards(moduleId) {
  router.push({ name: "flashcards", params: { moduleId } });
}

// Format score as percentage
function formatScore(score, total) {
  if (!total) return "0%";
  return `${Math.round((score / total) * 100)}%`;
}
</script>

<template>
  <div class="student-dashboard">
    <!-- Sidebar -->
    <StudentSidebar
      :nav-items="navItems"
      :active-section="activeSection"
      :display-name="displayName"
      :current-date="currentDate"
      @update:active-section="activeSection = $event"
      @footer-click="handleFooterClick"
    />

    <!-- Main Content -->
    <main class="dashboard-main">
      <!-- Header -->
      <header class="dashboard-header">
        <div class="header-content">
          <h1 class="page-title">
            {{ activeSection === "dashboard" ? "Dashboard" : "" }}
            {{ activeSection === "courses" ? "My Courses" : "" }}
            {{ activeSection === "quizzes" ? "Quizzes" : "" }}
            {{ activeSection === "flashcards" ? "Flashcards" : "" }}
            {{ activeSection === "highlights" ? "My Highlights" : "" }}
            {{ activeSection === "notes" ? "My Notes" : "" }}
            {{ activeSection === "progress" ? "Reading Progress" : "" }}
            {{ activeSection === "settings" ? "Settings" : "" }}
          </h1>
        </div>
        <div class="header-actions">
          <button @click="handleSignOut" class="signout-btn">Sign Out</button>
        </div>
      </header>

      <!-- Dashboard Section -->
      <section v-if="activeSection === 'dashboard'" class="content-section">
        <!-- Continue Reading Card -->
        <ProgressCard :continue-reading="continueReading" />

        <!-- Study Stats -->
        <StudyStats :stats="studentStore.studyStats" />

        <!-- Quick Actions: Quiz & Flashcards -->
        <div class="quick-actions-grid">
          <!-- Available Quizzes -->
          <div class="quick-action-card">
            <div class="section-header">
              <h2 class="section-title">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="section-icon">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                Quizzes
              </h2>
              <button @click="activeSection = 'quizzes'" class="view-all-btn">
                View all
              </button>
            </div>

            <div v-if="quizzesLoading" class="loading-state small">
              <p>Loading quizzes...</p>
            </div>

            <div v-else-if="availableQuizzes.length === 0" class="empty-state small">
              <p>No quizzes available</p>
            </div>

            <div v-else class="quiz-list">
              <div
                v-for="quiz in availableQuizzes.slice(0, 3)"
                :key="quiz.id"
                class="quiz-item"
                @click="startQuiz(quiz.id)"
              >
                <div class="quiz-info">
                  <span class="quiz-title">{{ quiz.title }}</span>
                  <span class="quiz-meta">{{ quiz.question_count }} questions</span>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="quiz-arrow">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </div>
            </div>
          </div>

          <!-- Flashcard Decks -->
          <div class="quick-action-card flashcard-card">
            <div class="section-header">
              <h2 class="section-title">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="section-icon">
                  <rect x="2" y="4" width="20" height="16" rx="2"></rect>
                  <path d="M7 8h10"></path>
                  <path d="M7 12h4"></path>
                </svg>
                Flashcards
              </h2>
              <button @click="activeSection = 'flashcards'" class="view-all-btn">
                View all
              </button>
            </div>

            <div v-if="dueCardsCount > 0" class="due-cards-banner">
              <span class="due-count">{{ dueCardsCount }}</span> cards due for review
            </div>

            <div v-if="flashcardsLoading" class="loading-state small">
              <p>Loading flashcards...</p>
            </div>

            <div v-else-if="flashcardDecks.length === 0" class="empty-state small">
              <p>No flashcard decks available</p>
            </div>

            <div v-else class="deck-list">
              <div
                v-for="deck in flashcardDecks.slice(0, 3)"
                :key="deck.module_id"
                class="deck-item"
                @click="startFlashcards(deck.module_id)"
              >
                <div class="deck-info">
                  <span class="deck-title">{{ deck.module_title }}</span>
                  <span class="deck-meta">{{ deck.card_count }} cards</span>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="deck-arrow">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </div>
            </div>
          </div>
        </div>

        <!-- Recent Quiz Attempts -->
        <div v-if="recentAttempts.length > 0" class="recent-attempts">
          <div class="section-header">
            <h2 class="section-title">Recent Quiz Scores</h2>
          </div>
          <div class="attempts-list">
            <div
              v-for="attempt in recentAttempts"
              :key="attempt.id"
              class="attempt-item"
            >
              <div class="attempt-info">
                <span class="attempt-title">{{ attempt.quiz?.title }}</span>
                <span class="attempt-date">{{ formatRelativeDate(attempt.completed_at) }}</span>
              </div>
              <div class="attempt-score" :class="{ passed: attempt.passed }">
                {{ formatScore(attempt.score, attempt.total_questions) }}
              </div>
            </div>
          </div>
        </div>

        <!-- Two Column Layout -->
        <div class="two-column-grid">
          <!-- Left Column: Courses -->
          <div class="column">
            <div class="section-header">
              <h2 class="section-title">My Courses</h2>
              <button
                @click="activeSection = 'courses'"
                class="view-all-btn"
              >
                View all
              </button>
            </div>

            <div v-if="coursesLoading" class="loading-state">
              <p>Loading courses...</p>
            </div>

            <div v-else-if="courses.length === 0" class="empty-state">
              <p>No courses enrolled yet</p>
              <p class="empty-hint">
                Ask your professor for a course enrollment link
              </p>
            </div>

            <div v-else class="courses-grid">
              <CourseCard
                v-for="enrollment in courses.slice(0, 2)"
                :key="enrollment.id"
                :enrollment="enrollment"
              />
            </div>
          </div>

          <!-- Right Column: Recent Activity -->
          <div class="column">
            <!-- Recent Highlights -->
            <div class="activity-section">
              <div class="section-header">
                <h2 class="section-title">Recent Highlights</h2>
                <button
                  @click="activeSection = 'highlights'"
                  class="view-all-btn"
                >
                  View all
                </button>
              </div>

              <div
                v-if="recentHighlights.length === 0"
                class="empty-state small"
              >
                <p>No highlights yet</p>
              </div>

              <div v-else class="highlights-list">
                <div
                  v-for="highlight in recentHighlights"
                  :key="highlight.id"
                  class="highlight-item"
                  :class="getHighlightColorClass(highlight.color)"
                >
                  <p class="highlight-text">
                    "{{ highlight.selected_text?.slice(0, 80) }}{{ highlight.selected_text?.length > 80 ? '...' : '' }}"
                  </p>
                  <span class="highlight-date">
                    {{ formatRelativeDate(highlight.created_at) }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Trending Highlights -->
            <TrendingHighlights class="mt-6" :limit="5" />
          </div>
        </div>
      </section>

      <!-- Courses Section -->
      <section v-else-if="activeSection === 'courses'" class="content-section">
        <div v-if="coursesLoading" class="loading-state">
          <p>Loading courses...</p>
        </div>

        <div v-else-if="courses.length === 0" class="empty-state-large">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
            <path
              d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"
            ></path>
          </svg>
          <h3>No Courses Yet</h3>
          <p>Ask your professor for an enrollment link to get started</p>
        </div>

        <div v-else class="courses-grid full">
          <CourseCard
            v-for="enrollment in courses"
            :key="enrollment.id"
            :enrollment="enrollment"
          />
        </div>
      </section>

      <!-- Quizzes Section -->
      <section v-else-if="activeSection === 'quizzes'" class="content-section">
        <div v-if="quizzesLoading" class="loading-state">
          <p>Loading quizzes...</p>
        </div>

        <div v-else-if="availableQuizzes.length === 0" class="empty-state-large">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          <h3>No Quizzes Available</h3>
          <p>Quizzes will appear here when your courses have them</p>
        </div>

        <div v-else class="quizzes-grid">
          <QuizCard
            v-for="quiz in availableQuizzes"
            :key="quiz.id"
            :quiz="quiz"
            @start="startQuiz(quiz.id)"
          />
        </div>

        <!-- Quiz History -->
        <div v-if="recentAttempts.length > 0" class="quiz-history">
          <h3 class="history-title">Recent Attempts</h3>
          <div class="attempts-grid">
            <div
              v-for="attempt in recentAttempts"
              :key="attempt.id"
              class="attempt-card"
            >
              <div class="attempt-header">
                <span class="attempt-quiz-title">{{ attempt.quiz?.title }}</span>
                <span class="attempt-score-badge" :class="{ passed: attempt.passed }">
                  {{ formatScore(attempt.score, attempt.total_questions) }}
                </span>
              </div>
              <div class="attempt-details">
                <span>{{ attempt.score }}/{{ attempt.total_questions }} correct</span>
                <span>{{ formatRelativeDate(attempt.completed_at) }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Flashcards Section -->
      <section v-else-if="activeSection === 'flashcards'" class="content-section">
        <div v-if="dueCardsCount > 0" class="due-cards-alert">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          <span>You have <strong>{{ dueCardsCount }}</strong> cards due for review!</span>
        </div>

        <div v-if="flashcardsLoading" class="loading-state">
          <p>Loading flashcards...</p>
        </div>

        <div v-else-if="flashcardDecks.length === 0" class="empty-state-large">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <rect x="2" y="4" width="20" height="16" rx="2"></rect>
            <path d="M7 8h10"></path>
            <path d="M7 12h4"></path>
          </svg>
          <h3>No Flashcard Decks Available</h3>
          <p>Flashcard decks will appear here when your courses have them</p>
        </div>

        <div v-else class="flashcards-grid">
          <FlashcardDeck
            v-for="deck in flashcardDecks"
            :key="deck.module_id"
            :deck="deck"
            @study="startFlashcards(deck.module_id)"
          />
        </div>
      </section>

      <!-- Highlights Section -->
      <section
        v-else-if="activeSection === 'highlights'"
        class="content-section"
      >
        <div v-if="recentHighlights.length === 0" class="empty-state-large">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="m9 11-6 6v3h9l3-3"></path>
            <path
              d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"
            ></path>
          </svg>
          <h3>No Highlights Yet</h3>
          <p>Select text while reading to create highlights</p>
        </div>

        <div v-else class="highlights-grid">
          <div
            v-for="highlight in recentHighlights"
            :key="highlight.id"
            class="highlight-card"
            :class="getHighlightColorClass(highlight.color)"
          >
            <p class="highlight-text">"{{ highlight.selected_text }}"</p>
            <div class="highlight-meta">
              <span class="highlight-date">
                {{ formatRelativeDate(highlight.created_at) }}
              </span>
              <span v-if="highlight.note" class="has-note">Has note</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Notes Section -->
      <section v-else-if="activeSection === 'notes'" class="content-section">
        <div v-if="recentNotes.length === 0" class="empty-state-large">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path
              d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5"
            ></path>
            <path
              d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
            ></path>
          </svg>
          <h3>No Notes Yet</h3>
          <p>Add notes to your highlights or create standalone notes while reading</p>
        </div>

        <div v-else class="notes-grid">
          <div v-for="note in recentNotes" :key="note.id" class="note-card">
            <div v-if="note.highlight" class="note-highlight-preview">
              "{{ note.highlight.selected_text?.slice(0, 60) }}..."
            </div>
            <p class="note-content">{{ note.content }}</p>
            <span class="note-date">
              {{ formatRelativeDate(note.created_at) }}
            </span>
          </div>
        </div>
      </section>

      <!-- Progress Section -->
      <section v-else-if="activeSection === 'progress'" class="content-section">
        <StudyStats :stats="studentStore.studyStats" />

        <div class="progress-summary">
          <h3>Reading Progress by Module</h3>
          <p class="coming-soon">
            Detailed progress tracking coming soon...
          </p>
        </div>
      </section>

      <!-- Settings Section -->
      <section v-else-if="activeSection === 'settings'" class="content-section">
        <div class="settings-card">
          <h3>Profile</h3>
          <div class="settings-row">
            <span class="settings-label">Email</span>
            <span class="settings-value">{{ user?.email }}</span>
          </div>
          <div class="settings-row">
            <span class="settings-label">Name</span>
            <span class="settings-value">
              {{ profile?.full_name || "Not set" }}
            </span>
          </div>
          <div class="settings-row">
            <span class="settings-label">Role</span>
            <span class="settings-value capitalize">
              {{ profile?.role || "Student" }}
            </span>
          </div>
        </div>

        <div class="settings-card mt-6">
          <h3>Account</h3>
          <button @click="handleSignOut" class="signout-btn-large">
            Sign Out
          </button>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.student-dashboard {
  display: flex;
  min-height: 100vh;
  background: #f9fafb;
}

.dashboard-main {
  flex: 1;
  padding: 2rem 3rem;
  max-width: 1200px;
}

.dashboard-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2rem;
}

.page-title {
  font-family: "IBM Plex Sans", sans-serif;
  font-size: 2rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.signout-btn {
  padding: 0.5rem 1rem;
  background: white;
  color: #6b7280;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.15s;
}

.signout-btn:hover {
  background: #f3f4f6;
  color: #374151;
}

.content-section {
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.two-column-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}

@media (max-width: 1400px) {
  .two-column-grid {
    grid-template-columns: 1fr;
  }
}

.column {
  min-width: 0;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.section-title {
  font-family: "IBM Plex Sans", sans-serif;
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.view-all-btn {
  background: none;
  border: none;
  color: #3b82f6;
  font-size: 0.875rem;
  cursor: pointer;
  transition: color 0.15s;
}

.view-all-btn:hover {
  color: #1d4ed8;
}

.courses-grid {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.courses-grid.full {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 1.5rem;
}

.loading-state,
.empty-state {
  padding: 2rem;
  text-align: center;
  color: #9ca3af;
  background: white;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
}

.empty-state.small {
  padding: 1rem;
}

.empty-hint {
  font-size: 0.875rem;
  margin-top: 0.25rem;
}

.empty-state-large {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem;
  text-align: center;
  color: #9ca3af;
  background: white;
  border-radius: 12px;
  border: 1px dashed #d1d5db;
}

.empty-state-large svg {
  color: #d1d5db;
  margin-bottom: 1rem;
}

.empty-state-large h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #6b7280;
  margin: 0 0 0.5rem 0;
}

.empty-state-large p {
  margin: 0;
}

.activity-section {
  margin-bottom: 1.5rem;
}

.highlights-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.highlight-item {
  padding: 0.875rem;
  border-radius: 8px;
  border-left: 3px solid;
}

.highlight-item.bg-yellow-100 {
  background: #fefce8;
  border-color: #fcd34d;
}
.highlight-item.bg-green-100 {
  background: #f0fdf4;
  border-color: #86efac;
}
.highlight-item.bg-blue-100 {
  background: #eff6ff;
  border-color: #93c5fd;
}
.highlight-item.bg-pink-100 {
  background: #fdf2f8;
  border-color: #f9a8d4;
}
.highlight-item.bg-purple-100 {
  background: #faf5ff;
  border-color: #c4b5fd;
}

.highlight-text {
  font-size: 0.875rem;
  color: #374151;
  font-style: italic;
  line-height: 1.5;
  margin: 0 0 0.5rem 0;
}

.highlight-date {
  font-size: 0.75rem;
  color: #9ca3af;
}

.highlights-grid,
.notes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}

.highlight-card,
.note-card {
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  background: white;
}

.highlight-card {
  border-left: 4px solid;
}

.highlight-meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.has-note {
  font-size: 0.75rem;
  color: #3b82f6;
  background: #eff6ff;
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
}

.note-card {
  background: #f9fafb;
}

.note-highlight-preview {
  font-size: 0.75rem;
  font-style: italic;
  color: #6b7280;
  padding: 0.5rem;
  background: #fefce8;
  border-radius: 4px;
  margin-bottom: 0.75rem;
}

.note-content {
  font-size: 0.9375rem;
  color: #374151;
  line-height: 1.5;
  margin: 0 0 0.5rem 0;
}

.note-date {
  font-size: 0.75rem;
  color: #9ca3af;
}

.mt-6 {
  margin-top: 1.5rem;
}

.progress-summary {
  background: white;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  padding: 1.5rem;
  margin-top: 1.5rem;
}

.progress-summary h3 {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 1rem 0;
}

.coming-soon {
  color: #9ca3af;
  font-style: italic;
}

.settings-card {
  background: white;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  padding: 1.5rem;
}

.settings-card h3 {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 1rem 0;
}

.settings-row {
  display: flex;
  justify-content: space-between;
  padding: 0.75rem 0;
  border-bottom: 1px solid #f3f4f6;
}

.settings-row:last-of-type {
  border-bottom: none;
}

.settings-label {
  color: #6b7280;
}

.settings-value {
  color: #1f2937;
  font-weight: 500;
}

.capitalize {
  text-transform: capitalize;
}

.signout-btn-large {
  padding: 0.75rem 1.5rem;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.9375rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.signout-btn-large:hover {
  background: #dc2626;
}

/* Quick Actions Grid (Quiz & Flashcards on Dashboard) */
.quick-actions-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

@media (max-width: 900px) {
  .quick-actions-grid {
    grid-template-columns: 1fr;
  }
}

.quick-action-card {
  background: white;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  padding: 1.25rem;
}

.quick-action-card.flashcard-card {
  border-color: #c4b5fd;
  background: linear-gradient(135deg, #faf5ff 0%, white 100%);
}

.section-icon {
  margin-right: 0.5rem;
  color: #3b82f6;
}

.flashcard-card .section-icon {
  color: #8b5cf6;
}

/* Quiz List */
.quiz-list,
.deck-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.quiz-item,
.deck-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem;
  background: #f9fafb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
}

.quiz-item:hover,
.deck-item:hover {
  background: #eff6ff;
}

.deck-item:hover {
  background: #f5f3ff;
}

.quiz-info,
.deck-info {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.quiz-title,
.deck-title {
  font-size: 0.9375rem;
  font-weight: 500;
  color: #1f2937;
}

.quiz-meta,
.deck-meta {
  font-size: 0.75rem;
  color: #6b7280;
}

.quiz-arrow,
.deck-arrow {
  color: #9ca3af;
  transition: transform 0.15s;
}

.quiz-item:hover .quiz-arrow,
.deck-item:hover .deck-arrow {
  transform: translateX(2px);
  color: #3b82f6;
}

.deck-item:hover .deck-arrow {
  color: #8b5cf6;
}

/* Due Cards Banner */
.due-cards-banner {
  background: #fef3c7;
  color: #92400e;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  font-size: 0.8125rem;
  margin-bottom: 0.75rem;
}

.due-count {
  font-weight: 700;
  color: #d97706;
}

/* Recent Attempts on Dashboard */
.recent-attempts {
  background: white;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
}

.attempts-list {
  display: flex;
  gap: 0.75rem;
  overflow-x: auto;
  padding-bottom: 0.25rem;
}

.attempt-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-width: 200px;
  padding: 0.75rem;
  background: #f9fafb;
  border-radius: 8px;
  flex-shrink: 0;
}

.attempt-info {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.attempt-title {
  font-size: 0.875rem;
  font-weight: 500;
  color: #1f2937;
}

.attempt-date {
  font-size: 0.75rem;
  color: #9ca3af;
}

.attempt-score {
  font-size: 1rem;
  font-weight: 700;
  color: #dc2626;
}

.attempt-score.passed {
  color: #16a34a;
}

/* Quizzes Grid (Full Page) */
.quizzes-grid,
.flashcards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
}

/* Quiz History */
.quiz-history {
  margin-top: 2rem;
}

.history-title {
  font-family: "IBM Plex Sans", sans-serif;
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 1rem 0;
}

.attempts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

.attempt-card {
  background: white;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  padding: 1rem;
}

.attempt-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.attempt-quiz-title {
  font-size: 0.9375rem;
  font-weight: 500;
  color: #1f2937;
}

.attempt-score-badge {
  font-size: 0.875rem;
  font-weight: 600;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  background: #fef2f2;
  color: #dc2626;
}

.attempt-score-badge.passed {
  background: #dcfce7;
  color: #16a34a;
}

.attempt-details {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: #6b7280;
}

/* Due Cards Alert (Flashcards Page) */
.due-cards-alert {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: #fef3c7;
  color: #92400e;
  padding: 1rem 1.25rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
}

.due-cards-alert svg {
  flex-shrink: 0;
  color: #d97706;
}

.loading-state.small {
  padding: 1rem;
}
</style>
