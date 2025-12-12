/**
 * Quizzes API Service
 *
 * Handles all quiz-related API operations.
 */

import { get, post, patch, del, buildInFilter } from './client';

/**
 * Fetch all quizzes with attempt stats
 * @returns {Promise<Array>} Quizzes with stats
 */
export async function fetchQuizzes() {
  const quizzes = await get('quizzes?select=*&order=created_at.desc');

  // Fetch stats for each quiz
  const quizzesWithStats = await Promise.all(
    quizzes.map(async (quiz) => {
      const attempts = await get(`quiz_attempts?quiz_id=eq.${quiz.id}&select=id,score,passed`);
      const questions = await get(`quiz_questions?quiz_id=eq.${quiz.id}&select=id`);

      const totalAttempts = attempts.length;
      const passedAttempts = attempts.filter(a => a.passed).length;
      const avgScore = totalAttempts > 0
        ? Math.round(attempts.reduce((sum, a) => sum + (a.score || 0), 0) / totalAttempts)
        : 0;

      return {
        ...quiz,
        questionCount: questions.length,
        attemptCount: totalAttempts,
        avgScore,
        passRate: totalAttempts > 0 ? Math.round((passedAttempts / totalAttempts) * 100) : 0,
      };
    })
  );

  return quizzesWithStats;
}

/**
 * Fetch a single quiz by ID with questions
 * @param {string} quizId - Quiz ID
 * @returns {Promise<Object>} Quiz with questions
 */
export async function fetchQuiz(quizId) {
  const [quiz] = await get(`quizzes?id=eq.${quizId}&select=*`);
  const questions = await get(`quiz_questions?quiz_id=eq.${quizId}&select=*&order=order_index.asc`);

  return {
    ...quiz,
    questions,
  };
}

/**
 * Create a new quiz
 * @param {Object} data - Quiz data
 * @param {string} createdBy - User ID who created the quiz
 * @returns {Promise<Object>} Created quiz
 */
export async function createQuiz(data, createdBy) {
  const [created] = await post('quizzes', {
    title: data.title,
    description: data.description || '',
    module_id: data.module_id,
    section_id: data.section_id,
    time_limit_minutes: data.time_limit_minutes || 15,
    passing_score: data.passing_score || 70,
    allow_multiple_attempts: data.allow_multiple_attempts ?? true,
    show_correct_answers: data.show_correct_answers ?? true,
    status: 'draft',
    created_by: createdBy,
  });
  return created;
}

/**
 * Update a quiz
 * @param {string} quizId - Quiz ID
 * @param {Object} data - Updated data
 * @returns {Promise<Object>} Success indicator
 */
export async function updateQuiz(quizId, data) {
  return patch(`quizzes?id=eq.${quizId}`, {
    ...data,
    updated_at: new Date().toISOString(),
  });
}

/**
 * Delete a quiz (cascades to questions and attempts)
 * @param {string} quizId - Quiz ID
 * @returns {Promise<Object>} Success indicator
 */
export async function deleteQuiz(quizId) {
  // Delete attempts first
  await del(`quiz_attempts?quiz_id=eq.${quizId}`);
  // Delete questions
  await del(`quiz_questions?quiz_id=eq.${quizId}`);
  // Delete quiz
  return del(`quizzes?id=eq.${quizId}`);
}

/**
 * Create a quiz question
 * @param {string} quizId - Quiz ID
 * @param {Object} data - Question data
 * @returns {Promise<Object>} Created question
 */
export async function createQuestion(quizId, data) {
  const [created] = await post('quiz_questions', {
    quiz_id: quizId,
    question_text: data.question_text,
    question_type: data.question_type || 'multiple_choice',
    options: data.options || [],
    correct_answer: data.correct_answer,
    points: data.points || 1,
    order_index: data.order_index || 0,
  });
  return created;
}

/**
 * Update a quiz question
 * @param {string} questionId - Question ID
 * @param {Object} data - Updated data
 * @returns {Promise<Object>} Success indicator
 */
export async function updateQuestion(questionId, data) {
  return patch(`quiz_questions?id=eq.${questionId}`, {
    ...data,
    updated_at: new Date().toISOString(),
  });
}

/**
 * Delete a quiz question
 * @param {string} questionId - Question ID
 * @returns {Promise<Object>} Success indicator
 */
export async function deleteQuestion(questionId) {
  return del(`quiz_questions?id=eq.${questionId}`);
}

/**
 * Fetch questions for a quiz
 * @param {string} quizId - Quiz ID
 * @returns {Promise<Array>} Questions
 */
export async function fetchQuestions(quizId) {
  return get(`quiz_questions?quiz_id=eq.${quizId}&select=*&order=order_index.asc`);
}

/**
 * Reorder quiz questions
 * @param {Array<{id: string, order_index: number}>} updates - Array of question updates
 * @returns {Promise<void>}
 */
export async function reorderQuestions(updates) {
  await Promise.all(
    updates.map(({ id, order_index }) =>
      patch(`quiz_questions?id=eq.${id}`, { order_index })
    )
  );
}

/**
 * Fetch quiz attempts for analytics
 * @param {string} quizId - Quiz ID (optional, fetches all if not provided)
 * @returns {Promise<Array>} Attempts
 */
export async function fetchAttempts(quizId = null) {
  let query = 'quiz_attempts?select=*&order=started_at.desc';
  if (quizId) {
    query = `quiz_attempts?quiz_id=eq.${quizId}&select=*&order=started_at.desc`;
  }
  return get(query);
}

export default {
  fetchQuizzes,
  fetchQuiz,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  fetchQuestions,
  reorderQuestions,
  fetchAttempts,
};
