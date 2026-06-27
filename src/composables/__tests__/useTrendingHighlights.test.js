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
    const { trending, loading, fetchTrending } = useTrendingHighlights({ limit: 3 });

    await fetchTrending();

    expect(apiRequest).toHaveBeenCalledWith(
      "trending_highlights?select=*&order=highlight_count.desc&limit=3"
    );
    expect(trending.value).toEqual([{ id: "t1" }]);
    expect(loading.value).toBe(false);
  });

  it("fetchTrendingForSection scopes the query by section_id", async () => {
    apiRequest.mockResolvedValue([]);
    const { fetchTrendingForSection } = useTrendingHighlights({ limit: 10 });

    await fetchTrendingForSection("sec-7");

    expect(apiRequest).toHaveBeenCalledWith(
      "trending_highlights?section_id=eq.sec-7&select=*&order=highlight_count.desc&limit=10"
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

  it("truncateText only truncates beyond maxLength", () => {
    const { truncateText } = useTrendingHighlights();
    expect(truncateText("short", 100)).toBe("short");
    expect(truncateText("abcdef", 3)).toBe("abc...");
  });

  it("scrollToHighlight is a no-op without a paragraph_id", () => {
    const { scrollToHighlight } = useTrendingHighlights();
    expect(() => scrollToHighlight({})).not.toThrow();
  });
});
