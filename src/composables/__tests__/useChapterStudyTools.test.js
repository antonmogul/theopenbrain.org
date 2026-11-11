// @vitest-environment happy-dom
import { flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";

const get = vi.fn();
vi.mock("@/services/api/client", () => ({ get: (...a) => get(...a) }));

import { quizSummary, useChapterStudyTools } from "../useChapterStudyTools.js";

// What a chapter gives its reader to test themselves with (OPENBRAIN-179).

describe("quizSummary", () => {
  it("reads the question count PostgREST embeds", () => {
    expect(
      quizSummary({
        id: "q",
        title: "Quiz",
        time_limit_minutes: 10,
        quiz_questions: [{ count: 12 }],
      })
    ).toEqual({ id: "q", title: "Quiz", questionCount: 12, minutes: 10 });
  });

  it("counts embedded question rows too", () => {
    expect(
      quizSummary({ id: "q", quiz_questions: [{ id: "a" }, { id: "b" }] })
    ).toEqual({ id: "q", title: "", questionCount: 2, minutes: 0 });
  });

  it("claims no numbers it does not have", () => {
    expect(quizSummary({ id: "q", time_limit_minutes: null })).toEqual({
      id: "q",
      title: "",
      questionCount: 0,
      minutes: 0,
    });
    expect(quizSummary(null)).toBeNull();
    expect(quizSummary({})).toBeNull();
  });
});

describe("useChapterStudyTools", () => {
  beforeEach(() => {
    get.mockReset();
  });

  it("asks nothing without a chapter", async () => {
    const { quiz, flashcardCount } = useChapterStudyTools(null);
    await flushPromises();
    expect(get).not.toHaveBeenCalled();
    expect(quiz.value).toBeNull();
    expect(flashcardCount.value).toBe(0);
  });

  it("finds the chapter's published quiz and counts its flashcards", async () => {
    get.mockImplementation(async (endpoint) =>
      endpoint.startsWith("quizzes?")
        ? [{ id: "q1", title: "Check", quiz_questions: [{ count: 5 }] }]
        : [{ id: "a" }, { id: "b" }, { id: "c" }]
    );
    const { quiz, flashcardCount } = useChapterStudyTools(() => "m1");
    await flushPromises();
    expect(get.mock.calls[0][0]).toContain("module_id=eq.m1");
    expect(get.mock.calls[0][0]).toContain("is_published=is.true");
    expect(quiz.value.id).toBe("q1");
    expect(flashcardCount.value).toBe(3);
  });

  it("offers nothing when a request fails", async () => {
    get.mockRejectedValue(new Error("offline"));
    const { quiz, flashcardCount } = useChapterStudyTools("m1");
    await flushPromises();
    expect(quiz.value).toBeNull();
    expect(flashcardCount.value).toBe(0);
  });

  it("drops an answer that arrives after the chapter changed", async () => {
    let finishFirst;
    get.mockImplementation((endpoint) => {
      if (endpoint.includes("module_id=eq.m1"))
        return new Promise((resolve) => {
          if (endpoint.startsWith("flashcards?"))
            finishFirst = () => resolve([{ id: "old" }, { id: "old2" }]);
          else resolve([{ id: "old-quiz" }]);
        });
      return Promise.resolve(
        endpoint.startsWith("quizzes?") ? [] : [{ id: "new" }]
      );
    });
    const id = ref("m1");
    const { quiz, flashcardCount } = useChapterStudyTools(id);
    await flushPromises();
    id.value = "m2";
    await flushPromises();
    expect(flashcardCount.value).toBe(1);
    finishFirst();
    await flushPromises();
    expect(quiz.value).toBeNull();
    expect(flashcardCount.value).toBe(1);
  });
});
