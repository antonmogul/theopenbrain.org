import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/services/api/client", () => ({
  apiRequest: vi.fn(),
}));

import { apiRequest } from "@/services/api/client";
import { useTrendingHighlights } from "@/composables/useTrendingHighlights";

describe("useTrendingHighlights", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("fetchTrending queries via apiRequest (public, unauthed) with the limit", async () => {
    apiRequest.mockResolvedValue([{ id: "t1" }]);
    const { trending, loading, fetchTrending } = useTrendingHighlights({
      limit: 3,
    });

    await fetchTrending();

    expect(apiRequest).toHaveBeenCalledWith(
      "trending_highlights?select=*&order=highlight_count.desc&limit=3"
    );
    expect(trending.value).toEqual([{ id: "t1" }]);
    expect(loading.value).toBe(false);
  });

  it("fetchTrendingForSection scopes by the paragraph's section", async () => {
    apiRequest.mockResolvedValue([]);
    const { fetchTrendingForSection } = useTrendingHighlights({ limit: 10 });

    await fetchTrendingForSection("sec-7");

    expect(apiRequest).toHaveBeenCalledWith(
      "trending_highlights?select=*,paragraph:paragraphs!inner(section_id)&paragraph.section_id=eq.sec-7&order=highlight_count.desc&limit=10"
    );
  });

  it("fetch failures route through the shared scaffold: error set, list reset", async () => {
    apiRequest.mockRejectedValue(new Error("down"));
    const { trending, error, loading, fetchTrending } = useTrendingHighlights();

    await fetchTrending();

    expect(error.value).toBe("down");
    expect(trending.value).toEqual([]);
    expect(loading.value).toBe(false);
  });

  it("fetchTrendingForModule scopes through paragraph → section → module, encoded, 200 max", async () => {
    const rows = [
      { paragraph_id: "p1", selected_text: "rods", highlight_count: 4 },
    ];
    apiRequest.mockResolvedValue(rows);
    const { trending, loading, error, fetchTrendingForModule } =
      useTrendingHighlights({ limit: 3 });

    await fetchTrendingForModule("mod/1 ä");

    expect(apiRequest).toHaveBeenCalledTimes(1);
    expect(apiRequest).toHaveBeenCalledWith(
      "trending_highlights?select=paragraph_id,selected_text,highlight_count," +
        "paragraph:paragraphs!inner(section:sections!section_id!inner(module_id))" +
        "&paragraph.section.module_id=eq.mod%2F1%20%C3%A4" +
        "&order=highlight_count.desc&limit=200"
    );
    // paragraphs and sections have two relationships since
    // sections.anchor_paragraph_id (20260924030000): an embed that doesn't
    // name one is PostgREST's PGRST201 (HTTP 300), an always-empty layer.
    expect(apiRequest.mock.calls[0][0]).not.toMatch(
      /sections(?!!section_id)[!(]/
    );
    expect(trending.value).toEqual(rows);
    expect(loading.value).toBe(false);
    expect(error.value).toBe(null);
  });

  it("fetchTrendingForModule without a module clears the list and asks nothing", async () => {
    apiRequest.mockResolvedValue([{ paragraph_id: "p1" }]);
    const { trending, fetchTrendingForModule } = useTrendingHighlights();
    await fetchTrendingForModule("m1");
    expect(trending.value).toHaveLength(1);

    await fetchTrendingForModule(null);
    expect(apiRequest).toHaveBeenCalledTimes(1);
    expect(trending.value).toEqual([]);
  });

  it("fetchTrendingForModule fails quietly: error set, list empty, no console.error", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    apiRequest.mockRejectedValue(new Error("down"));
    const { trending, error, loading, fetchTrendingForModule } =
      useTrendingHighlights();

    await fetchTrendingForModule("m1");

    expect(error.value).toBe("down");
    expect(trending.value).toEqual([]);
    expect(loading.value).toBe(false);
    expect(console.error).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it("fetchTrendingForModule keeps the latest module's rows when answers cross", async () => {
    let answerFirst;
    apiRequest
      .mockImplementationOnce(
        () => new Promise((resolve) => (answerFirst = resolve))
      )
      .mockResolvedValueOnce([{ paragraph_id: "second" }]);
    const { trending, loading, fetchTrendingForModule } =
      useTrendingHighlights();

    const first = fetchTrendingForModule("m1");
    await fetchTrendingForModule("m2");
    expect(trending.value).toEqual([{ paragraph_id: "second" }]);
    expect(loading.value).toBe(false);

    answerFirst([{ paragraph_id: "first" }]);
    await first;
    expect(trending.value).toEqual([{ paragraph_id: "second" }]);
    expect(loading.value).toBe(false);
  });

  it("truncateText only truncates beyond maxLength", () => {
    const { truncateText } = useTrendingHighlights();
    expect(truncateText("short", 100)).toBe("short");
    expect(truncateText("abcdef", 3)).toBe("abc...");
  });

  it("scrollToHighlight is a no-op without a paragraph_id", () => {
    const { scrollToHighlight } = useTrendingHighlights();
    expect(() => scrollToHighlight({})).not.toThrow();
  });

  it("scrollToHighlight centres the passage's paragraph and flashes it", () => {
    vi.useFakeTimers();
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    const paragraph = document.createElement("div");
    // A UUID can start with a digit: found by id, not a #selector.
    paragraph.id = "1f0c-para";
    paragraph.getBoundingClientRect = () => ({ top: 1200, height: 100 });
    document.body.appendChild(paragraph);
    document.documentElement.setAttribute("data-reduce-motion", "1");

    const { scrollToHighlight } = useTrendingHighlights();
    scrollToHighlight({ paragraph_id: "1f0c-para" });

    // Its middle at the viewport's middle, without smooth scrolling.
    const top = Math.round(1200 + 50 - window.innerHeight / 2);
    expect(scrollTo).toHaveBeenCalledWith({
      top: Math.max(0, top),
      behavior: "auto",
    });
    expect(paragraph.classList.contains("ob-flash")).toBe(true);
    vi.advanceTimersByTime(1600);
    expect(paragraph.classList.contains("ob-flash")).toBe(false);

    paragraph.remove();
    document.documentElement.removeAttribute("data-reduce-motion");
    scrollTo.mockRestore();
    vi.useRealTimers();
  });
});
