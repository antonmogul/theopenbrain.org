/**
 * Quizzes Store
 *
 * Manages quiz state for the dashboard.
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import quizzesApi from '@/services/api/quizzes';
import { QUESTION_TYPES, STATUS } from '@/constants/dashboard';

export const useQuizzesStore = defineStore('dashboardQuizzes', () => {
  // State
  const quizzes = ref([]);
  const loading = ref(false);
  const error = ref(null);

  // Quiz editor modal
  const showQuizEditor = ref(false);
  const editingQuiz = ref(null);
  const quizForm = ref(getDefaultQuizForm());

  // Question editor modal
  const showQuestionEditor = ref(false);
  const editingQuestion = ref(null);
  const questionForm = ref(getDefaultQuestionForm());

  // Default form factories
  function getDefaultQuizForm() {
    return {
      title: '',
      description: '',
      module_id: null,
      section_id: null,
      time_limit_minutes: 15,
      passing_score: 70,
      allow_multiple_attempts: true,
      show_correct_answers: true,
      questions: [],
    };
  }

  function getDefaultQuestionForm() {
    return {
      question_text: '',
      question_type: QUESTION_TYPES.MULTIPLE_CHOICE,
      options: ['', '', '', ''],
      correct_answer: '',
      points: 1,
    };
  }

  // Getters
  const publishedQuizzes = computed(() =>
    quizzes.value.filter(q => q.status === STATUS.PUBLISHED)
  );

  const draftQuizzes = computed(() =>
    quizzes.value.filter(q => q.status === STATUS.DRAFT)
  );

  const quizStats = computed(() => ({
    total: quizzes.value.length,
    published: publishedQuizzes.value.length,
    draft: draftQuizzes.value.length,
    totalQuestions: quizzes.value.reduce((sum, q) => sum + (q.questionCount || 0), 0),
    totalAttempts: quizzes.value.reduce((sum, q) => sum + (q.attemptCount || 0), 0),
  }));

  // Actions
  async function fetchQuizzes() {
    loading.value = true;
    error.value = null;

    try {
      quizzes.value = await quizzesApi.fetchQuizzes();
    } catch (err) {
      console.error('Error fetching quizzes:', err);
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  }

  async function fetchQuiz(quizId) {
    try {
      return await quizzesApi.fetchQuiz(quizId);
    } catch (err) {
      console.error('Error fetching quiz:', err);
      throw err;
    }
  }

  async function createQuiz(userId) {
    try {
      const created = await quizzesApi.createQuiz(quizForm.value, userId);

      // Create questions if any
      if (quizForm.value.questions.length > 0) {
        for (let i = 0; i < quizForm.value.questions.length; i++) {
          await quizzesApi.createQuestion(created.id, {
            ...quizForm.value.questions[i],
            order_index: i,
          });
        }
      }

      closeQuizEditor();
      await fetchQuizzes();
      return created;
    } catch (err) {
      console.error('Error creating quiz:', err);
      throw err;
    }
  }

  async function updateQuiz(quizId) {
    try {
      await quizzesApi.updateQuiz(quizId, {
        title: quizForm.value.title,
        description: quizForm.value.description,
        module_id: quizForm.value.module_id,
        section_id: quizForm.value.section_id,
        time_limit_minutes: quizForm.value.time_limit_minutes,
        passing_score: quizForm.value.passing_score,
        allow_multiple_attempts: quizForm.value.allow_multiple_attempts,
        show_correct_answers: quizForm.value.show_correct_answers,
      });

      closeQuizEditor();
      await fetchQuizzes();
    } catch (err) {
      console.error('Error updating quiz:', err);
      throw err;
    }
  }

  async function deleteQuiz(quizId) {
    try {
      await quizzesApi.deleteQuiz(quizId);
      quizzes.value = quizzes.value.filter(q => q.id !== quizId);
    } catch (err) {
      console.error('Error deleting quiz:', err);
      throw err;
    }
  }

  async function createQuestion(quizId) {
    try {
      const orderIndex = quizForm.value.questions.length;
      const created = await quizzesApi.createQuestion(quizId, {
        ...questionForm.value,
        order_index: orderIndex,
      });

      quizForm.value.questions.push(created);
      closeQuestionEditor();
      return created;
    } catch (err) {
      console.error('Error creating question:', err);
      throw err;
    }
  }

  async function updateQuestion(questionId) {
    try {
      await quizzesApi.updateQuestion(questionId, questionForm.value);

      // Update local state
      const index = quizForm.value.questions.findIndex(q => q.id === questionId);
      if (index !== -1) {
        quizForm.value.questions[index] = {
          ...quizForm.value.questions[index],
          ...questionForm.value,
        };
      }

      closeQuestionEditor();
    } catch (err) {
      console.error('Error updating question:', err);
      throw err;
    }
  }

  async function deleteQuestion(questionId) {
    try {
      await quizzesApi.deleteQuestion(questionId);
      quizForm.value.questions = quizForm.value.questions.filter(q => q.id !== questionId);
    } catch (err) {
      console.error('Error deleting question:', err);
      throw err;
    }
  }

  // Modal management
  function openQuizEditor(quiz = null) {
    editingQuiz.value = quiz;
    if (quiz) {
      quizForm.value = {
        title: quiz.title,
        description: quiz.description || '',
        module_id: quiz.module_id,
        section_id: quiz.section_id,
        time_limit_minutes: quiz.time_limit_minutes || 15,
        passing_score: quiz.passing_score || 70,
        allow_multiple_attempts: quiz.allow_multiple_attempts ?? true,
        show_correct_answers: quiz.show_correct_answers ?? true,
        questions: quiz.questions || [],
      };
    } else {
      quizForm.value = getDefaultQuizForm();
    }
    showQuizEditor.value = true;
  }

  function closeQuizEditor() {
    showQuizEditor.value = false;
    editingQuiz.value = null;
    quizForm.value = getDefaultQuizForm();
  }

  function openQuestionEditor(question = null) {
    editingQuestion.value = question;
    if (question) {
      questionForm.value = {
        question_text: question.question_text,
        question_type: question.question_type || QUESTION_TYPES.MULTIPLE_CHOICE,
        options: question.options || ['', '', '', ''],
        correct_answer: question.correct_answer || '',
        points: question.points || 1,
      };
    } else {
      questionForm.value = getDefaultQuestionForm();
    }
    showQuestionEditor.value = true;
  }

  function closeQuestionEditor() {
    showQuestionEditor.value = false;
    editingQuestion.value = null;
    questionForm.value = getDefaultQuestionForm();
  }

  // Add question to form (local, before saving quiz)
  function addQuestionToForm() {
    quizForm.value.questions.push({ ...questionForm.value, id: `temp-${Date.now()}` });
    closeQuestionEditor();
  }

  // Remove question from form (local, before saving quiz)
  function removeQuestionFromForm(index) {
    quizForm.value.questions.splice(index, 1);
  }

  function reset() {
    quizzes.value = [];
    loading.value = false;
    error.value = null;
    showQuizEditor.value = false;
    editingQuiz.value = null;
    quizForm.value = getDefaultQuizForm();
    showQuestionEditor.value = false;
    editingQuestion.value = null;
    questionForm.value = getDefaultQuestionForm();
  }

  return {
    // State
    quizzes,
    loading,
    error,
    showQuizEditor,
    editingQuiz,
    quizForm,
    showQuestionEditor,
    editingQuestion,
    questionForm,

    // Getters
    publishedQuizzes,
    draftQuizzes,
    quizStats,

    // Actions
    fetchQuizzes,
    fetchQuiz,
    createQuiz,
    updateQuiz,
    deleteQuiz,
    createQuestion,
    updateQuestion,
    deleteQuestion,
    openQuizEditor,
    closeQuizEditor,
    openQuestionEditor,
    closeQuestionEditor,
    addQuestionToForm,
    removeQuestionFromForm,
    reset,
  };
});

export default useQuizzesStore;
