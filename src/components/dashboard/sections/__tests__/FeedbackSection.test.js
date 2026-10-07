import { describe, expect, it } from "vitest";
import { mountSection } from "@/test/mountSection";
import FeedbackSection from "../FeedbackSection.vue";

const item = {
  id: "f1",
  chapterTitle: "The Retina",
  sectionTitle: "Photoreceptors",
  kind: "content",
  page: "/chapter/2/the-retina",
  created_at: "2026-10-04T12:00:00Z",
  message: "Please clarify.\n<script>alert('unsafe')</script>",
};
describe("FeedbackSection", () => {
  it("renders escaped messages with full chapter/section/page context and an absolute UTC date", () => {
    const w = mountSection(FeedbackSection, { filteredFeedback: [item] });
    expect(w.text()).toContain("The Retina");
    expect(w.text()).toContain("Section: Photoreceptors");
    expect(w.text()).toContain("Page: /chapter/2/the-retina");
    expect(w.text()).toContain("Oct 4, 2026");
    expect(w.text()).toContain("UTC");
    expect(w.find("time").attributes("datetime")).toBe(item.created_at);
    expect(w.find("script").exists()).toBe(false);
    expect(w.find(".feedback-message").text()).toContain("<script>");
    expect(w.text()).toContain("AI summaries are unavailable");
    expect(w.text()).toContain("1 message");
  });
  it("emits chapter/type selection and refresh without mutating props", async () => {
    const w = mountSection(FeedbackSection, {
      feedbackChapters: [{ id: "retina", title: "The Retina" }],
    });
    await w.findAll("select")[0].setValue("retina");
    await w.findAll("select")[1].setValue("bug");
    expect(w.emitted("chapter-change")).toEqual([["retina"]]);
    expect(w.emitted("kind-change")).toEqual([["bug"]]);
    await w.find("button").trigger("click");
    expect(w.emitted("fetch")).toHaveLength(1);
  });
  it("renders empty, loading, retryable error and denied states without displaying stale feedback", async () => {
    const w = mountSection(FeedbackSection);
    expect(w.text()).toContain("No feedback matches these filters");
    await w.setProps({ filteredFeedback: [item], feedbackLoading: true });
    expect(w.text()).toContain("Loading feedback");
    expect(w.find("article").exists()).toBe(false);
    await w.setProps({
      feedbackLoading: false,
      feedbackError: "Connection failed",
    });
    expect(w.text()).toContain("Connection failed");
    await w
      .findAll("button")
      .find((button) => button.text() === "Try again")
      .trigger("click");
    expect(w.emitted("fetch")).toHaveLength(1);
    await w.setProps({ feedbackAccessDenied: true });
    expect(w.text()).toContain("Access denied");
    expect(w.find("article").exists()).toBe(false);
    expect(w.find("select").exists()).toBe(false);
    expect(w.find("button").attributes("disabled")).toBeDefined();
  });
  it("handles missing dates and treats saved page URLs only as text", () => {
    const w = mountSection(FeedbackSection, {
      filteredFeedback: [
        { ...item, page: "javascript:alert(1)", created_at: null },
      ],
    });
    expect(w.text()).toContain("Date unavailable");
    expect(w.find("a").exists()).toBe(false);
  });
});
