import { beforeEach, describe, expect, it, vi } from "vitest";
import { effectScope, nextTick, ref } from "vue";
vi.mock("@/services/api/client", () => ({ authedRequest: vi.fn() }));
import { authedRequest } from "@/services/api/client";
import { REVIEW_NOTE_COLUMNS, useReviewNotes } from "../useReviewNotes";
import {
  REVIEW_MODULES,
  REVIEW_NOTES,
  REVIEW_REPLIES,
  REVIEW_SECTIONS,
} from "@/stories/reviewNoteFixtures.js";

function mockData({ notes = REVIEW_NOTES, fail } = {}) {
  authedRequest.mockImplementation(async (endpoint, options = {}) => {
    if (options.method === "PATCH") {
      const id = new URLSearchParams(endpoint.split("?")[1])
        .get("id")
        .replace("eq.", "");
      const row = notes.find((n) => n.id === id);
      return row
        ? [{ ...row, ...JSON.parse(options.body), replied_at: "now" }]
        : [];
    }
    if (fail && endpoint.startsWith("review_feedback?")) throw fail;
    const offset = Number(
      new URLSearchParams(endpoint.split("?")[1]).get("offset")
    );
    if (offset > 0) return [];
    if (endpoint.startsWith("review_feedback?")) return notes;
    if (endpoint.startsWith("modules?")) return REVIEW_MODULES;
    if (endpoint.startsWith("sections?")) return REVIEW_SECTIONS;
    return [];
  });
}
function setup(allowed = true) {
  const scope = effectScope();
  const canRead = ref(allowed);
  const identity = ref("creator-one");
  return {
    canRead,
    identity,
    ...scope.run(() => useReviewNotes(canRead, identity)),
  };
}
beforeEach(() => {
  vi.clearAllMocks();
  mockData();
});

describe("useReviewNotes (OPENBRAIN-203)", () => {
  it("loads every note with explicit columns, open notes first by default", async () => {
    const r = setup();
    await r.fetchReviewNotes();
    const endpoint = authedRequest.mock.calls.find(([e]) =>
      e.startsWith("review_feedback?")
    )[0];
    expect(endpoint).toContain(`select=${REVIEW_NOTE_COLUMNS}`);
    expect(endpoint).not.toContain("ip_hash");
    expect(r.reviewNotes.value).toHaveLength(3);
    expect(r.reviewFilters.value.status).toBe("open");
    expect(r.reviewFilteredCount.value).toBe(2);
    expect(r.reviewOpenCount.value).toBe(2);
    expect(r.reviewChapters.value.map((c) => c.title)).toEqual([
      "Foundations of Neuroscience",
      "The Retina",
    ]);
    r.reviewFilters.value = {
      chapter: "the-retina",
      type: "all",
      status: "all",
    };
    expect(r.reviewGroups.value[0].sections.map((s) => s.title)).toEqual([
      "Introduction",
      "Photoreceptors",
    ]);
  });

  it("saves status and reply with one PATCH and takes the returned row", async () => {
    const r = setup();
    await r.fetchReviewNotes();
    authedRequest.mockClear();
    const id = REVIEW_NOTES[0].id;
    expect(
      await r.saveReviewNote({ id, status: "done", reply: "  Fixed.  " })
    ).toBe(true);
    expect(authedRequest).toHaveBeenCalledTimes(1);
    const [endpoint, options] = authedRequest.mock.calls[0];
    expect(endpoint).toMatch(new RegExp(`^review_feedback\\?id=eq\\.${id}&`));
    expect(options.method).toBe("PATCH");
    expect(JSON.parse(options.body)).toEqual({
      status: "done",
      reply: "Fixed.",
    });
    expect(options.headers.Prefer).toBe("return=representation");
    const saved = r.reviewNotes.value.find((n) => n.id === id);
    expect(saved).toMatchObject({
      status: "done",
      reply: "Fixed.",
      replied_at: "now",
    });
    expect(r.reviewOpenCount.value).toBe(1);
    expect(r.reviewSavingIds.value).toEqual([]);

    // An empty reply is cleared, not saved as "".
    await r.saveReviewNote({ id, status: "done", reply: "   " });
    expect(JSON.parse(authedRequest.mock.calls[1][1].body).reply).toBeNull();
  });

  it("reports a save RLS refused (no row back) or a failed request on that note", async () => {
    const r = setup();
    await r.fetchReviewNotes();
    expect(
      await r.saveReviewNote({ id: "gone", status: "done", reply: "" })
    ).toBe(false);
    expect(r.reviewSaveErrors.value.gone).toMatch(
      /no access, or it was deleted/
    );
    authedRequest.mockRejectedValueOnce(
      Object.assign(new Error("API Error 403"), { status: 403 })
    );
    const id = REVIEW_NOTES[1].id;
    await r.saveReviewNote({ id, status: "done", reply: "" });
    expect(r.reviewSaveErrors.value[id]).toMatch(/permission/);
    expect(r.reviewNotes.value.find((n) => n.id === id).status).toBe("doing");
  });

  it("says when the migration isn't pushed, denies non-creators, and clears on identity change", async () => {
    mockData({
      fail: Object.assign(new Error("API Error 404"), {
        status: 404,
        response: '{"code":"PGRST205"}',
      }),
    });
    const r = setup();
    await r.fetchReviewNotes();
    expect(r.reviewMissingTable.value).toBe(true);
    expect(r.reviewError.value).toMatch(/20261118130000_review_feedback/);

    mockData({ fail: Object.assign(new Error("x"), { status: 403 }) });
    await r.fetchReviewNotes();
    expect(r.reviewAccessDenied.value).toBe(true);
    expect(r.reviewNotes.value).toEqual([]);

    mockData();
    await r.fetchReviewNotes();
    expect(r.reviewNotes.value).toHaveLength(3);
    r.identity.value = "someone-else";
    await nextTick();
    expect(r.reviewNotes.value).toEqual([]);

    const denied = setup(false);
    authedRequest.mockClear();
    await denied.fetchReviewNotes();
    expect(authedRequest).not.toHaveBeenCalled();
    expect(denied.reviewAccessDenied.value).toBe(true);
  });

  it("filters notes, not replies: a reply follows its note and isn't counted", async () => {
    mockData({ notes: [...REVIEW_NOTES, ...REVIEW_REPLIES] });
    const r = setup();
    await r.fetchReviewNotes();
    expect(r.reviewFilteredCount.value).toBe(2);
    expect(r.reviewOpenCount.value).toBe(2);
    const maura = r.reviewGroups.value[0].sections[0].notes[0];
    expect(maura.replies).toHaveLength(2);
    r.reviewFilters.value = { chapter: "all", type: "all", status: "done" };
    expect(r.reviewGroups.value.map((c) => c.title)).toEqual(["The Retina"]);
    expect(
      r.reviewGroups.value
        .flatMap((c) => c.sections)
        .flatMap((s) => s.notes)
        .map((n) => n.reviewer_name)
    ).toEqual(["Arjun"]);
  });
});
