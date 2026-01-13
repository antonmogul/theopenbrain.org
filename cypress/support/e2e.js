// Cypress E2E Support File
// This file is processed before each E2E test file

// Import commands
// import './commands'

// Prevent Cypress from failing on uncaught exceptions from the app
Cypress.on("uncaught:exception", (err, runnable) => {
  // Returning false here prevents Cypress from failing the test
  console.log("Uncaught exception:", err.message);
  return false;
});

// Custom command to mock Supabase auth
Cypress.Commands.add("mockAuth", (userData = {}) => {
  const defaultUser = {
    id: "test-user-id",
    email: "test@example.com",
    ...userData,
  };

  const mockSession = {
    access_token: "mock-token",
    user: defaultUser,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
  };

  cy.window().then((win) => {
    // Get the project ref from the environment or use a default
    const storageKey = "sb-mock-auth-token";
    win.localStorage.setItem(storageKey, JSON.stringify(mockSession));
  });
});

// Custom command to clear auth
Cypress.Commands.add("clearAuth", () => {
  cy.window().then((win) => {
    const keys = Object.keys(win.localStorage).filter((key) =>
      key.startsWith("sb-")
    );
    keys.forEach((key) => win.localStorage.removeItem(key));
  });
});
