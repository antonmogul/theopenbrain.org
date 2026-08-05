export default {
  e2e: {
    baseUrl: "http://localhost:4173",
    specPattern: "cypress/e2e/**/*.cy.{js,jsx,ts,tsx}",
    supportFile: "cypress/support/e2e.js",
    viewportWidth: 1280,
    viewportHeight: 720,
    video: false,
    screenshotOnRunFailure: false,
  },
  // No component runner: cypress/component/ never existed and the scripts ran
  // zero tests while CLAUDE.md claimed component coverage — Vitest
  // (src/**/__tests__/) is the real unit layer (OPENBRAIN-9 §3).
};
