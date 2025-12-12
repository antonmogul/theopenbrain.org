<script setup>
/**
 * QuizzesSection Component
 *
 * Main quizzes management section for the dashboard.
 */

import { ref, watch, computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useQuizzesStore } from '@/stores/dashboard/quizzes';
import { useAuth } from '@/composables/useAuth';
import LoadingState from '../shared/LoadingState.vue';
import ErrorState from '../shared/ErrorState.vue';
import EmptyState from '../shared/EmptyState.vue';
import ConfirmDialog from '../shared/ConfirmDialog.vue';
import MetricCard from '../shared/MetricCard.vue';
import QuizCard from './QuizCard.vue';
import QuizModal from './QuizModal.vue';
import QuestionEditor from './QuestionEditor.vue';

const props = defineProps({
  active: {
    type: Boolean,
    default: false,
  },
});

const { profile } = useAuth();
const quizzesStore = useQuizzesStore();
const {
  quizzes,
  loading,
  error,
  showQuizEditor,
  editingQuiz,
  quizForm,
  showQuestionEditor,
  editingQuestion,
  questionForm,
  quizStats,
} = storeToRefs(quizzesStore);

// Confirm dialog state
const confirmDialog = ref({
  show: false,
  quiz: null,
});

const formLoading = ref(false);

// Fetch quizzes when section becomes active
watch(() => props.active, (isActive) => {
  if (isActive && quizzes.value.length === 0) {
    quizzesStore.fetchQuizzes();
  }
}, { immediate: true });

function handleCreateQuiz() {
  quizzesStore.openQuizEditor();
}

function handleEditQuiz(quiz) {
  quizzesStore.openQuizEditor(quiz);
}

function handleDeleteQuiz(quiz) {
  confirmDialog.value = {
    show: true,
    quiz,
  };
}

async function handleConfirmDelete() {
  if (confirmDialog.value.quiz) {
    try {
      await quizzesStore.deleteQuiz(confirmDialog.value.quiz.id);
    } catch (err) {
      console.error('Error deleting quiz:', err);
      alert('Failed to delete quiz: ' + err.message);
    }
  }
  confirmDialog.value.show = false;
}

async function handleQuizSubmit() {
  formLoading.value = true;
  try {
    if (editingQuiz.value) {
      await quizzesStore.updateQuiz(editingQuiz.value.id);
    } else {
      await quizzesStore.createQuiz(profile.value?.id);
    }
  } catch (err) {
    console.error('Error saving quiz:', err);
    alert('Failed to save quiz: ' + err.message);
  } finally {
    formLoading.value = false;
  }
}

function handleViewQuestions(quiz) {
  // For now, open the quiz editor with questions tab
  // TODO: Implement a dedicated questions management view
  handleEditQuiz(quiz);
}

function handleAddQuestion() {
  quizzesStore.openQuestionEditor();
}

async function handleQuestionSubmit() {
  formLoading.value = true;
  try {
    if (editingQuestion.value) {
      await quizzesStore.updateQuestion(editingQuestion.value.id);
    } else {
      quizzesStore.addQuestionToForm();
    }
  } catch (err) {
    console.error('Error saving question:', err);
    alert('Failed to save question: ' + err.message);
  } finally {
    formLoading.value = false;
  }
}
</script>

<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-2xl font-bold text-gray-900">Quizzes</h2>
        <p class="text-sm text-gray-500 mt-1">
          Create and manage course quizzes
        </p>
      </div>
      <button
        @click="handleCreateQuiz"
        class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        New Quiz
      </button>
    </div>

    <!-- Stats -->
    <div v-if="quizzes.length > 0" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
      <MetricCard
        label="Total Quizzes"
        :value="quizStats.total"
        icon="chart"
        color="indigo"
      />
      <MetricCard
        label="Published"
        :value="quizStats.published"
        icon="check"
        color="green"
      />
      <MetricCard
        label="Total Questions"
        :value="quizStats.totalQuestions"
        icon="users"
        color="blue"
      />
      <MetricCard
        label="Total Attempts"
        :value="quizStats.totalAttempts"
        icon="eye"
        color="yellow"
      />
    </div>

    <!-- Loading state -->
    <LoadingState v-if="loading" message="Loading quizzes..." />

    <!-- Error state -->
    <ErrorState
      v-else-if="error"
      :message="error"
      @retry="quizzesStore.fetchQuizzes()"
    />

    <!-- Empty state -->
    <EmptyState
      v-else-if="quizzes.length === 0"
      title="No quizzes yet"
      message="Create your first quiz to start assessing students."
      icon="document"
      action-label="Create Quiz"
      @action="handleCreateQuiz"
    />

    <!-- Quizzes list -->
    <div v-else class="space-y-4">
      <QuizCard
        v-for="quiz in quizzes"
        :key="quiz.id"
        :quiz="quiz"
        @edit="handleEditQuiz"
        @delete="handleDeleteQuiz"
        @view-questions="handleViewQuestions"
      />
    </div>

    <!-- Quiz modal -->
    <QuizModal
      :show="showQuizEditor"
      :editing="!!editingQuiz"
      :form="quizForm"
      :loading="formLoading"
      @close="quizzesStore.closeQuizEditor()"
      @submit="handleQuizSubmit"
      @update:form="quizForm = $event"
    />

    <!-- Question editor modal -->
    <QuestionEditor
      :show="showQuestionEditor"
      :editing="!!editingQuestion"
      :form="questionForm"
      :loading="formLoading"
      @close="quizzesStore.closeQuestionEditor()"
      @submit="handleQuestionSubmit"
      @update:form="questionForm = $event"
    />

    <!-- Confirm delete dialog -->
    <ConfirmDialog
      :show="confirmDialog.show"
      title="Delete Quiz"
      :message="`Are you sure you want to delete '${confirmDialog.quiz?.title || 'this quiz'}'? This will also delete all questions and attempt records. This action cannot be undone.`"
      variant="danger"
      confirm-label="Delete Quiz"
      @confirm="handleConfirmDelete"
      @cancel="confirmDialog.show = false"
    />
  </div>
</template>
