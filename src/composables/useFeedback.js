/*
 * useFeedback — readers' feedback (OPENBRAIN-101).
 *
 * Stuart, 24 Sep: "Can we add a feedback option – where the student can
 * write feedback". One dialog (FeedbackDialog, mounted once in App.vue) that
 * any "Send feedback" entry opens with where it was sent from, so a creator
 * reads each message in context. Rows go to the `feedback` table
 * (20260926000000_feedback.sql); a reader can only write their own.
 */
import { ref } from "vue";
import { authedRequest } from "@/services/api/client";

export const FEEDBACK_KINDS = [
  { value: "general", label: "General" },
  { value: "content", label: "Text" },
  { value: "bug", label: "Bug" },
  { value: "idea", label: "Idea" },
];
export const FEEDBACK_MAX = 4000;

// Module scope: one dialog for the whole app.
const open = ref(false);
const context = ref({ moduleId: null, sectionId: null, label: "" });
// Where the reader is (the chapter ChapterView has open), used when an entry
// such as the account menu opens the dialog without saying.
const pageContext = ref(null);

/**
 * The row a message becomes. Exported for tests.
 * @returns {object|null} null when there is nothing to send
 */
export function feedbackRow({ kind, message, context: ctx, page }) {
  const text = String(message || "").trim();
  if (!text) return null;
  return {
    kind: FEEDBACK_KINDS.some((k) => k.value === kind) ? kind : "general",
    message: text.slice(0, FEEDBACK_MAX),
    module_id: ctx?.moduleId || null,
    section_id: ctx?.sectionId || null,
    page: page || null,
  };
}

export function useFeedback() {
  /** Open the dialog; `ctx` says where from ({ moduleId, sectionId, label }),
   *  else the page's context (setFeedbackContext). */
  function openFeedback(ctx = {}) {
    const base = pageContext.value || {};
    context.value = {
      moduleId: ctx.moduleId || base.moduleId || null,
      sectionId: ctx.sectionId || base.sectionId || null,
      label: ctx.label || base.label || "",
    };
    open.value = true;
  }
  /** The page says where the reader is (null when they leave). */
  function setFeedbackContext(ctx) {
    pageContext.value = ctx || null;
  }
  function closeFeedback() {
    open.value = false;
  }
  /** Send one message; throws on failure so the dialog can say so. */
  async function sendFeedback({ kind, message }) {
    const row = feedbackRow({
      kind,
      message,
      context: context.value,
      page:
        typeof window !== "undefined" ? window.location.pathname : undefined,
    });
    if (!row) throw new Error("Write something first.");
    await authedRequest("feedback", {
      method: "POST",
      body: JSON.stringify(row),
      headers: { Prefer: "return=minimal" },
    });
  }
  return {
    open,
    context,
    openFeedback,
    closeFeedback,
    sendFeedback,
    setFeedbackContext,
  };
}
