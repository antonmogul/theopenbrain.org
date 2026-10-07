// This build has no approved server-side AI integration. This is deliberately
// not an environment flag: a browser key or URL must never enable generation.
export const AI_TUTOR_AVAILABILITY = Object.freeze({
  available: false,
  code: "AI_TUTOR_UNAVAILABLE",
  message:
    "AI chat is unavailable in this build. A secure server connection is required. You can still view saved conversations.",
});
