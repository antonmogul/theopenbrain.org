// Quiz E2E Tests
// These tests validate the quiz taking flow for students

describe("Quiz Flow", () => {
  // Auth setup helper - sets up intercepts and auth before each test
  const setupAuth = () => {
    const mockSession = {
      access_token: "mock-token",
      user: { id: "test-user-id", email: "test@example.com" },
      expires_at: Math.floor(Date.now() / 1000) + 3600,
    };

    // Intercept profile requests (used by auth guard)
    cy.intercept("GET", "**/rest/v1/profiles*", {
      statusCode: 200,
      body: [{ id: "test-user-id", role: "student", full_name: "Test Student" }],
    }).as("getProfile");

    // Set auth in localStorage
    cy.window().then((win) => {
      win.localStorage.setItem(
        "sb-ocenwbkdzmxhsvwlornp-auth-token",
        JSON.stringify(mockSession)
      );
    });
  };

  describe("Quiz List", () => {
    it("displays available quizzes on student dashboard", () => {
      // Set up intercepts BEFORE visiting
      cy.intercept("GET", "**/rest/v1/quizzes*", {
        statusCode: 200,
        body: [
          {
            id: "quiz-1",
            title: "Chapter 1 Quiz",
            description: "Test your knowledge of Chapter 1",
            time_limit_minutes: 10,
            passing_score: 70,
            is_published: true,
            quiz_questions: [{ count: 5 }],
          },
          {
            id: "quiz-2",
            title: "Chapter 2 Quiz",
            description: "Test your knowledge of Chapter 2",
            time_limit_minutes: 15,
            passing_score: 80,
            is_published: true,
            quiz_questions: [{ count: 10 }],
          },
        ],
      }).as("getQuizzes");

      // Intercept other dashboard data
      cy.intercept("GET", "**/rest/v1/modules*", {
        statusCode: 200,
        body: [],
      }).as("getModules");

      cy.intercept("GET", "**/rest/v1/flashcards*", {
        statusCode: 200,
        body: [],
      }).as("getFlashcards");

      cy.intercept("GET", "**/rest/v1/quiz_attempts*", {
        statusCode: 200,
        body: [],
      }).as("getAttempts");

      cy.intercept("GET", "**/rest/v1/student_courses*", {
        statusCode: 200,
        body: [],
      }).as("getCourses");

      // Visit with auth already set
      const mockSession = {
        access_token: "mock-token",
        user: { id: "test-user-id", email: "test@example.com" },
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      };

      cy.intercept("GET", "**/rest/v1/profiles*", {
        statusCode: 200,
        body: [{ id: "test-user-id", role: "student", full_name: "Test Student" }],
      }).as("getProfile");

      cy.visit("/student", {
        onBeforeLoad(win) {
          win.localStorage.setItem(
            "sb-ocenwbkdzmxhsvwlornp-auth-token",
            JSON.stringify(mockSession)
          );
        },
      });

      // Check quizzes section exists
      cy.contains("Quizzes", { timeout: 10000 }).should("be.visible");
      cy.contains("Chapter 1 Quiz").should("be.visible");
    });

    it("navigates to quiz detail when clicking a quiz", () => {
      cy.intercept("GET", "**/rest/v1/quizzes*", {
        statusCode: 200,
        body: [
          {
            id: "quiz-1",
            title: "Chapter 1 Quiz",
            is_published: true,
            quiz_questions: [{ count: 5 }],
          },
        ],
      }).as("getQuizzes");

      cy.intercept("GET", "**/rest/v1/modules*", { statusCode: 200, body: [] });
      cy.intercept("GET", "**/rest/v1/flashcards*", { statusCode: 200, body: [] });
      cy.intercept("GET", "**/rest/v1/quiz_attempts*", { statusCode: 200, body: [] });
      cy.intercept("GET", "**/rest/v1/student_courses*", { statusCode: 200, body: [] });
      cy.intercept("GET", "**/rest/v1/profiles*", {
        statusCode: 200,
        body: [{ id: "test-user-id", role: "student" }],
      });

      const mockSession = {
        access_token: "mock-token",
        user: { id: "test-user-id", email: "test@example.com" },
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      };

      cy.visit("/student", {
        onBeforeLoad(win) {
          win.localStorage.setItem(
            "sb-ocenwbkdzmxhsvwlornp-auth-token",
            JSON.stringify(mockSession)
          );
        },
      });

      // Click on a quiz card
      cy.contains("Chapter 1 Quiz", { timeout: 10000 }).click();

      // Should navigate to quiz page
      cy.url().should("include", "/quiz/quiz-1");
    });
  });

  describe("Taking a Quiz", () => {
    const mockSession = {
      access_token: "mock-token",
      user: { id: "test-user-id", email: "test@example.com" },
      expires_at: Math.floor(Date.now() / 1000) + 3600,
    };

    const setupQuizIntercepts = () => {
      // Mock quiz with questions
      cy.intercept("GET", "**/rest/v1/quizzes?id=eq.quiz-1*", {
        statusCode: 200,
        body: [
          {
            id: "quiz-1",
            title: "Chapter 1 Quiz",
            description: "Test your knowledge",
            time_limit_minutes: 10,
            passing_score: 70,
            quiz_questions: [
              {
                id: "q1",
                question_text: "What is the retina?",
                question_type: "multiple_choice",
                options: ["A layer of the eye", "A bone", "A muscle", "A nerve"],
                correct_answer: "A layer of the eye",
                order_index: 1,
              },
              {
                id: "q2",
                question_text: "The retina contains photoreceptors.",
                question_type: "true_false",
                correct_answer: "true",
                order_index: 2,
              },
              {
                id: "q3",
                question_text: "Name the two types of photoreceptors.",
                question_type: "short_answer",
                correct_answer: "rods and cones",
                order_index: 3,
              },
            ],
          },
        ],
      }).as("getQuiz");

      cy.intercept("POST", "**/rest/v1/quiz_attempts*", {
        statusCode: 201,
        body: [{ id: "attempt-1" }],
      }).as("createAttempt");

      cy.intercept("POST", "**/rest/v1/quiz_answers*", {
        statusCode: 201,
        body: [],
      }).as("submitAnswers");

      cy.intercept("PATCH", "**/rest/v1/quiz_attempts*", {
        statusCode: 200,
        body: [],
      }).as("updateAttempt");

      cy.intercept("GET", "**/rest/v1/profiles*", {
        statusCode: 200,
        body: [{ id: "test-user-id", role: "student" }],
      });
    };

    it("displays quiz intro screen", () => {
      setupQuizIntercepts();

      cy.visit("/quiz/quiz-1", {
        onBeforeLoad(win) {
          win.localStorage.setItem(
            "sb-ocenwbkdzmxhsvwlornp-auth-token",
            JSON.stringify(mockSession)
          );
        },
      });

      cy.wait("@getQuiz");

      // Check intro screen elements
      cy.contains("Chapter 1 Quiz").should("be.visible");
      cy.contains("Start Quiz").should("be.visible");
      cy.contains("10 minutes").should("be.visible");
    });

    it("starts quiz and shows first question", () => {
      setupQuizIntercepts();

      cy.visit("/quiz/quiz-1", {
        onBeforeLoad(win) {
          win.localStorage.setItem(
            "sb-ocenwbkdzmxhsvwlornp-auth-token",
            JSON.stringify(mockSession)
          );
        },
      });

      cy.wait("@getQuiz");

      // Click start
      cy.contains("Start Quiz").click();
      cy.wait("@createAttempt");

      // First question should be visible
      cy.contains("What is the retina?").should("be.visible");
      cy.get('[data-testid="quiz-progress"]').should("be.visible");
    });

    it("allows answering multiple choice questions", () => {
      setupQuizIntercepts();

      cy.visit("/quiz/quiz-1", {
        onBeforeLoad(win) {
          win.localStorage.setItem(
            "sb-ocenwbkdzmxhsvwlornp-auth-token",
            JSON.stringify(mockSession)
          );
        },
      });

      cy.wait("@getQuiz");
      cy.contains("Start Quiz").click();
      cy.wait("@createAttempt");

      // Select an answer
      cy.contains("A layer of the eye").click();

      // Answer should be highlighted
      cy.contains("A layer of the eye")
        .parent()
        .should("have.class", "selected");
    });

    it("navigates between questions", () => {
      setupQuizIntercepts();

      cy.visit("/quiz/quiz-1", {
        onBeforeLoad(win) {
          win.localStorage.setItem(
            "sb-ocenwbkdzmxhsvwlornp-auth-token",
            JSON.stringify(mockSession)
          );
        },
      });

      cy.wait("@getQuiz");
      cy.contains("Start Quiz").click();
      cy.wait("@createAttempt");

      // Answer first question
      cy.contains("A layer of the eye").click();

      // Go to next question
      cy.contains("Next").click();

      // Second question should show
      cy.contains("The retina contains photoreceptors").should("be.visible");

      // Go back
      cy.contains("Previous").click();

      // First question should show again
      cy.contains("What is the retina?").should("be.visible");
    });

    it("shows timer countdown", () => {
      setupQuizIntercepts();

      cy.visit("/quiz/quiz-1", {
        onBeforeLoad(win) {
          win.localStorage.setItem(
            "sb-ocenwbkdzmxhsvwlornp-auth-token",
            JSON.stringify(mockSession)
          );
        },
      });

      cy.wait("@getQuiz");
      cy.contains("Start Quiz").click();
      cy.wait("@createAttempt");

      // Timer should be visible
      cy.get('[data-testid="quiz-timer"]').should("be.visible");
      cy.get('[data-testid="quiz-timer"]').should("contain", "10:00");
    });

    it("submits quiz and shows results", () => {
      setupQuizIntercepts();

      cy.visit("/quiz/quiz-1", {
        onBeforeLoad(win) {
          win.localStorage.setItem(
            "sb-ocenwbkdzmxhsvwlornp-auth-token",
            JSON.stringify(mockSession)
          );
        },
      });

      cy.wait("@getQuiz");
      cy.contains("Start Quiz").click();
      cy.wait("@createAttempt");

      // Answer questions
      cy.contains("A layer of the eye").click();
      cy.contains("Next").click();

      cy.contains("True").click();
      cy.contains("Next").click();

      cy.get('input[type="text"]').type("rods and cones");

      // Submit quiz
      cy.contains("Submit Quiz").click();

      // Confirm submission
      cy.contains("Confirm").click();

      cy.wait("@submitAnswers");
      cy.wait("@updateAttempt");

      // Results should show
      cy.get('[data-testid="quiz-results"]').should("be.visible");
      cy.contains("Quiz Complete").should("be.visible");
    });

    it("shows correct/incorrect feedback in review mode", () => {
      setupQuizIntercepts();

      cy.visit("/quiz/quiz-1", {
        onBeforeLoad(win) {
          win.localStorage.setItem(
            "sb-ocenwbkdzmxhsvwlornp-auth-token",
            JSON.stringify(mockSession)
          );
        },
      });

      cy.wait("@getQuiz");
      cy.contains("Start Quiz").click();
      cy.wait("@createAttempt");

      // Answer first question correctly
      cy.contains("A layer of the eye").click();
      cy.contains("Next").click();

      // Answer second question incorrectly
      cy.contains("False").click();
      cy.contains("Next").click();

      // Answer third question
      cy.get('input[type="text"]').type("rods and cones");

      // Submit
      cy.contains("Submit Quiz").click();
      cy.contains("Confirm").click();

      cy.wait("@submitAnswers");
      cy.wait("@updateAttempt");

      // Click review
      cy.contains("Review Answers").click();

      // Should show correct/incorrect indicators
      cy.get('[data-testid="answer-correct"]').should("exist");
      cy.get('[data-testid="answer-incorrect"]').should("exist");
    });
  });

  describe("Quiz History", () => {
    const mockSession = {
      access_token: "mock-token",
      user: { id: "test-user-id", email: "test@example.com" },
      expires_at: Math.floor(Date.now() / 1000) + 3600,
    };

    it("displays recent quiz attempts on dashboard", () => {
      cy.intercept("GET", "**/rest/v1/quiz_attempts*", {
        statusCode: 200,
        body: [
          {
            id: "attempt-1",
            quiz_id: "quiz-1",
            score: 80,
            passed: true,
            completed_at: new Date().toISOString(),
            quiz: { id: "quiz-1", title: "Chapter 1 Quiz" },
          },
          {
            id: "attempt-2",
            quiz_id: "quiz-1",
            score: 60,
            passed: false,
            completed_at: new Date(Date.now() - 86400000).toISOString(),
            quiz: { id: "quiz-1", title: "Chapter 1 Quiz" },
          },
        ],
      }).as("getAttempts");

      cy.intercept("GET", "**/rest/v1/quizzes*", { statusCode: 200, body: [] });
      cy.intercept("GET", "**/rest/v1/modules*", { statusCode: 200, body: [] });
      cy.intercept("GET", "**/rest/v1/flashcards*", { statusCode: 200, body: [] });
      cy.intercept("GET", "**/rest/v1/student_courses*", { statusCode: 200, body: [] });
      cy.intercept("GET", "**/rest/v1/profiles*", {
        statusCode: 200,
        body: [{ id: "test-user-id", role: "student" }],
      });

      cy.visit("/student", {
        onBeforeLoad(win) {
          win.localStorage.setItem(
            "sb-ocenwbkdzmxhsvwlornp-auth-token",
            JSON.stringify(mockSession)
          );
        },
      });

      // Check recent scores section
      cy.contains("Recent Quiz Scores", { timeout: 10000 }).should("be.visible");
      cy.contains("80%").should("be.visible");
    });

    it("shows best score on quiz card", () => {
      cy.intercept("GET", "**/rest/v1/quizzes*", {
        statusCode: 200,
        body: [
          {
            id: "quiz-1",
            title: "Chapter 1 Quiz",
            quiz_questions: [{ count: 5 }],
          },
        ],
      }).as("getQuizzes");

      cy.intercept("GET", "**/rest/v1/quiz_attempts*", {
        statusCode: 200,
        body: [
          { id: "attempt-1", quiz_id: "quiz-1", score: 80 },
          { id: "attempt-2", quiz_id: "quiz-1", score: 60 },
        ],
      }).as("getAttempts");

      cy.intercept("GET", "**/rest/v1/modules*", { statusCode: 200, body: [] });
      cy.intercept("GET", "**/rest/v1/flashcards*", { statusCode: 200, body: [] });
      cy.intercept("GET", "**/rest/v1/student_courses*", { statusCode: 200, body: [] });
      cy.intercept("GET", "**/rest/v1/profiles*", {
        statusCode: 200,
        body: [{ id: "test-user-id", role: "student" }],
      });

      cy.visit("/student", {
        onBeforeLoad(win) {
          win.localStorage.setItem(
            "sb-ocenwbkdzmxhsvwlornp-auth-token",
            JSON.stringify(mockSession)
          );
        },
      });

      // Best score should show on quiz card
      cy.contains("Best: 80%", { timeout: 10000 }).should("be.visible");
    });
  });
});
