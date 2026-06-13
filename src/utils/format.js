/**
 * Date/time formatting helpers.
 *
 * These consolidate the several `formatDate` copies that were scattered across
 * views and components. They are intentionally SEPARATE functions, not one
 * "smart" formatter — the call sites genuinely wanted different output (terse
 * vs verbose relative time, chat timestamps, absolute dates). Each call site
 * picks the variant that matches what it already rendered, so no displayed
 * string changes.
 */

const MIN = 60000;
const HOUR = 3600000;
const DAY = 86400000;
const WEEK = 604800000;

/**
 * Terse relative time: "just now" / "5m ago" / "3h ago" / "2d ago", then a
 * locale date past a week. (StudentDashboardView's formatRelativeDate.)
 */
export function relativeShort(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / MIN);
  const hours = Math.floor(diff / HOUR);
  const days = Math.floor(diff / DAY);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

/**
 * Verbose relative time: "Never" (no date) / "Just now" / "5 min ago" /
 * "3 hours ago" / "Yesterday", then "Mon 5" (+ year if not current).
 * (DashboardView + ProfessorDashboardView's formatDate.)
 */
export function relativeLong(dateString) {
  if (!dateString) return "Never";
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  if (diff < MIN) return "Just now";
  if (diff < HOUR) return `${Math.floor(diff / MIN)} min ago`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)} hours ago`;
  if (diff < 2 * DAY) return "Yesterday";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

/**
 * Chat-style timestamp: time-of-day if <24h, weekday if <7d, else "Mon 5".
 * (ChatTab + AITutorSidebar's formatDate.)
 */
export function chatTimestamp(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const diff = Date.now() - date.getTime();
  if (diff < DAY) {
    return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }
  if (diff < WEEK) {
    return date.toLocaleDateString("en-US", { weekday: "short" });
  }
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Absolute short date: "Mon 5". Optionally with year. (FlashcardDeck;
 * CourseCard passes withYear=true.)
 */
export function shortDate(dateString, { withYear = false } = {}) {
  if (!dateString) return "";
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(withYear ? { year: "numeric" } : {}),
  });
}

/**
 * Absolute date + time: "Mon 5, 3:04 PM". (NotebookTab's formatDate.)
 */
export function dateTime(dateString) {
  if (!dateString) return "";
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
