import { describe, it, expect, beforeEach, vi } from "vitest";
import { ref } from "vue";

vi.mock("@/services/api/client", () => ({
  authedRequest: vi.fn(),
}));

const user = ref(null);
vi.mock("@/composables/useAuth", () => ({
  useAuth: () => ({ user }),
}));

import { authedRequest } from "@/services/api/client";
import {
  useHighlights,
  HIGHLIGHT_COLORS,
  HIGHLIGHT_HEX,
} from "@/composables/useHighlights";

describe("useHighlights", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    user.value = { id: "user-1" };
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("HIGHLIGHT_HEX maps each color value to its -300 hex", () => {
    expect(HIGHLIGHT_HEX.yellow).toBe("#fcd34d");
    expect(Object.keys(HIGHLIGHT_HEX)).toHaveLength(HIGHLIGHT_COLORS.length);
  });

  it("fetchHighlights short-circuits to [] when unauthenticated", async () => {
    user.value = null;
    const { highlights, fetchHighlights } = useHighlights();
    await fetchHighlights();
    expect(highlights.value).toEqual([]);
    expect(authedRequest).not.toHaveBeenCalled();
  });

  it("fetchHighlights appends paragraph filter and loads via shared scaffold", async () => {
    authedRequest.mockResolvedValue([{ id: "h1", paragraph_id: "p1", start_offset: 0 }]);
    const { highlights, loading, fetchHighlights } = useHighlights();

    await fetchHighlights("p1");

    expect(authedRequest).toHaveBeenCalledWith(
      "highlights?user_id=eq.user-1&select=*&order=created_at.desc&paragraph_id=eq.p1"
    );
    expect(highlights.value).toHaveLength(1);
    expect(loading.value).toBe(false);
  });

  it("fetchHighlightsForParagraphs builds an in.() clause", async () => {
    authedRequest.mockResolvedValue([]);
    const { fetchHighlightsForParagraphs } = useHighlights();

    await fetchHighlightsForParagraphs(["p1", "p2"]);

    expect(authedRequest).toHaveBeenCalledWith(
      'highlights?user_id=eq.user-1&paragraph_id=in.("p1","p2")&select=*&order=start_offset.asc'
    );
  });

  it("createHighlight POSTs snake_case payload and appends to local state", async () => {
    authedRequest.mockResolvedValue([{ id: "new", color: "green" }]);
    const { highlights, createHighlight } = useHighlights();

    const result = await createHighlight({
      paragraphId: "p1",
      startOffset: 3,
      endOffset: 9,
      selectedText: "retina",
      color: "green",
    });

    const post = authedRequest.mock.calls.find((c) => c[0] === "highlights");
    expect(post[1].method).toBe("POST");
    const body = JSON.parse(post[1].body);
    expect(body).toMatchObject({
      user_id: "user-1",
      paragraph_id: "p1",
      start_offset: 3,
      end_offset: 9,
      selected_text: "retina",
      color: "green",
      is_public: false,
    });
    expect(result.id).toBe("new");
    expect(highlights.value).toContainEqual({ id: "new", color: "green" });
  });

  it("createHighlight throws when unauthenticated", async () => {
    user.value = null;
    const { createHighlight } = useHighlights();
    await expect(createHighlight({})).rejects.toThrow("User not authenticated");
  });

  it("updateHighlight PATCHes and merges into local state", async () => {
    authedRequest.mockResolvedValue([{ id: "h1", color: "yellow" }]);
    const { highlights, fetchHighlights, updateHighlight } = useHighlights();
    await fetchHighlights();
    authedRequest.mockResolvedValue([]);

    await updateHighlight("h1", { color: "blue" });

    expect(authedRequest).toHaveBeenCalledWith("highlights?id=eq.h1", {
      method: "PATCH",
      body: JSON.stringify({ color: "blue" }),
    });
    expect(highlights.value[0].color).toBe("blue");
  });

  it("deleteHighlight delegates to the shared removeById scaffold", async () => {
    authedRequest.mockResolvedValueOnce([{ id: "h1" }, { id: "h2" }]);
    const { highlights, fetchHighlights, deleteHighlight } = useHighlights();
    await fetchHighlights();
    authedRequest.mockResolvedValueOnce([]);

    await deleteHighlight("h1");

    expect(authedRequest).toHaveBeenCalledWith("highlights?id=eq.h1", {
      method: "DELETE",
    });
    expect(highlights.value).toEqual([{ id: "h2" }]);
  });

  it("togglePublic flips is_public via updateHighlight", async () => {
    authedRequest.mockResolvedValueOnce([{ id: "h1", is_public: false }]);
    const { highlights, fetchHighlights, togglePublic } = useHighlights();
    await fetchHighlights();
    authedRequest.mockResolvedValueOnce([]);

    await togglePublic("h1");

    const patch = authedRequest.mock.calls.find((c) => c[0] === "highlights?id=eq.h1");
    expect(JSON.parse(patch[1].body)).toEqual({ is_public: true });
    expect(highlights.value[0].is_public).toBe(true);
  });

  it("getColorClass returns the matching class, falling back to yellow", () => {
    const { getColorClass } = useHighlights();
    expect(getColorClass("green")).toBe("bg-green-200");
    expect(getColorClass("unknown")).toBe("bg-yellow-200");
  });

  it("highlightsByParagraph groups and sorts by start_offset", async () => {
    authedRequest.mockResolvedValue([
      { id: "a", paragraph_id: "p1", start_offset: 5 },
      { id: "b", paragraph_id: "p1", start_offset: 1 },
      { id: "c", paragraph_id: "p2", start_offset: 0 },
    ]);
    const { highlightsByParagraph, fetchHighlights } = useHighlights();
    await fetchHighlights();

    expect(highlightsByParagraph.value.p1.map((h) => h.id)).toEqual(["b", "a"]);
    expect(highlightsByParagraph.value.p2.map((h) => h.id)).toEqual(["c"]);
  });
});
