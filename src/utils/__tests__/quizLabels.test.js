import { describe, expect, it } from "vitest";
import { attemptPercent, questionTypeLabel } from "@/utils/quizLabels";

describe("questionTypeLabel", () => {
  it("names the three question types in words", () => {
    expect(questionTypeLabel("multiple_choice")).toBe("Multiple choice");
    expect(questionTypeLabel("TRUE_FALSE")).toBe("True / false");
    expect(questionTypeLabel("short_answer")).toBe("Short answer");
  });

  it("de-snakes a type it doesn't know", () => {
    expect(questionTypeLabel("fill_in_blank")).toBe("Fill in blank");
    expect(questionTypeLabel(null)).toBe("Question");
  });
});

describe("attemptPercent", () => {
  it("shows a dash until someone has taken the quiz", () => {
    expect(attemptPercent(0, 0)).toBe("—");
    expect(attemptPercent(undefined, undefined)).toBe("—");
  });

  it("shows a rounded percentage once there are attempts", () => {
    expect(attemptPercent(0, 3)).toBe("0%");
    expect(attemptPercent(66.6, 3)).toBe("67%");
  });
});
