// Screens and panels hidden for the closed beta (OPENBRAIN-50). Each one either
// shows a feature that isn't built yet or contradicts the real state of the
// book, so a tester would trust something that isn't true. The components stay;
// only the entry points are hidden. Set VITE_SHOW_UNFINISHED=1 to see them all.
export const SHOW_UNFINISHED = import.meta.env.VITE_SHOW_UNFINISHED === "1";

const HIDDEN = new Set([
  // v1.0 holds every chapter but reads "Draft"; the empty seed versions read "Published".
  "dashboard.versions",
  // Nothing in the app writes analytics_events, so every number is zero.
  "dashboard.analytics",
  // Presentational toggles with no backend.
  "settings.notifications",
  "settings.data",
  "settings.account-extras",
]);

export function isBetaHidden(key) {
  return !SHOW_UNFINISHED && HIDDEN.has(key);
}
