import { ref, computed } from "vue";
import { useAuth } from "./useAuth";

// Supabase REST API config
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY;

export function useQuizzes() {
  const quizzes = ref([]);
  const availableQuizzes = ref([]);
  const recentAttempts = ref([]);
  const currentQuiz = ref(null);
  const questions = ref([]);
  const currentQuestionIndex = ref(0);
  const answers = ref({});
  const loading = ref(false);
  const error = ref(null);
  const attemptId = ref(null);
  const timeRemaining = ref(0);
  const quizStartTime = ref(null);
  const timerInterval = ref(null);

  const { user, session } = useAuth();

  // Helper for REST API calls
  async function supabaseRest(endpoint, options = {}) {
    const accessToken = session.value?.access_token;
    if (!accessToken && options.method !== "GET") {
      throw new Error("No access token available");
    }

    const { headers: optionHeaders, ...restOptions } = options;

    const response = await fetch(`${supabaseUrl}/rest/v1/${endpoint}`, {
      ...restOptions,
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${accessToken || supabaseKey}`,
        "Content-Type": "application/json",
        ...optionHeaders,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }

    const text = await response.text();
    if (!text) return options.method === "POST" ? [] : { success: true };
    return JSON.parse(text);
  }

  // Fisher-Yates shuffle algorithm
  function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // Fetch available quizzes for a module
  async function fetchQuizzes(moduleId) {
    loading.value = true;
    error.value = null;

    try {
      let query = `quizzes?is_published=eq.true&select=*,quiz_questions(count)&order=created_at.desc`;

      if (moduleId) {
        query += `&module_id=eq.${moduleId}`;
      }

      const data = await supabaseRest(query);
      quizzes.value = data || [];
    } catch (e) {
      console.error("useQuizzes: Error fetching quizzes:", e);
      error.value = e.message;
      quizzes.value = [];
    } finally {
      loading.value = false;
    }
  }

  // Fetch available quizzes for multiple modules (for dashboard)
  async function fetchAvailableQuizzes(moduleIds) {
    loading.value = true;
    error.value = null;

    try {
      if (!moduleIds || moduleIds.length === 0) {
        availableQuizzes.value = [];
        return;
      }

      // Build query for multiple module IDs
      const moduleIdList = moduleIds.join(",");
      const query = `quizzes?is_published=eq.true&module_id=in.(${moduleIdList})&select=*,quiz_questions(count),module:modules(id,title)&order=created_at.desc`;

      const data = await supabaseRest(query);

      // Transform data to include question_count
      availableQuizzes.value = (data || []).map((quiz) => ({
        ...quiz,
        question_count: quiz.quiz_questions?.[0]?.count || 0,
        module_title: quiz.module?.title,
      }));
    } catch (e) {
      console.error("useQuizzes: Error fetching available quizzes:", e);
      error.value = e.message;
      availableQuizzes.value = [];
    } finally {
      loading.value = false;
    }
  }

  // Fetch recent quiz attempts for dashboard
  async function fetchRecentAttempts(limit = 5) {
    if (!user.value) {
      recentAttempts.value = [];
      return [];
    }

    try {
      const query = `quiz_attempts?user_id=eq.${user.value.id}&completed_at=not.is.null&select=*,quiz:quizzes(id,title,passing_score)&order=completed_at.desc&limit=${limit}`;

      const data = await supabaseRest(query);

      recentAttempts.value = (data || []).map((attempt) => ({
        ...attempt,
        total_questions: attempt.score > 0 ? Math.round(attempt.score / 100 * (attempt.correct_count || 1)) || 1 : 1,
      }));

      return recentAttempts.value;
    } catch (e) {
      console.error("useQuizzes: Error fetching recent attempts:", e);
      recentAttempts.value = [];
      return [];
    }
  }

  // Fetch a single quiz by ID with questions
  async function fetchQuiz(quizId) {
    loading.value = true;
    error.value = null;

    try {
      const query = `quizzes?id=eq.${quizId}&select=*,quiz_questions(*)`;
      const data = await supabaseRest(query);

      if (data && data.length > 0) {
        return data[0];
      }
      throw new Error("Quiz not found");
    } catch (e) {
      console.error("useQuizzes: Error fetching quiz:", e);
      error.value = e.message;
      throw e;
    } finally {
      loading.value = false;
    }
  }

  // Start a quiz attempt
  async function startQuiz(quizId) {
    if (!user.value) {
      throw new Error("User not authenticated");
    }

    loading.value = true;
    error.value = null;

    try {
      // Fetch quiz with questions
      const quiz = await fetchQuiz(quizId);

      currentQuiz.value = quiz;
      questions.value = shuffleArray(quiz.quiz_questions || []);
      currentQuestionIndex.value = 0;
      answers.value = {};
      quizStartTime.value = new Date();

      // Set up timer if quiz has time limit
      if (quiz.time_limit_minutes) {
        timeRemaining.value = quiz.time_limit_minutes * 60;
        startTimer();
      } else {
        timeRemaining.value = 0;
      }

      // Create attempt record
      const attemptData = await supabaseRest("quiz_attempts", {
        method: "POST",
        headers: {
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          quiz_id: quizId,
          user_id: user.value.id,
          started_at: new Date().toISOString(),
        }),
      });

      const attempt = Array.isArray(attemptData) ? attemptData[0] : attemptData;
      attemptId.value = attempt.id;

      return {
        quiz: currentQuiz.value,
        questions: questions.value,
        attemptId: attemptId.value,
      };
    } catch (e) {
      console.error("useQuizzes: Error starting quiz:", e);
      error.value = e.message;
      throw e;
    } finally {
      loading.value = false;
    }
  }

  // Start countdown timer
  function startTimer() {
    if (timerInterval.value) {
      clearInterval(timerInterval.value);
    }

    timerInterval.value = setInterval(() => {
      if (timeRemaining.value > 0) {
        timeRemaining.value--;
      } else {
        // Time's up - auto submit
        clearInterval(timerInterval.value);
        timerInterval.value = null;
      }
    }, 1000);
  }

  // Stop timer
  function stopTimer() {
    if (timerInterval.value) {
      clearInterval(timerInterval.value);
      timerInterval.value = null;
    }
  }

  // Submit answer for a question
  function answerQuestion(questionId, answer) {
    answers.value = { ...answers.value, [questionId]: answer };
  }

  // Go to next question
  function nextQuestion() {
    if (currentQuestionIndex.value < questions.value.length - 1) {
      currentQuestionIndex.value++;
    }
  }

  // Go to previous question
  function previousQuestion() {
    if (currentQuestionIndex.value > 0) {
      currentQuestionIndex.value--;
    }
  }

  // Jump to a specific question
  function goToQuestion(index) {
    if (index >= 0 && index < questions.value.length) {
      currentQuestionIndex.value = index;
    }
  }

  // Submit the quiz
  async function submitQuiz() {
    if (!user.value || !attemptId.value || !currentQuiz.value) {
      throw new Error("Invalid quiz state");
    }

    loading.value = true;
    stopTimer();

    try {
      const endTime = new Date();
      const timeTaken = Math.floor((endTime - quizStartTime.value) / 1000);

      // Calculate score
      let correctCount = 0;
      const answerRecords = [];

      for (const question of questions.value) {
        const userAnswer = answers.value[question.id];
        const isCorrect = checkAnswer(question, userAnswer);
        if (isCorrect) correctCount++;

        answerRecords.push({
          attempt_id: attemptId.value,
          question_id: question.id,
          selected_answer: userAnswer || null,
          is_correct: isCorrect,
        });
      }

      const score = Math.round((correctCount / questions.value.length) * 100);
      const passingScore = currentQuiz.value.passing_score || 70;
      const passed = score >= passingScore;

      // Save individual answers
      if (answerRecords.length > 0) {
        await supabaseRest("quiz_answers", {
          method: "POST",
          body: JSON.stringify(answerRecords),
        });
      }

      // Update attempt with results
      await supabaseRest(`quiz_attempts?id=eq.${attemptId.value}`, {
        method: "PATCH",
        body: JSON.stringify({
          completed_at: endTime.toISOString(),
          score: score,
          time_taken_seconds: timeTaken,
          passed: passed,
        }),
      });

      return {
        score,
        passed,
        correctCount,
        total: questions.value.length,
        passingScore,
        timeTaken,
      };
    } catch (e) {
      console.error("useQuizzes: Error submitting quiz:", e);
      error.value = e.message;
      throw e;
    } finally {
      loading.value = false;
    }
  }

  // Check if an answer is correct
  function checkAnswer(question, userAnswer) {
    if (!userAnswer) return false;

    // For short answer, do case-insensitive comparison
    if (question.question_type === "short_answer") {
      return (
        userAnswer.toLowerCase().trim() ===
        question.correct_answer.toLowerCase().trim()
      );
    }

    // For multiple choice and true/false
    return userAnswer === question.correct_answer;
  }

  // Fetch user's quiz history
  async function fetchQuizHistory(quizId = null, limit = 10) {
    if (!user.value) return [];

    try {
      let query = `quiz_attempts?user_id=eq.${user.value.id}&select=*,quiz:quizzes(id,title,passing_score)&order=started_at.desc&limit=${limit}`;

      if (quizId) {
        query += `&quiz_id=eq.${quizId}`;
      }

      const data = await supabaseRest(query);
      return data || [];
    } catch (e) {
      console.error("useQuizzes: Error fetching quiz history:", e);
      return [];
    }
  }

  // Get best score for a quiz
  async function getBestScore(quizId) {
    if (!user.value) return null;

    try {
      const query = `quiz_attempts?user_id=eq.${user.value.id}&quiz_id=eq.${quizId}&completed_at=not.is.null&select=score&order=score.desc&limit=1`;
      const data = await supabaseRest(query);

      if (data && data.length > 0) {
        return data[0].score;
      }
      return null;
    } catch (e) {
      console.error("useQuizzes: Error fetching best score:", e);
      return null;
    }
  }

  // Reset quiz state
  function resetQuiz() {
    stopTimer();
    currentQuiz.value = null;
    questions.value = [];
    currentQuestionIndex.value = 0;
    answers.value = {};
    attemptId.value = null;
    timeRemaining.value = 0;
    quizStartTime.value = null;
    error.value = null;
  }

  // Computed properties
  const currentQuestion = computed(
    () => questions.value[currentQuestionIndex.value] || null
  );

  const progress = computed(() => ({
    current: currentQuestionIndex.value + 1,
    total: questions.value.length,
    percentage:
      questions.value.length > 0
        ? Math.round(
            ((currentQuestionIndex.value + 1) / questions.value.length) * 100
          )
        : 0,
  }));

  const isLastQuestion = computed(
    () => currentQuestionIndex.value === questions.value.length - 1
  );

  const isFirstQuestion = computed(() => currentQuestionIndex.value === 0);

  const answeredCount = computed(() => Object.keys(answers.value).length);

  const isQuizComplete = computed(
    () => answeredCount.value === questions.value.length
  );

  // Format time remaining as MM:SS
  const formattedTimeRemaining = computed(() => {
    const mins = Math.floor(timeRemaining.value / 60);
    const secs = timeRemaining.value % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  });

  const isTimeRunningLow = computed(() => timeRemaining.value < 60);

  return {
    // State
    quizzes,
    availableQuizzes,
    recentAttempts,
    currentQuiz,
    questions,
    currentQuestion,
    currentQuestionIndex,
    answers,
    loading,
    error,
    timeRemaining,
    formattedTimeRemaining,
    isTimeRunningLow,
    attemptId,

    // Computed
    progress,
    isLastQuestion,
    isFirstQuestion,
    answeredCount,
    isQuizComplete,

    // Methods
    fetchQuizzes,
    fetchAvailableQuizzes,
    fetchRecentAttempts,
    fetchQuiz,
    startQuiz,
    answerQuestion,
    nextQuestion,
    previousQuestion,
    goToQuestion,
    submitQuiz,
    fetchQuizHistory,
    getBestScore,
    resetQuiz,
    stopTimer,
  };
}
