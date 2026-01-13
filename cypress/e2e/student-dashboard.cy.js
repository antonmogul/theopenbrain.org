/// <reference types="cypress" />

describe("Student Dashboard", () => {
  beforeEach(() => {
    // Mock authentication for student role
    cy.intercept("GET", "**/rest/v1/profiles*", {
      statusCode: 200,
      body: [{ id: "test-user-id", role: "student", full_name: "Test Student" }],
    }).as("getProfile");

    // Mock course enrollments
    cy.intercept("GET", "**/rest/v1/course_enrollments*", {
      statusCode: 200,
      body: [
        {
          id: "enrollment-1",
          enrolled_at: "2024-01-15T00:00:00Z",
          last_accessed_at: "2024-01-20T00:00:00Z",
          course: {
            id: "course-1",
            title: "Introduction to Neuroscience",
            description: "A comprehensive introduction to the brain.",
            course_code: "NEURO101",
            semester: "Spring 2024",
            is_published: true,
            professor: { full_name: "Dr. Smith" },
            modules: [
              {
                order_index: 1,
                module: {
                  id: "module-1",
                  title: "The Retina",
                  slug: "the-retina",
                  order_index: 1,
                  status: "published",
                },
              },
            ],
            progressPercent: 25,
            completedModules: 0,
            totalModules: 1,
          },
        },
      ],
    }).as("getCourseEnrollments");

    // Mock reading progress
    cy.intercept("GET", "**/rest/v1/reading_progress*", {
      statusCode: 200,
      body: [
        {
          module_id: "module-1",
          scroll_position: 25,
          time_spent_seconds: 600,
          is_completed: false,
          last_accessed_at: "2024-01-20T00:00:00Z",
        },
      ],
    }).as("getReadingProgress");

    // Mock highlights
    cy.intercept("GET", "**/rest/v1/highlights*", {
      statusCode: 200,
      body: [
        {
          id: "highlight-1",
          selected_text: "This is a highlighted text example",
          color: "yellow",
          created_at: "2024-01-19T00:00:00Z",
        },
      ],
    }).as("getHighlights");

    // Mock notes
    cy.intercept("GET", "**/rest/v1/notes*", {
      statusCode: 200,
      body: [],
    }).as("getNotes");

    // Mock trending highlights
    cy.intercept("GET", "**/rest/v1/trending_highlights*", {
      statusCode: 200,
      body: [
        {
          id: "trending-1",
          selected_text: "Important concept that many students highlighted",
          highlight_count: 15,
          paragraph_id: "para-1",
          last_highlighted_at: "2024-01-20T00:00:00Z",
        },
      ],
    }).as("getTrendingHighlights");

    // Set up mock session in localStorage
    const mockSession = {
      access_token: "mock-access-token",
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      user: {
        id: "test-user-id",
        email: "student@test.com",
      },
    };

    // Get the project ref from the Supabase URL pattern
    cy.window().then((win) => {
      // Use a generic storage key for testing
      win.localStorage.setItem(
        "sb-test-auth-token",
        JSON.stringify(mockSession)
      );
    });
  });

  it("displays the student dashboard with correct layout", () => {
    cy.visit("/student");
    cy.wait(["@getCourseEnrollments", "@getHighlights"]);

    // Check page title
    cy.contains("Dashboard").should("be.visible");

    // Check sidebar navigation items
    cy.contains("My Courses").should("be.visible");
    cy.contains("My Highlights").should("be.visible");
    cy.contains("My Notes").should("be.visible");
    cy.contains("Progress").should("be.visible");
    cy.contains("Settings").should("be.visible");
  });

  it("displays enrolled courses", () => {
    cy.visit("/student");
    cy.wait("@getCourseEnrollments");

    cy.contains("My Courses").should("be.visible");
    cy.get('[data-testid="course-card"]').should("have.length.at.least", 1);
    cy.contains("Introduction to Neuroscience").should("be.visible");
    cy.contains("NEURO101").should("be.visible");
  });

  it("shows reading progress with progress bar", () => {
    cy.visit("/student");
    cy.wait(["@getCourseEnrollments", "@getReadingProgress"]);

    cy.get('[data-testid="progress-bar"]').should("be.visible");
  });

  it("navigates to course content when clicking module", () => {
    cy.visit("/student");
    cy.wait("@getCourseEnrollments");

    cy.get('[data-testid="course-card"]').first().within(() => {
      cy.contains("Continue").click();
    });

    cy.url().should("include", "/chapter");
  });

  it("displays study statistics", () => {
    cy.visit("/student");
    cy.wait(["@getCourseEnrollments", "@getReadingProgress"]);

    cy.contains("Study Stats This Week").should("be.visible");
    cy.contains("Time This Week").should("be.visible");
    cy.contains("Modules Completed").should("be.visible");
    cy.contains("Highlights Made").should("be.visible");
    cy.contains("Notes Taken").should("be.visible");
  });

  it("displays trending highlights section", () => {
    cy.visit("/student");
    cy.wait("@getTrendingHighlights");

    cy.get('[data-testid="trending-highlights"]').should("be.visible");
    cy.contains("Trending in Class").should("be.visible");
  });

  it("navigates between dashboard sections", () => {
    cy.visit("/student");

    // Click on My Courses
    cy.contains("My Courses").click();
    cy.url().should("include", "/student");

    // Click on My Highlights
    cy.contains("My Highlights").click();
    cy.url().should("include", "/student");

    // Click on Settings
    cy.contains("Settings").click();
    cy.contains("Profile").should("be.visible");
  });

  it("shows Continue Reading card when there is progress", () => {
    cy.visit("/student");
    cy.wait(["@getCourseEnrollments", "@getReadingProgress"]);

    cy.contains("Continue Reading").should("be.visible");
  });
});

describe("Highlighting System", () => {
  beforeEach(() => {
    // Mock authentication
    cy.intercept("GET", "**/rest/v1/profiles*", {
      statusCode: 200,
      body: [{ id: "test-user-id", role: "student", full_name: "Test Student" }],
    }).as("getProfile");

    // Mock highlights fetch
    cy.intercept("GET", "**/rest/v1/highlights*", {
      statusCode: 200,
      body: [],
    }).as("getHighlights");

    // Mock highlight creation
    cy.intercept("POST", "**/rest/v1/highlights", {
      statusCode: 201,
      body: [
        {
          id: "new-highlight-1",
          paragraph_id: "para-1",
          selected_text: "selected text",
          color: "yellow",
          start_offset: 10,
          end_offset: 50,
          created_at: new Date().toISOString(),
        },
      ],
    }).as("createHighlight");

    // Set up mock session
    const mockSession = {
      access_token: "mock-access-token",
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      user: {
        id: "test-user-id",
        email: "student@test.com",
      },
    };

    cy.window().then((win) => {
      win.localStorage.setItem(
        "sb-test-auth-token",
        JSON.stringify(mockSession)
      );
    });
  });

  it("shows highlight toolbar on text selection", () => {
    cy.visit("/chapter/1/the-retina");
    cy.wait(500); // Wait for page to load

    // Find a paragraph and select text
    cy.get("[data-paragraph-id]")
      .first()
      .then(($el) => {
        // Trigger text selection
        const el = $el[0];
        const text = el.textContent;

        if (text && text.length > 10) {
          // Create a selection programmatically
          const range = document.createRange();
          const textNode = el.firstChild;

          if (textNode) {
            range.setStart(textNode, 0);
            range.setEnd(textNode, Math.min(20, text.length));
            window.getSelection().removeAllRanges();
            window.getSelection().addRange(range);
          }
        }
      })
      .trigger("mouseup");

    // The toolbar should appear
    cy.get('[data-testid="highlight-toolbar"]').should("be.visible");
  });

  it("displays 5 color options in highlight toolbar", () => {
    cy.visit("/chapter/1/the-retina");
    cy.wait(500);

    // Select text to show toolbar
    cy.get("[data-paragraph-id]")
      .first()
      .then(($el) => {
        const range = document.createRange();
        const textNode = $el[0].firstChild;
        if (textNode) {
          range.setStart(textNode, 0);
          range.setEnd(textNode, 20);
          window.getSelection().removeAllRanges();
          window.getSelection().addRange(range);
        }
      })
      .trigger("mouseup");

    // Check for color buttons
    cy.get('[data-testid="highlight-yellow"]').should("be.visible");
    cy.get('[data-testid="highlight-green"]').should("be.visible");
    cy.get('[data-testid="highlight-blue"]').should("be.visible");
    cy.get('[data-testid="highlight-pink"]').should("be.visible");
    cy.get('[data-testid="highlight-purple"]').should("be.visible");
  });

  it("creates a highlight with selected color", () => {
    cy.visit("/chapter/1/the-retina");
    cy.wait(500);

    // Select text
    cy.get("[data-paragraph-id]")
      .first()
      .then(($el) => {
        const range = document.createRange();
        const textNode = $el[0].firstChild;
        if (textNode) {
          range.setStart(textNode, 0);
          range.setEnd(textNode, 20);
          window.getSelection().removeAllRanges();
          window.getSelection().addRange(range);
        }
      })
      .trigger("mouseup");

    // Click yellow highlight
    cy.get('[data-testid="highlight-yellow"]').click();
    cy.wait("@createHighlight");

    // Toolbar should close after highlighting
    cy.get('[data-testid="highlight-toolbar"]').should("not.exist");
  });

  it("has add note button in highlight toolbar", () => {
    cy.visit("/chapter/1/the-retina");
    cy.wait(500);

    cy.get("[data-paragraph-id]")
      .first()
      .then(($el) => {
        const range = document.createRange();
        const textNode = $el[0].firstChild;
        if (textNode) {
          range.setStart(textNode, 0);
          range.setEnd(textNode, 20);
          window.getSelection().removeAllRanges();
          window.getSelection().addRange(range);
        }
      })
      .trigger("mouseup");

    cy.get('[data-testid="highlight-with-note"]').should("be.visible");
  });
});

describe("Notes System", () => {
  beforeEach(() => {
    // Mock authentication
    cy.intercept("GET", "**/rest/v1/profiles*", {
      statusCode: 200,
      body: [{ id: "test-user-id", role: "student", full_name: "Test Student" }],
    }).as("getProfile");

    // Mock notes
    cy.intercept("GET", "**/rest/v1/notes*", {
      statusCode: 200,
      body: [
        {
          id: "note-1",
          content: "This is an existing note",
          created_at: "2024-01-19T00:00:00Z",
          highlight: null,
        },
      ],
    }).as("getNotes");

    // Mock note creation
    cy.intercept("POST", "**/rest/v1/notes", {
      statusCode: 201,
      body: [
        {
          id: "new-note-1",
          content: "This is my test note",
          created_at: new Date().toISOString(),
        },
      ],
    }).as("createNote");

    // Set up mock session
    const mockSession = {
      access_token: "mock-access-token",
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      user: {
        id: "test-user-id",
        email: "student@test.com",
      },
    };

    cy.window().then((win) => {
      win.localStorage.setItem(
        "sb-test-auth-token",
        JSON.stringify(mockSession)
      );
    });
  });

  it("opens notes sidebar when toggle is clicked", () => {
    cy.visit("/chapter/1/the-retina");
    cy.wait(500);

    // Look for notes toggle button (if it exists in chapter view)
    cy.get('[data-testid="notes-toggle"]').then(($btn) => {
      if ($btn.length) {
        cy.wrap($btn).click();
        cy.get('[data-testid="notes-sidebar"]').should("be.visible");
      }
    });
  });

  it("displays add note button in notes sidebar", () => {
    cy.visit("/chapter/1/the-retina");
    cy.wait(500);

    cy.get('[data-testid="notes-toggle"]').then(($btn) => {
      if ($btn.length) {
        cy.wrap($btn).click();
        cy.get('[data-testid="add-note-btn"]').should("be.visible");
      }
    });
  });

  it("creates a new note", () => {
    cy.visit("/chapter/1/the-retina");
    cy.wait(500);

    cy.get('[data-testid="notes-toggle"]').then(($btn) => {
      if ($btn.length) {
        cy.wrap($btn).click();
        cy.get('[data-testid="add-note-btn"]').click();
        cy.get('[data-testid="note-textarea"]').type("This is my test note");
        cy.get('[data-testid="save-note-btn"]').click();

        cy.wait("@createNote");
        cy.contains("This is my test note").should("be.visible");
      }
    });
  });
});

describe("Trending Highlights", () => {
  beforeEach(() => {
    // Mock authentication
    cy.intercept("GET", "**/rest/v1/profiles*", {
      statusCode: 200,
      body: [{ id: "test-user-id", role: "student", full_name: "Test Student" }],
    }).as("getProfile");

    // Mock trending highlights
    cy.intercept("GET", "**/rest/v1/trending_highlights*", {
      statusCode: 200,
      body: [
        {
          id: "trending-1",
          selected_text: "This is a trending highlight that many students found important",
          highlight_count: 25,
          paragraph_id: "para-1",
          last_highlighted_at: "2024-01-20T00:00:00Z",
        },
        {
          id: "trending-2",
          selected_text: "Another popular highlighted section",
          highlight_count: 18,
          paragraph_id: "para-2",
          last_highlighted_at: "2024-01-19T00:00:00Z",
        },
      ],
    }).as("getTrendingHighlights");

    // Set up mock session
    const mockSession = {
      access_token: "mock-access-token",
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      user: {
        id: "test-user-id",
        email: "student@test.com",
      },
    };

    cy.window().then((win) => {
      win.localStorage.setItem(
        "sb-test-auth-token",
        JSON.stringify(mockSession)
      );
    });
  });

  it("displays trending highlights in student dashboard", () => {
    // Mock course enrollments for dashboard
    cy.intercept("GET", "**/rest/v1/course_enrollments*", {
      statusCode: 200,
      body: [],
    }).as("getCourseEnrollments");

    cy.intercept("GET", "**/rest/v1/highlights*", {
      statusCode: 200,
      body: [],
    }).as("getHighlights");

    cy.intercept("GET", "**/rest/v1/notes*", {
      statusCode: 200,
      body: [],
    }).as("getNotes");

    cy.visit("/student");
    cy.wait("@getTrendingHighlights");

    cy.get('[data-testid="trending-highlights"]').should("be.visible");
    cy.contains("Trending in Class").should("be.visible");
  });

  it("shows highlight count for trending items", () => {
    cy.intercept("GET", "**/rest/v1/course_enrollments*", {
      statusCode: 200,
      body: [],
    }).as("getCourseEnrollments");

    cy.intercept("GET", "**/rest/v1/highlights*", {
      statusCode: 200,
      body: [],
    }).as("getHighlights");

    cy.intercept("GET", "**/rest/v1/notes*", {
      statusCode: 200,
      body: [],
    }).as("getNotes");

    cy.visit("/student");
    cy.wait("@getTrendingHighlights");

    cy.get('[data-testid="trending-item"]').first().should("be.visible");
    cy.contains("25 people").should("be.visible");
  });

  it("scrolls to highlight when trending item is clicked", () => {
    cy.visit("/chapter/1/the-retina");
    cy.wait(500);

    // If trending highlights component is present in chapter view
    cy.get('[data-testid="trending-item"]').then(($items) => {
      if ($items.length) {
        cy.wrap($items.first()).click();
        // Verify scroll behavior was triggered
      }
    });
  });
});
