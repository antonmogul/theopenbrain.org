// Flashcard E2E Tests
// These tests validate the flashcard study flow for students

describe("Flashcard Flow", () => {
  const mockSession = {
    access_token: "mock-token",
    user: { id: "test-user-id", email: "test@example.com" },
    expires_at: Math.floor(Date.now() / 1000) + 3600,
  };

  describe("Flashcard Deck List", () => {
    it("displays available flashcard decks on student dashboard", () => {
      // Set up intercepts BEFORE visiting
      cy.intercept("GET", "**/rest/v1/modules*", {
        statusCode: 200,
        body: [
          {
            id: "module-1",
            title: "The Retina",
            flashcards: [{ count: 20 }],
          },
          {
            id: "module-2",
            title: "Photoreceptors",
            flashcards: [{ count: 15 }],
          },
        ],
      }).as("getModules");

      cy.intercept("GET", "**/rest/v1/flashcards*", {
        statusCode: 200,
        body: [
          { id: "fc-1", module_id: "module-1" },
          { id: "fc-2", module_id: "module-1" },
          { id: "fc-3", module_id: "module-2" },
        ],
      }).as("getFlashcards");

      cy.intercept("GET", "**/rest/v1/flashcard_responses*", {
        statusCode: 200,
        body: [],
      }).as("getResponses");

      cy.intercept("GET", "**/rest/v1/quizzes*", { statusCode: 200, body: [] });
      cy.intercept("GET", "**/rest/v1/quiz_attempts*", { statusCode: 200, body: [] });
      cy.intercept("GET", "**/rest/v1/student_courses*", { statusCode: 200, body: [] });
      cy.intercept("GET", "**/rest/v1/profiles*", {
        statusCode: 200,
        body: [{ id: "test-user-id", role: "student", full_name: "Test Student" }],
      });

      cy.visit("/student", {
        onBeforeLoad(win) {
          win.localStorage.setItem(
            "sb-ocenwbkdzmxhsvwlornp-auth-token",
            JSON.stringify(mockSession)
          );
        },
      });

      // Check flashcards section exists
      cy.contains("Flashcards", { timeout: 10000 }).should("be.visible");
      cy.contains("The Retina").should("be.visible");
      cy.contains("20 cards").should("be.visible");
    });

    it("shows due cards count banner", () => {
      cy.intercept("GET", "**/rest/v1/modules*", {
        statusCode: 200,
        body: [{ id: "module-1", title: "The Retina", flashcards: [{ count: 20 }] }],
      });

      cy.intercept("GET", "**/rest/v1/flashcards*", {
        statusCode: 200,
        body: [
          { id: "fc-1", module_id: "module-1" },
          { id: "fc-2", module_id: "module-1" },
          { id: "fc-3", module_id: "module-1" },
        ],
      }).as("getFlashcards");

      cy.intercept("GET", "**/rest/v1/flashcard_responses*", {
        statusCode: 200,
        body: [],
      }).as("getResponses");

      cy.intercept("GET", "**/rest/v1/quizzes*", { statusCode: 200, body: [] });
      cy.intercept("GET", "**/rest/v1/quiz_attempts*", { statusCode: 200, body: [] });
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

      // Due cards banner should show (all cards are new/due)
      cy.contains("cards due for review", { timeout: 10000 }).should("be.visible");
    });

    it("navigates to flashcard study when clicking a deck", () => {
      cy.intercept("GET", "**/rest/v1/modules*", {
        statusCode: 200,
        body: [{ id: "module-1", title: "The Retina", flashcards: [{ count: 20 }] }],
      }).as("getModules");

      cy.intercept("GET", "**/rest/v1/flashcards*", { statusCode: 200, body: [] });
      cy.intercept("GET", "**/rest/v1/flashcard_responses*", { statusCode: 200, body: [] });
      cy.intercept("GET", "**/rest/v1/quizzes*", { statusCode: 200, body: [] });
      cy.intercept("GET", "**/rest/v1/quiz_attempts*", { statusCode: 200, body: [] });
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

      // Click on a deck
      cy.contains("The Retina", { timeout: 10000 }).click();

      // Should navigate to flashcard page
      cy.url().should("include", "/flashcards/module-1");
    });
  });

  describe("Studying Flashcards", () => {
    const setupFlashcardIntercepts = () => {
      cy.intercept("GET", "**/rest/v1/flashcards?module_id=eq.module-1*", {
        statusCode: 200,
        body: [
          {
            id: "fc-1",
            module_id: "module-1",
            front_content: "What is the retina?",
            back_content:
              "The retina is a light-sensitive layer of tissue at the back of the eye.",
          },
          {
            id: "fc-2",
            module_id: "module-1",
            front_content: "Name two types of photoreceptors",
            back_content: "Rods and Cones",
          },
          {
            id: "fc-3",
            module_id: "module-1",
            front_content: "What do rod cells detect?",
            back_content: "Rod cells detect light and dark, enabling night vision.",
          },
        ],
      }).as("getFlashcards");

      cy.intercept("GET", "**/rest/v1/flashcard_responses*", {
        statusCode: 200,
        body: [],
      }).as("getResponses");

      cy.intercept("POST", "**/rest/v1/flashcard_sessions*", {
        statusCode: 201,
        body: [{ id: "session-1" }],
      }).as("createSession");

      cy.intercept("POST", "**/rest/v1/flashcard_responses*", {
        statusCode: 201,
        body: [],
      }).as("recordResponse");

      cy.intercept("PATCH", "**/rest/v1/flashcard_sessions*", {
        statusCode: 200,
        body: [],
      }).as("updateSession");

      cy.intercept("GET", "**/rest/v1/profiles*", {
        statusCode: 200,
        body: [{ id: "test-user-id", role: "student" }],
      });
    };

    it("shows loading state then first card", () => {
      setupFlashcardIntercepts();

      cy.visit("/flashcards/module-1", {
        onBeforeLoad(win) {
          win.localStorage.setItem(
            "sb-ocenwbkdzmxhsvwlornp-auth-token",
            JSON.stringify(mockSession)
          );
        },
      });

      // Loading should appear
      cy.contains("Loading flashcards").should("be.visible");

      cy.wait("@getFlashcards");
      cy.wait("@createSession");

      // First card question should show
      cy.contains("What is the retina?").should("be.visible");
      cy.contains("1 / 3").should("be.visible");
    });

    it("flips card on click", () => {
      setupFlashcardIntercepts();

      cy.visit("/flashcards/module-1", {
        onBeforeLoad(win) {
          win.localStorage.setItem(
            "sb-ocenwbkdzmxhsvwlornp-auth-token",
            JSON.stringify(mockSession)
          );
        },
      });

      cy.wait("@getFlashcards");
      cy.wait("@createSession");

      // Front should show
      cy.contains("What is the retina?").should("be.visible");
      cy.contains("Question").should("be.visible");

      // Click to flip
      cy.get('[data-testid="flashcard-card"]').click();

      // Back should show
      cy.contains("light-sensitive layer").should("be.visible");
      cy.contains("Answer").should("be.visible");
    });

    it("flips card with spacebar", () => {
      setupFlashcardIntercepts();

      cy.visit("/flashcards/module-1", {
        onBeforeLoad(win) {
          win.localStorage.setItem(
            "sb-ocenwbkdzmxhsvwlornp-auth-token",
            JSON.stringify(mockSession)
          );
        },
      });

      cy.wait("@getFlashcards");
      cy.wait("@createSession");

      // Press spacebar to flip
      cy.get("body").type(" ");

      // Back should show
      cy.contains("Answer").should("be.visible");
    });

    it("shows rating buttons after flip", () => {
      setupFlashcardIntercepts();

      cy.visit("/flashcards/module-1", {
        onBeforeLoad(win) {
          win.localStorage.setItem(
            "sb-ocenwbkdzmxhsvwlornp-auth-token",
            JSON.stringify(mockSession)
          );
        },
      });

      cy.wait("@getFlashcards");
      cy.wait("@createSession");

      // Flip card
      cy.get('[data-testid="flashcard-card"]').click();

      // Rating buttons should appear
      cy.get('[data-testid="flashcard-rating"]').should("be.visible");
      cy.contains("Again").should("be.visible");
      cy.contains("Hard").should("be.visible");
      cy.contains("Good").should("be.visible");
      cy.contains("Easy").should("be.visible");
    });

    it("rates card and moves to next", () => {
      setupFlashcardIntercepts();

      cy.visit("/flashcards/module-1", {
        onBeforeLoad(win) {
          win.localStorage.setItem(
            "sb-ocenwbkdzmxhsvwlornp-auth-token",
            JSON.stringify(mockSession)
          );
        },
      });

      cy.wait("@getFlashcards");
      cy.wait("@createSession");

      // Flip and rate
      cy.get('[data-testid="flashcard-card"]').click();
      cy.get('[data-testid="rate-3"]').click(); // Good rating

      cy.wait("@recordResponse");

      // Should move to next card
      cy.contains("Name two types of photoreceptors").should("be.visible");
      cy.contains("2 / 3").should("be.visible");
    });

    it("allows rating with keyboard shortcuts (1-4)", () => {
      setupFlashcardIntercepts();

      cy.visit("/flashcards/module-1", {
        onBeforeLoad(win) {
          win.localStorage.setItem(
            "sb-ocenwbkdzmxhsvwlornp-auth-token",
            JSON.stringify(mockSession)
          );
        },
      });

      cy.wait("@getFlashcards");
      cy.wait("@createSession");

      // Flip card
      cy.get("body").type(" ");

      // Rate with keyboard (3 = Good)
      cy.get("body").type("3");

      cy.wait("@recordResponse");

      // Should move to next card
      cy.contains("2 / 3").should("be.visible");
    });

    it("skips card when clicking skip button", () => {
      setupFlashcardIntercepts();

      cy.visit("/flashcards/module-1", {
        onBeforeLoad(win) {
          win.localStorage.setItem(
            "sb-ocenwbkdzmxhsvwlornp-auth-token",
            JSON.stringify(mockSession)
          );
        },
      });

      cy.wait("@getFlashcards");
      cy.wait("@createSession");

      // Flip card
      cy.get('[data-testid="flashcard-card"]').click();

      // Click skip
      cy.get('[data-testid="skip-card"]').click();

      // Should move to next card
      cy.contains("2 / 3").should("be.visible");
    });

    it("shows session complete screen after all cards", () => {
      setupFlashcardIntercepts();

      cy.visit("/flashcards/module-1", {
        onBeforeLoad(win) {
          win.localStorage.setItem(
            "sb-ocenwbkdzmxhsvwlornp-auth-token",
            JSON.stringify(mockSession)
          );
        },
      });

      cy.wait("@getFlashcards");
      cy.wait("@createSession");

      // Rate all 3 cards
      for (let i = 0; i < 3; i++) {
        cy.get('[data-testid="flashcard-card"]').click();
        cy.get('[data-testid="rate-3"]').click();
        if (i < 2) {
          cy.wait("@recordResponse");
        }
      }

      cy.wait("@updateSession");

      // Session complete screen should show
      cy.get('[data-testid="flashcard-stats"]').should("be.visible");
      cy.contains("Session Complete").should("be.visible");
    });

    it("displays session stats correctly", () => {
      setupFlashcardIntercepts();

      cy.visit("/flashcards/module-1", {
        onBeforeLoad(win) {
          win.localStorage.setItem(
            "sb-ocenwbkdzmxhsvwlornp-auth-token",
            JSON.stringify(mockSession)
          );
        },
      });

      cy.wait("@getFlashcards");
      cy.wait("@createSession");

      // Rate cards with different ratings
      cy.get('[data-testid="flashcard-card"]').click();
      cy.get('[data-testid="rate-3"]').click(); // Good (correct)
      cy.wait("@recordResponse");

      cy.get('[data-testid="flashcard-card"]').click();
      cy.get('[data-testid="rate-1"]').click(); // Again (incorrect)
      cy.wait("@recordResponse");

      cy.get('[data-testid="flashcard-card"]').click();
      cy.get('[data-testid="rate-4"]').click(); // Easy (correct)

      cy.wait("@updateSession");

      // Stats should show
      cy.contains("2").should("be.visible"); // Correct count
      cy.contains("1").should("be.visible"); // Incorrect count
      cy.contains("67%").should("be.visible"); // Accuracy
    });

    it("allows study again from complete screen", () => {
      setupFlashcardIntercepts();

      cy.visit("/flashcards/module-1", {
        onBeforeLoad(win) {
          win.localStorage.setItem(
            "sb-ocenwbkdzmxhsvwlornp-auth-token",
            JSON.stringify(mockSession)
          );
        },
      });

      cy.wait("@getFlashcards");
      cy.wait("@createSession");

      // Complete session quickly
      for (let i = 0; i < 3; i++) {
        cy.get('[data-testid="flashcard-card"]').click();
        cy.get('[data-testid="rate-4"]').click();
        if (i < 2) {
          cy.wait("@recordResponse");
        }
      }

      cy.wait("@updateSession");

      // Click study again
      cy.get('[data-testid="study-again"]').click();

      cy.wait("@createSession");

      // Should show first card again
      cy.contains("1 / 3").should("be.visible");
    });

    it("returns to dashboard from complete screen", () => {
      setupFlashcardIntercepts();

      cy.visit("/flashcards/module-1", {
        onBeforeLoad(win) {
          win.localStorage.setItem(
            "sb-ocenwbkdzmxhsvwlornp-auth-token",
            JSON.stringify(mockSession)
          );
        },
      });

      cy.wait("@getFlashcards");
      cy.wait("@createSession");

      // Complete session
      for (let i = 0; i < 3; i++) {
        cy.get('[data-testid="flashcard-card"]').click();
        cy.get('[data-testid="rate-3"]').click();
        if (i < 2) {
          cy.wait("@recordResponse");
        }
      }

      cy.wait("@updateSession");

      // Click continue learning
      cy.get('[data-testid="continue-learning"]').click();

      // Should navigate to student dashboard
      cy.url().should("include", "/student");
    });
  });

  describe("Exit During Session", () => {
    const setupExitIntercepts = () => {
      cy.intercept("GET", "**/rest/v1/flashcards?module_id=eq.module-1*", {
        statusCode: 200,
        body: [
          {
            id: "fc-1",
            front_content: "Question 1",
            back_content: "Answer 1",
          },
          {
            id: "fc-2",
            front_content: "Question 2",
            back_content: "Answer 2",
          },
        ],
      }).as("getFlashcards");

      cy.intercept("GET", "**/rest/v1/flashcard_responses*", {
        statusCode: 200,
        body: [],
      }).as("getResponses");

      cy.intercept("POST", "**/rest/v1/flashcard_sessions*", {
        statusCode: 201,
        body: [{ id: "session-1" }],
      }).as("createSession");

      cy.intercept("PATCH", "**/rest/v1/flashcard_sessions*", {
        statusCode: 200,
        body: [],
      }).as("updateSession");

      cy.intercept("GET", "**/rest/v1/profiles*", {
        statusCode: 200,
        body: [{ id: "test-user-id", role: "student" }],
      });
    };

    it("shows confirmation modal when exiting mid-session", () => {
      setupExitIntercepts();

      cy.visit("/flashcards/module-1", {
        onBeforeLoad(win) {
          win.localStorage.setItem(
            "sb-ocenwbkdzmxhsvwlornp-auth-token",
            JSON.stringify(mockSession)
          );
        },
      });

      cy.wait("@getFlashcards");
      cy.wait("@createSession");

      // Click exit button
      cy.get(".exit-btn").click();

      // Confirmation modal should appear
      cy.contains("End Study Session?").should("be.visible");
      cy.contains("Your progress will be saved").should("be.visible");
    });

    it("continues session when canceling exit", () => {
      setupExitIntercepts();

      cy.visit("/flashcards/module-1", {
        onBeforeLoad(win) {
          win.localStorage.setItem(
            "sb-ocenwbkdzmxhsvwlornp-auth-token",
            JSON.stringify(mockSession)
          );
        },
      });

      cy.wait("@getFlashcards");
      cy.wait("@createSession");

      cy.get(".exit-btn").click();

      // Click continue studying
      cy.contains("Continue Studying").click();

      // Modal should close, still on flashcards
      cy.contains("End Study Session?").should("not.exist");
      cy.contains("Question 1").should("be.visible");
    });

    it("saves session and exits when confirming", () => {
      setupExitIntercepts();

      cy.visit("/flashcards/module-1", {
        onBeforeLoad(win) {
          win.localStorage.setItem(
            "sb-ocenwbkdzmxhsvwlornp-auth-token",
            JSON.stringify(mockSession)
          );
        },
      });

      cy.wait("@getFlashcards");
      cy.wait("@createSession");

      cy.get(".exit-btn").click();

      // Click end session
      cy.contains("End Session").click();

      cy.wait("@updateSession");

      // Should navigate to student dashboard
      cy.url().should("include", "/student");
    });
  });

  describe("Empty State", () => {
    it("shows empty state when no flashcards exist", () => {
      cy.intercept("GET", "**/rest/v1/flashcards?module_id=eq.module-empty*", {
        statusCode: 200,
        body: [],
      }).as("getEmptyFlashcards");

      cy.intercept("POST", "**/rest/v1/flashcard_sessions*", {
        statusCode: 201,
        body: [{ id: "session-1" }],
      }).as("createSession");

      cy.intercept("GET", "**/rest/v1/profiles*", {
        statusCode: 200,
        body: [{ id: "test-user-id", role: "student" }],
      });

      cy.visit("/flashcards/module-empty", {
        onBeforeLoad(win) {
          win.localStorage.setItem(
            "sb-ocenwbkdzmxhsvwlornp-auth-token",
            JSON.stringify(mockSession)
          );
        },
      });

      cy.wait("@getEmptyFlashcards");

      // Empty state should show
      cy.contains("No Flashcards Available").should("be.visible");
      cy.contains("Go Back").should("be.visible");
    });
  });

  describe("Session Stats Display", () => {
    const setupStatsIntercepts = () => {
      cy.intercept("GET", "**/rest/v1/flashcards?module_id=eq.module-1*", {
        statusCode: 200,
        body: [
          { id: "fc-1", front_content: "Q1", back_content: "A1" },
        ],
      }).as("getFlashcards");

      cy.intercept("GET", "**/rest/v1/flashcard_responses*", {
        statusCode: 200,
        body: [],
      }).as("getResponses");

      cy.intercept("POST", "**/rest/v1/flashcard_sessions*", {
        statusCode: 201,
        body: [{ id: "session-1" }],
      }).as("createSession");

      cy.intercept("POST", "**/rest/v1/flashcard_responses*", {
        statusCode: 201,
        body: [],
      }).as("recordResponse");

      cy.intercept("PATCH", "**/rest/v1/flashcard_sessions*", {
        statusCode: 200,
        body: [],
      }).as("updateSession");

      cy.intercept("GET", "**/rest/v1/profiles*", {
        statusCode: 200,
        body: [{ id: "test-user-id", role: "student" }],
      });
    };

    it("displays timer during session", () => {
      setupStatsIntercepts();

      cy.visit("/flashcards/module-1", {
        onBeforeLoad(win) {
          win.localStorage.setItem(
            "sb-ocenwbkdzmxhsvwlornp-auth-token",
            JSON.stringify(mockSession)
          );
        },
      });

      cy.wait("@getFlashcards");
      cy.wait("@createSession");

      // Timer should show
      cy.get(".session-timer").should("be.visible");
      cy.get(".session-timer").should("contain", "0:0");
    });

    it("tracks correct/incorrect counts during session", () => {
      setupStatsIntercepts();

      cy.visit("/flashcards/module-1", {
        onBeforeLoad(win) {
          win.localStorage.setItem(
            "sb-ocenwbkdzmxhsvwlornp-auth-token",
            JSON.stringify(mockSession)
          );
        },
      });

      cy.wait("@getFlashcards");
      cy.wait("@createSession");

      // Initial stats should be 0/0
      cy.get(".stat.correct").should("contain", "0");
      cy.get(".stat.incorrect").should("contain", "0");

      // Rate as good (correct)
      cy.get('[data-testid="flashcard-card"]').click();
      cy.get('[data-testid="rate-3"]').click();

      cy.wait("@updateSession");

      // Stats should update
      cy.get('[data-testid="flashcard-stats"]').should("be.visible");
    });
  });
});
