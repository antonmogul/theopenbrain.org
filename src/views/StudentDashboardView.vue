<script setup>
// Student dashboard — reskinned to the unified token design (sub-project B).
// Adopts DashboardShell (accent=teal), shared SectionHeader/StatGrid/BaseCard/
// ListRow/EmptyState/LoadingState. Settings nav routes to /settings (canonical).
// Functional via composables; Progress detail is marked preview (coming soon).
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useAuth } from "@/composables/useAuth";
import { useStudentCourses } from "@/composables/useStudentCourses";
import { useMyChapters } from "@/composables/useMyChapters";
import { useHighlights } from "@/composables/useHighlights";
import { useNotes } from "@/composables/useNotes";
import { useQuizzes } from "@/composables/useQuizzes";
import { useFlashcards } from "@/composables/useFlashcards";
import { useStudentStore } from "@/stores/student";
import { useHomeRoute } from "@/composables/useHomeRoute";
import { relativeShort as formatRelativeDate } from "@/utils/format";

// Shared library
import {
  DashboardShell,
  SectionHeader,
  BaseCard,
  ListRow,
  EmptyState,
  LoadingState,
  StatusBadge,
  Button,
} from "@/components/dashboard/shared";

// Domain components (functional — kept, only wrapped/restyled)
import SettingsPanels from "@/components/settings/SettingsPanels.vue";
import CourseCard from "@/components/student/CourseCard.vue";
import StudyStats from "@/components/student/StudyStats.vue";
import ProgressCard from "@/components/student/ProgressCard.vue";
import TrendingHighlights from "@/components/chapter/TrendingHighlights.vue";
import QuizCard from "@/components/quiz/QuizCard.vue";
import FlashcardDeck from "@/components/flashcard/FlashcardDeck.vue";

const router = useRouter();
const { user, profile } = useAuth();
const studentStore = useStudentStore();
const homeRoute = useHomeRoute();

const {
  courses,
  loading: coursesLoading,
  fetchEnrolledCourses,
  continueReading: courseContinueReading,
} = useStudentCourses();

// The chapters this student has opened, course or not (Stuart, 24 Sep: "my
// chapters", not "my courses"; OPENBRAIN-101).
const {
  chapters: myChapters,
  continueReading: chapterContinueReading,
  loading: chaptersLoading,
  fetchMyChapters,
} = useMyChapters();
const continueReading = computed(
  () => chapterContinueReading.value || courseContinueReading.value
);
const STATUS_LABEL = { done: "Finished", reading: "Reading", opened: "Opened" };
function chapterHint(c) {
  const when = c.lastAccessedAt ? formatRelativeDate(c.lastAccessedAt) : "";
  return [`${c.percent}% read`, when].filter(Boolean).join(" · ");
}
function openChapter(c) {
  router.push({ path: c.route, query: { resume: "1" } });
}

const { fetchRecentHighlights } = useHighlights();
const { fetchRecentNotes } = useNotes();
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

// Navigation (settings routes out — see onNav). Courses only for students
// who are enrolled in one.
const navItems = computed(() => [
  { id: "dashboard", label: "Dashboard", icon: "grid" },
  { id: "chapters", label: "My Chapters", icon: "book" },
  ...(courses.value.length
    ? [{ id: "courses", label: "My Courses", icon: "book" }]
    : []),
  { id: "quizzes", label: "Quizzes", icon: "quiz" },
  { id: "flashcards", label: "Flashcards", icon: "flashcard" },
  { id: "highlights", label: "My Highlights", icon: "highlight" },
  { id: "notes", label: "My Notes", icon: "notes" },
  { id: "progress", label: "Progress", icon: "progress" },
  { id: "settings", label: "Settings", icon: "settings" },
]);

const displayName = computed(
  () =>
    profile.value?.full_name || user.value?.email?.split("@")[0] || "Student"
);

onMounted(async () => {
  await Promise.all([fetchEnrolledCourses(), fetchMyChapters()]);
  // The dashboard shows the latest few; the Highlights and Notes sections
  // list everything (they said "Everything you've marked" over five).
  recentHighlights.value = await fetchRecentHighlights(500);
  recentNotes.value = await fetchRecentNotes(500);
  await studentStore.fetchStudyStats();
  await loadQuizzesAndFlashcards();
});

// Quizzes and flashcards for the chapters the student reads, and their
// courses' chapters: they used to need a course enrolment.
async function loadQuizzesAndFlashcards() {
  const moduleIds = [
    ...new Set([
      ...myChapters.value.map((c) => c.module.id),
      ...courses.value
        .flatMap((enrollment) => enrollment.course?.modules || [])
        .map((module) => module.id),
    ]),
  ];
  if (moduleIds.length > 0) {
    await Promise.all([
      fetchAvailableQuizzes(moduleIds),
      fetchAvailableDecks(moduleIds),
      fetchRecentAttempts(5),
      fetchDueCardsCount(moduleIds),
    ]);
  }
}

function onNav(id) {
  activeSection.value = id;
}

function startQuiz(quizId) {
  router.push({ name: "quiz", params: { quizId } });
}
function startFlashcards(moduleId) {
  router.push({ name: "flashcards", params: { moduleId } });
}
function formatScore(score, total) {
  if (!total || Number.isNaN(score / total)) return "—";
  return `${Math.round((score / total) * 100)}%`;
}
</script>

<template>
  <DashboardShell
    :nav-items="navItems"
    :active-section="activeSection"
    :display-name="displayName"
    :email="user?.email"
    role="Student"
    accent="teal"
    :back-to="homeRoute"
    back-label="Back to book"
    @update:active-section="onNav"
  >
    <!-- DASHBOARD -->
    <section v-if="activeSection === 'dashboard'" class="section">
      <SectionHeader
        eyebrow="01 · Overview"
        :title="`Welcome back, ${displayName}`"
        subtitle="Pick up where you left off, and see what's due."
      />

      <ProgressCard :continue-reading="continueReading" />
      <StudyStats :stats="studentStore.studyStats" />

      <div class="grid-2">
        <div>
          <div class="card-head">
            <h3 class="card-title">My chapters</h3>
            <Button
              variant="ghost"
              size="sm"
              @click="activeSection = 'chapters'"
              >View all</Button
            >
          </div>
          <LoadingState
            v-if="chaptersLoading"
            message="Loading chapters…"
            size="sm"
          />
          <EmptyState
            v-else-if="myChapters.length === 0"
            title="No chapters yet"
            message="Open a chapter and it appears here."
            action-label="Browse chapters"
            @action="router.push('/chapters')"
          />
          <BaseCard v-else>
            <ListRow
              v-for="c in myChapters.slice(0, 4)"
              :key="c.module.id"
              :label="`${c.module.order_index} · ${c.module.title}`"
              :hint="chapterHint(c)"
              interactive
              @click="openChapter(c)"
            >
              <StatusBadge
                :variant="c.status === 'done' ? 'complete' : 'accent'"
              >
                {{ STATUS_LABEL[c.status] }}
              </StatusBadge>
            </ListRow>
          </BaseCard>
        </div>

        <div>
          <div class="card-head">
            <h3 class="card-title">Recent highlights</h3>
            <Button
              variant="ghost"
              size="sm"
              @click="activeSection = 'highlights'"
              >View all</Button
            >
          </div>
          <EmptyState
            v-if="recentHighlights.length === 0"
            title="No highlights yet"
          />
          <div v-else class="stack">
            <BaseCard
              v-for="highlight in recentHighlights.slice(0, 5)"
              :key="highlight.id"
              padding="sm"
              class="hl-card"
              :style="{ borderLeftColor: `rgb(var(--color-mark1))` }"
            >
              <p class="hl-text">
                "{{ highlight.selected_text?.slice(0, 80)
                }}{{ highlight.selected_text?.length > 80 ? "…" : "" }}"
              </p>
              <span class="hl-date">{{
                formatRelativeDate(highlight.created_at)
              }}</span>
            </BaseCard>
          </div>
          <TrendingHighlights class="mt-6" :limit="5" />
        </div>
      </div>
      <div class="grid-2">
        <BaseCard>
          <div class="card-head">
            <h3 class="card-title">Available quizzes</h3>
            <Button variant="ghost" size="sm" @click="activeSection = 'quizzes'"
              >View all</Button
            >
          </div>
          <LoadingState
            v-if="quizzesLoading"
            message="Loading quizzes…"
            size="sm"
          />
          <EmptyState
            v-else-if="availableQuizzes.length === 0"
            title="No quizzes available"
          />
          <div v-else>
            <ListRow
              v-for="quiz in availableQuizzes.slice(0, 3)"
              :key="quiz.id"
              :label="quiz.title"
              :hint="`${quiz.question_count} questions`"
              interactive
              @click="startQuiz(quiz.id)"
            >
              <span class="chev">›</span>
            </ListRow>
          </div>
        </BaseCard>

        <BaseCard>
          <div class="card-head">
            <h3 class="card-title">Flashcards</h3>
            <Button
              variant="ghost"
              size="sm"
              @click="activeSection = 'flashcards'"
              >View all</Button
            >
          </div>
          <div v-if="dueCardsCount > 0" class="due-banner">
            <strong>{{ dueCardsCount }}</strong> cards due for review
          </div>
          <LoadingState
            v-if="flashcardsLoading"
            message="Loading decks…"
            size="sm"
          />
          <EmptyState
            v-else-if="flashcardDecks.length === 0"
            title="No decks available"
          />
          <div v-else>
            <ListRow
              v-for="deck in flashcardDecks.slice(0, 3)"
              :key="deck.module_id"
              :label="deck.module_title"
              :hint="`${deck.card_count} cards`"
              interactive
              @click="startFlashcards(deck.module_id)"
            >
              <span class="chev">›</span>
            </ListRow>
          </div>
        </BaseCard>
      </div>

      <BaseCard v-if="recentAttempts.length > 0">
        <h3 class="card-title">Recent quiz scores</h3>
        <ListRow
          v-for="attempt in recentAttempts"
          :key="attempt.id"
          :label="attempt.quiz?.title"
          :hint="formatRelativeDate(attempt.completed_at)"
        >
          <StatusBadge :variant="attempt.passed ? 'complete' : 'warn'">
            {{ formatScore(attempt.score, attempt.total_points) }}
          </StatusBadge>
        </ListRow>
      </BaseCard>
    </section>

    <!-- CHAPTERS -->
    <section v-else-if="activeSection === 'chapters'" class="section">
      <SectionHeader
        eyebrow="02 · My chapters"
        title="The chapters you've opened"
        subtitle="Most recent first. Pick one up where you left off."
      />
      <LoadingState v-if="chaptersLoading" message="Loading chapters…" />
      <EmptyState
        v-else-if="myChapters.length === 0"
        title="No chapters yet"
        message="Open a chapter from the library and it appears here."
        action-label="Browse chapters"
        @action="router.push('/chapters')"
      />
      <BaseCard v-else>
        <ListRow
          v-for="c in myChapters"
          :key="c.module.id"
          :label="`Chapter ${c.module.order_index} · ${c.module.title}`"
          :hint="chapterHint(c)"
          interactive
          @click="openChapter(c)"
        >
          <StatusBadge :variant="c.status === 'done' ? 'complete' : 'accent'">
            {{ STATUS_LABEL[c.status] }}
          </StatusBadge>
        </ListRow>
      </BaseCard>
    </section>

    <!-- COURSES -->
    <section v-else-if="activeSection === 'courses'" class="section">
      <SectionHeader eyebrow="My courses" title="Your enrolled courses" />
      <LoadingState v-if="coursesLoading" message="Loading courses…" />
      <EmptyState
        v-else-if="courses.length === 0"
        title="No courses yet"
        message="Ask your professor for an enrollment link to get started."
        action-label="Browse the book"
        @action="router.push(homeRoute)"
      />
      <div v-else class="card-grid">
        <CourseCard
          v-for="enrollment in courses"
          :key="enrollment.id"
          :enrollment="enrollment"
        />
      </div>
    </section>

    <!-- QUIZZES -->
    <section v-else-if="activeSection === 'quizzes'" class="section">
      <SectionHeader eyebrow="03 · Quizzes" title="Test your recall" />
      <LoadingState v-if="quizzesLoading" message="Loading quizzes…" />
      <EmptyState
        v-else-if="availableQuizzes.length === 0"
        title="No quizzes available"
        message="Quizzes will appear here when your courses have them."
      />
      <div v-else class="card-grid">
        <QuizCard
          v-for="quiz in availableQuizzes"
          :key="quiz.id"
          :quiz="quiz"
          @start="startQuiz(quiz.id)"
        />
      </div>

      <div v-if="recentAttempts.length > 0" class="mt-6">
        <h3 class="card-title">Recent attempts</h3>
        <div class="card-grid">
          <BaseCard
            v-for="attempt in recentAttempts"
            :key="attempt.id"
            padding="md"
          >
            <div class="card-head">
              <span class="attempt-title">{{ attempt.quiz?.title }}</span>
              <StatusBadge :variant="attempt.passed ? 'complete' : 'warn'">
                {{ formatScore(attempt.score, attempt.total_questions) }}
              </StatusBadge>
            </div>
            <div class="attempt-meta">
              <span
                >{{ attempt.score }}/{{ attempt.total_questions }} correct</span
              >
              <span>{{ formatRelativeDate(attempt.completed_at) }}</span>
            </div>
          </BaseCard>
        </div>
      </div>
    </section>

    <!-- FLASHCARDS -->
    <section v-else-if="activeSection === 'flashcards'" class="section">
      <SectionHeader eyebrow="04 · Flashcards" title="Spaced repetition" />
      <div v-if="dueCardsCount > 0" class="due-banner big">
        You have <strong>{{ dueCardsCount }}</strong> cards due for review.
      </div>
      <LoadingState v-if="flashcardsLoading" message="Loading decks…" />
      <EmptyState
        v-else-if="flashcardDecks.length === 0"
        title="No flashcard decks available"
        message="Decks will appear here when your courses have them."
      />
      <div v-else class="card-grid">
        <FlashcardDeck
          v-for="deck in flashcardDecks"
          :key="deck.module_id"
          :deck="deck"
          @study="startFlashcards(deck.module_id)"
        />
      </div>
    </section>

    <!-- HIGHLIGHTS -->
    <section v-else-if="activeSection === 'highlights'" class="section">
      <SectionHeader
        eyebrow="05 · Highlights"
        title="Everything you've marked"
      />
      <EmptyState
        v-if="recentHighlights.length === 0"
        title="No highlights yet"
        message="Select text while reading to create highlights."
      />
      <div v-else class="card-grid">
        <BaseCard
          v-for="highlight in recentHighlights"
          :key="highlight.id"
          padding="md"
          class="hl-card"
        >
          <p class="hl-text">"{{ highlight.selected_text }}"</p>
          <div class="hl-meta">
            <span class="hl-date">{{
              formatRelativeDate(highlight.created_at)
            }}</span>
            <StatusBadge v-if="highlight.tags?.length" variant="accent">{{
              highlight.tags.join(", ")
            }}</StatusBadge>
          </div>
        </BaseCard>
      </div>
    </section>

    <!-- NOTES -->
    <section v-else-if="activeSection === 'notes'" class="section">
      <SectionHeader eyebrow="06 · Notes" title="Your annotations" />
      <EmptyState
        v-if="recentNotes.length === 0"
        title="No notes yet"
        message="Add notes to your highlights or create standalone notes while reading."
      />
      <div v-else class="card-grid">
        <BaseCard v-for="note in recentNotes" :key="note.id" padding="md">
          <div v-if="note.highlight" class="note-preview">
            "{{ note.highlight.selected_text?.slice(0, 60) }}…"
          </div>
          <p class="note-content">{{ note.content }}</p>
          <span class="hl-date">{{ formatRelativeDate(note.created_at) }}</span>
        </BaseCard>
      </div>
    </section>

    <!-- PROGRESS -->
    <section v-else-if="activeSection === 'progress'" class="section">
      <SectionHeader eyebrow="07 · Progress" title="Your reading footprint" />
      <StudyStats :stats="studentStore.studyStats" />
      <BaseCard class="mt-6">
        <h3 class="card-title">Reading progress by chapter</h3>
        <p v-if="myChapters.length === 0" class="muted">
          Open a chapter to start tracking your progress.
        </p>
        <div v-else class="progress-list">
          <div v-for="c in myChapters" :key="c.module.id" class="progress-row">
            <span class="progress-name"
              >{{ c.module.order_index }} · {{ c.module.title }}</span
            >
            <span class="progress-bar" aria-hidden="true"
              ><span :style="{ width: `${c.percent}%` }"
            /></span>
            <span class="progress-pct">{{ c.percent }}%</span>
          </div>
        </div>
      </BaseCard>
    </section>

    <!-- SETTINGS -->
    <section v-else-if="activeSection === 'settings'" class="section">
      <SectionHeader
        eyebrow="08 · Settings"
        title="Your account & preferences"
      />
      <SettingsPanels />
    </section>
  </DashboardShell>
</template>

<style scoped>
.section {
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}
@media (max-width: 1100px) {
  .grid-2 {
    grid-template-columns: 1fr;
  }
}
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}
.stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.mt-6 {
  margin-top: 24px;
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  gap: 12px;
}
.card-title {
  font-family: var(--font-body);
  font-size: 1.125rem;
  font-weight: 500;
  color: rgb(var(--color-ink));
  margin: 0;
}

.chev {
  font-family: var(--font-mono);
  color: rgb(var(--color-mute));
  font-size: 1rem;
}

.due-banner {
  background: rgb(var(--color-warn) / 0.12);
  color: rgb(var(--color-warn));
  padding: 8px 12px;
  border-radius: var(--radius-control);
  font-family: var(--font-body);
  font-size: 0.8125rem;
  margin-bottom: 12px;
}
.due-banner.big {
  font-size: 0.9375rem;
  padding: 14px 18px;
}

.hl-card {
  border-left: 4px solid rgb(var(--color-mark1));
}
.hl-text {
  font-family: var(--font-body);
  font-size: 0.875rem;
  color: rgb(var(--color-ink));
  font-style: italic;
  line-height: 1.5;
  margin: 0 0 8px;
}
.hl-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}
.hl-date {
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  color: rgb(var(--color-mute));
}

.attempt-title {
  font-family: var(--font-body);
  font-size: 0.9375rem;
  color: rgb(var(--color-ink));
}
.attempt-meta {
  display: flex;
  justify-content: space-between;
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  color: rgb(var(--color-mute));
  margin-top: 8px;
}

.note-preview {
  font-family: var(--font-body);
  font-size: 0.75rem;
  font-style: italic;
  color: rgb(var(--color-mute));
  padding: 8px;
  background: rgb(var(--color-mark1) / 0.18);
  border-radius: var(--radius-control);
  margin-bottom: 12px;
}
.note-content {
  font-family: var(--font-body);
  font-size: 0.9375rem;
  color: rgb(var(--color-ink));
  line-height: 1.5;
  margin: 0 0 8px;
}
.muted {
  font-family: var(--font-body);
  font-size: 0.875rem;
  color: rgb(var(--color-mute));
  margin: 8px 0 0;
}
.progress-list {
  display: grid;
  gap: 0.75rem;
  margin-top: 1rem;
}
.progress-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(6rem, 14rem) 3rem;
  align-items: center;
  gap: 1rem;
  font-size: 0.9375rem;
}
.progress-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.progress-bar {
  height: 0.375rem;
  background: rgb(var(--color-line));
}
.progress-bar span {
  display: block;
  height: 100%;
  background: rgb(var(--color-accent));
}
.progress-pct {
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  text-align: right;
  color: rgb(var(--color-mute));
}
</style>
