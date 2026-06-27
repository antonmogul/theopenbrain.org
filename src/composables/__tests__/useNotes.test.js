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
import { useNotes } from "@/composables/useNotes";

describe("useNotes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    user.value = { id: "user-1" };
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("fetchNotes joins highlight data and appends section + highlight filters", async () => {
    authedRequest.mockResolvedValue([{ id: "n1" }]);
    const { notes, fetchNotes } = useNotes({ sectionId: "s-default" });

    await fetchNotes({ highlightId: "h9" });

    expect(authedRequest).toHaveBeenCalledWith(
      "notes?user_id=eq.user-1&select=*,highlight:highlights(id,selected_text,color,paragraph_id)&order=created_at.desc&section_id=eq.s-default&highlight_id=eq.h9"
    );
    expect(notes.value).toEqual([{ id: "n1" }]);
  });

  it("createNote POSTs payload and prepends to local state", async () => {
    authedRequest.mockResolvedValue([{ id: "n-new", content: "hi" }]);
    const { notes, createNote } = useNotes();
    notes.value = [{ id: "existing" }];

    const result = await createNote({ content: "hi", sectionId: "s1" });

    const post = authedRequest.mock.calls.find((c) => c[0] === "notes");
    expect(post[1].method).toBe("POST");
    expect(JSON.parse(post[1].body)).toMatchObject({
      user_id: "user-1",
      content: "hi",
      section_id: "s1",
      is_public: false,
    });
    expect(result.id).toBe("n-new");
    // Prepended (newest first)
    expect(notes.value[0].id).toBe("n-new");
  });

  it("createNote fetches the linked highlight when highlightId is given", async () => {
    authedRequest
      .mockResolvedValueOnce([{ id: "n-new" }]) // POST
      .mockResolvedValueOnce([{ id: "h1", selected_text: "x", color: "blue" }]); // highlight fetch
    const { createNote } = useNotes();

    const result = await createNote({ content: "c", highlightId: "h1" });

    expect(authedRequest).toHaveBeenCalledWith(
      "highlights?id=eq.h1&select=id,selected_text,color,paragraph_id"
    );
    expect(result.highlight).toMatchObject({ id: "h1", color: "blue" });
  });

  it("createNote throws when unauthenticated", async () => {
    user.value = null;
    const { createNote } = useNotes();
    await expect(createNote({ content: "x" })).rejects.toThrow(
      "User not authenticated"
    );
  });

  it("updateNote PATCHes content + updated_at and merges locally", async () => {
    authedRequest.mockResolvedValue([]);
    const { notes, updateNote } = useNotes();
    notes.value = [{ id: "n1", content: "old" }];

    await updateNote("n1", "new");

    const patch = authedRequest.mock.calls.find((c) => c[0] === "notes?id=eq.n1");
    expect(patch[1].method).toBe("PATCH");
    const body = JSON.parse(patch[1].body);
    expect(body.content).toBe("new");
    expect(body.updated_at).toBeTruthy();
    expect(notes.value[0].content).toBe("new");
  });

  it("deleteNote delegates to the shared removeById scaffold", async () => {
    authedRequest.mockResolvedValue([]);
    const { notes, deleteNote } = useNotes();
    notes.value = [{ id: "n1" }, { id: "n2" }];

    await deleteNote("n1");

    expect(authedRequest).toHaveBeenCalledWith("notes?id=eq.n1", {
      method: "DELETE",
    });
    expect(notes.value).toEqual([{ id: "n2" }]);
  });

  it("togglePublic PATCHes inverted is_public (distinct inline path)", async () => {
    authedRequest.mockResolvedValue([]);
    const { notes, togglePublic } = useNotes();
    notes.value = [{ id: "n1", is_public: false }];

    await togglePublic("n1");

    const patch = authedRequest.mock.calls.find((c) => c[0] === "notes?id=eq.n1");
    const body = JSON.parse(patch[1].body);
    expect(body.is_public).toBe(true);
    expect(body.updated_at).toBeTruthy();
    expect(notes.value[0].is_public).toBe(true);
  });

  it("computed splits standalone vs highlight-linked notes", () => {
    const { notes, totalNotes, notesWithHighlights, standaloneNotes } = useNotes();
    notes.value = [
      { id: "a", highlight_id: "h1" },
      { id: "b", highlight_id: null },
    ];
    expect(totalNotes.value).toBe(2);
    expect(notesWithHighlights.value.map((n) => n.id)).toEqual(["a"]);
    expect(standaloneNotes.value.map((n) => n.id)).toEqual(["b"]);
  });
});
