import { describe, expect, it } from "vitest";
import { FEEDBACK_MAX, feedbackRow, useFeedback } from "../useFeedback.js";

// Readers' feedback rows (OPENBRAIN-101).
describe("feedbackRow", () => {
  const context = { moduleId: "m1", sectionId: "s1" };

  it("sends the message with where it came from", () => {
    expect(
      feedbackRow({
        kind: "content",
        message: "  Typo in figure 3 ",
        context,
        page: "/chapter/1/x",
      })
    ).toEqual({
      kind: "content",
      message: "Typo in figure 3",
      module_id: "m1",
      section_id: "s1",
      page: "/chapter/1/x",
    });
  });

  it("sends nothing for an empty message", () => {
    expect(
      feedbackRow({ kind: "general", message: "   ", context })
    ).toBeNull();
  });

  it("falls back to general for an unknown kind and caps the length", () => {
    const row = feedbackRow({
      kind: "rant",
      message: "x".repeat(FEEDBACK_MAX + 50),
    });
    expect(row.kind).toBe("general");
    expect(row.message).toHaveLength(FEEDBACK_MAX);
    expect(row.module_id).toBeNull();
  });
});

describe("useFeedback", () => {
  it("opens about the page's chapter unless told otherwise", () => {
    const { open, context, openFeedback, setFeedbackContext, closeFeedback } =
      useFeedback();
    setFeedbackContext({ moduleId: "m1", label: "Chapter 1 · History" });
    openFeedback();
    expect(open.value).toBe(true);
    expect(context.value).toEqual({
      moduleId: "m1",
      sectionId: null,
      label: "Chapter 1 · History",
    });
    openFeedback({ moduleId: "m2", label: "Chapter 2" });
    expect(context.value.moduleId).toBe("m2");
    closeFeedback();
    setFeedbackContext(null);
    expect(open.value).toBe(false);
  });
});
