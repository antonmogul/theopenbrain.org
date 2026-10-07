/**
 * Display helpers for quiz stats in the creator dashboard (OPENBRAIN-51).
 */

const QUESTION_TYPE_LABELS = {
  multiple_choice: "Multiple choice",
  true_false: "True / false",
  short_answer: "Short answer",
};

/** "multiple_choice" → "Multiple choice"; unknown types are de-snaked. */
export function questionTypeLabel(type) {
  if (!type) return "Question";
  const key = String(type).toLowerCase();
  if (QUESTION_TYPE_LABELS[key]) return QUESTION_TYPE_LABELS[key];
  const words = key.replace(/_/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * A percentage only means something once someone has taken the quiz: with no
 * attempts, "0%" reads as a failing quiz, so show a dash instead.
 */
export function attemptPercent(value, attempts) {
  if (!attempts) return "—";
  return `${Math.round(Number(value) || 0)}%`;
}
