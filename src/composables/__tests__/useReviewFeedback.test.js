import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The API layer: the default transport goes through the REST client.
const apiRequest = vi.fn();
vi.mock("@/services/api/client", () => ({
  apiRequest: (...a) => apiRequest(...a),
  isApiConfigured: () => true,
}));

const {
  REVIEW_KEYS,
  buildReviewPayload,
  fitAnchor,
  reloadReviewState,
  resetReviewForTests,
  reviewErrorCode,
  reviewProblems,
  reviewWidgetEnabled,
  setReviewTransport,
  syncReviewQueue,
  threadReviewNotes,
  useReviewFeedback,
} = await import("@/composables/useReviewFeedback");

const ANCHOR = {
  v: 1,
  kind: "paragraph",
  label: "¶ 3 in “Photoreceptors”",
  paragraphId: "11111111-0000-4000-8000-000000000002",
  sectionSlug: "photoreceptors",
  textExcerpt: "Rods and cones",
};
const ENV = {
  url: "https://x/chapter/2/the-retina",
  viewport: "1440×900",
  userAgent: "UA",
};

function memoryStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  };
}

beforeEach(() => {
  resetReviewForTests();
  apiRequest.mockReset();
  setReviewTransport(null);
});
afterEach(() => setReviewTransport(null));

describe("the kill switch", () => {
  it("is on by default, off by the build or ?review=off (kept), back with ?review=on", () => {
    const storage = memoryStorage();
    expect(reviewWidgetEnabled({ storage })).toBe(true);
    expect(reviewWidgetEnabled({ env: "off", storage })).toBe(false);
    expect(reviewWidgetEnabled({ search: "?review=off", storage })).toBe(false);
    expect(reviewWidgetEnabled({ storage })).toBe(false);
    expect(reviewWidgetEnabled({ search: "?review=on", storage })).toBe(true);
    expect(reviewWidgetEnabled({ storage })).toBe(true);
    expect(reviewWidgetEnabled({ storage: null })).toBe(true);
  });
});

describe("the payload", () => {
  it("is the shared contract's columns, capped", () => {
    const p = buildReviewPayload(
      {
        type: "content",
        note: "  Fix this  ",
        quote: "x".repeat(3000),
        suggestedText: "better",
        anchor: ANCHOR,
        chapterSlug: "the-retina",
        clientId: "r_1",
      },
      { name: "Stuart", role: "author" },
      ENV
    );
    expect(p).toEqual({
      client_id: "r_1",
      chapter_slug: "the-retina",
      section_slug: "photoreceptors",
      paragraph_id: ANCHOR.paragraphId,
      type: "content",
      note: "Fix this",
      quote: "x".repeat(2000),
      suggested_text: "better",
      anchor: ANCHOR,
      reviewer_name: "Stuart",
      reviewer_role: "author",
      url: ENV.url,
      viewport: ENV.viewport,
      user_agent: "UA",
    });
  });

  it("keeps only a uuid as paragraph_id, and an unknown type is a note", () => {
    const p = buildReviewPayload(
      {
        type: "rant",
        note: "n",
        anchor: {
          ...ANCHOR,
          paragraphId: "subsection-x",
          sectionSlug: undefined,
          boxSlug: "box-a",
        },
      },
      { name: "A", role: "nobody" },
      {}
    );
    expect(p.paragraph_id).toBeNull();
    expect(p.type).toBe("note");
    expect(p.section_slug).toBe("box-a");
    expect(p.reviewer_role).toBe("reviewer");
  });

  it("fits the anchor under 16 KB", () => {
    const big = {
      ...ANCHOR,
      textExcerpt: "é".repeat(9000),
      selector: "s".repeat(9000),
    };
    const fitted = fitAnchor(big);
    expect(
      new TextEncoder().encode(JSON.stringify(fitted)).length
    ).toBeLessThanOrEqual(16384);
    expect(fitted.kind).toBe("paragraph");
  });

  it("needs a note, or both the current and the suggested text", () => {
    expect(reviewProblems({})).toHaveLength(1);
    expect(reviewProblems({ quote: "a" })).toHaveLength(1);
    expect(reviewProblems({ quote: "a", suggestedText: "b" })).toEqual([]);
    expect(reviewProblems({ note: "n" })).toEqual([]);
  });

  it("reads the RPC's error codes", () => {
    expect(
      reviewErrorCode({ response: '{"message":"review_rate_limited"}' })
    ).toBe("review_rate_limited");
    expect(reviewErrorCode(new Error("Failed to fetch"))).toBe("");
  });
});

describe("the queue", () => {
  const draft = {
    type: "note",
    note: "Hello",
    anchor: ANCHOR,
    chapterSlug: "the-retina",
    hash: "x",
  };

  it("asks who you are first", () => {
    const review = useReviewFeedback();
    expect(review.submit(draft, ENV).problems).toBeTruthy();
    expect(review.setIdentity({ name: "  ", role: "author" })).toBeNull();
    expect(review.setIdentity({ name: "Stuart", role: "author" })).toEqual({
      name: "Stuart",
      role: "author",
    });
    expect(JSON.parse(localStorage.getItem(REVIEW_KEYS.identity)).name).toBe(
      "Stuart"
    );
  });

  it("goes through the RPC with the publishable REST client", async () => {
    apiRequest.mockResolvedValue({ id: "row-1", status: "new" });
    const review = useReviewFeedback();
    review.setIdentity({ name: "Stuart", role: "author" });
    const rec = review.submit(draft, ENV);
    await syncReviewQueue();
    expect(apiRequest).toHaveBeenCalledWith("rpc/submit_review_feedback", {
      method: "POST",
      body: expect.any(String),
    });
    const body = JSON.parse(apiRequest.mock.calls[0][1].body);
    expect(body.p.client_id).toBe(rec.clientId);
    expect(body.p.anchor).toEqual(ANCHOR);
    expect(review.queue.value[0]).toMatchObject({
      state: "sent",
      id: "row-1",
      status: "new",
    });
    // Kept in this browser.
    reloadReviewState();
    expect(review.queue.value[0].state).toBe("sent");
  });

  it("keeps a note that fails and sends it again with the same client id", async () => {
    const submit = vi
      .fn()
      .mockRejectedValueOnce(new Error("Failed to fetch"))
      .mockResolvedValueOnce([{ id: "row-2", status: "new" }]);
    setReviewTransport({ submit, statuses: vi.fn() });
    const review = useReviewFeedback();
    review.setIdentity({ name: "Maura", role: "designer" });
    review.submit(draft, ENV);
    await syncReviewQueue();
    expect(review.queue.value[0].state).toBe("queued");
    expect(review.pendingCount.value).toBe(1);
    expect(review.lastError.value).toMatch(/connection/);
    await syncReviewQueue();
    expect(submit.mock.calls[0][0].client_id).toBe(
      submit.mock.calls[1][0].client_id
    );
    expect(review.queue.value[0]).toMatchObject({
      state: "sent",
      id: "row-2",
      attempts: 1,
    });
    expect(review.pendingCount.value).toBe(0);
  });

  it("stops a round on a rate limit and gives up on a rejected note", async () => {
    const limited = Object.assign(new Error("API Error 400"), {
      response: '{"message":"review_rate_limited"}',
    });
    const invalid = Object.assign(new Error("API Error 400"), {
      response: '{"message":"review_invalid: note"}',
    });
    const submit = vi.fn().mockRejectedValueOnce(limited);
    setReviewTransport({ submit, statuses: vi.fn() });
    const review = useReviewFeedback();
    review.setIdentity({ name: "Karen", role: "reviewer" });
    review.submit(draft, ENV);
    review.submit({ ...draft, note: "second" }, ENV);
    await syncReviewQueue();
    expect(submit).toHaveBeenCalledTimes(1);
    submit.mockReset();
    submit
      .mockRejectedValueOnce(invalid)
      .mockResolvedValueOnce({ id: "row-3", status: "new" });
    await syncReviewQueue();
    expect(review.queue.value.map((r) => r.state)).toEqual([
      "rejected",
      "sent",
    ]);
    // A rejected note is not sent again; it can be deleted.
    submit.mockReset();
    await syncReviewQueue();
    expect(submit).not.toHaveBeenCalled();
    review.discard(review.queue.value[0].clientId);
    expect(review.queue.value).toHaveLength(1);
  });

  it("reads back the status and the reply of the notes sent from here", async () => {
    const row = {
      id: "row-9",
      status: "done",
      reply: "Fixed in #210",
      replied_at: "2026-11-19T10:00:00Z",
      updated_at: null,
    };
    const statuses = vi.fn().mockResolvedValue([row]);
    setReviewTransport({
      submit: vi.fn().mockResolvedValue({ id: "row-9", status: "new" }),
      statuses,
    });
    const review = useReviewFeedback();
    review.setIdentity({ name: "Arjun", role: "author" });
    review.submit(draft, ENV);
    await syncReviewQueue();
    await review.refreshStatuses();
    expect(statuses).toHaveBeenCalledWith(["row-9"]);
    expect(review.queue.value[0]).toMatchObject({
      status: "done",
      reply: "Fixed in #210",
    });
  });

  it("the default status call is the status RPC", async () => {
    apiRequest
      .mockResolvedValueOnce({ id: "row-5", status: "new" })
      .mockResolvedValueOnce([]);
    const review = useReviewFeedback();
    review.setIdentity({ name: "Sonia", role: "author" });
    review.submit(draft, ENV);
    await syncReviewQueue();
    await review.refreshStatuses();
    expect(apiRequest).toHaveBeenLastCalledWith(
      "rpc/review_feedback_status?p_ids=%7Brow-5%7D",
      { method: "GET" }
    );
  });

  it("sends nothing when the queue is empty (no write on page load)", async () => {
    await syncReviewQueue();
    await useReviewFeedback().refreshStatuses();
    expect(apiRequest).not.toHaveBeenCalled();
  });
});

describe("everyone's notes", () => {
  const UUID = (n) => `aaaaaaaa-0000-4000-8000-00000000000${n}`;
  const row = (n, extra = {}) => ({
    id: UUID(n),
    parent_id: null,
    created_at: `2026-11-18T1${n}:00:00Z`,
    anchor: { sectionSlug: "a" },
    ...extra,
  });

  it("threads replies under their notes and groups by section", () => {
    const groups = threadReviewNotes(
      [
        row(3, { parent_id: UUID(1) }),
        row(1),
        row(2, { anchor: { boxSlug: "box-x", sectionSlug: "a" } }),
        row(4, { anchor: {} }),
      ],
      (k) => ({ "box-x": 0, a: 1 })[k]
    );
    expect(groups.map((g) => g.key)).toEqual(["box-x", "a", ""]);
    expect(groups[1].notes[0].replies.map((r) => r.id)).toEqual([UUID(3)]);
  });

  it("fetches the chapter with a GET to the list RPC", async () => {
    apiRequest.mockResolvedValueOnce([row(1)]);
    const review = useReviewFeedback();
    const rows = await review.fetchChapterNotes("the-retina");
    expect(apiRequest).toHaveBeenCalledWith(
      "rpc/list_review_feedback?p_chapter=the-retina",
      { method: "GET" }
    );
    expect(rows).toHaveLength(1);
    expect(review.chapterNotes.value).toHaveLength(1);
  });

  it("a reply carries parent_id, and only a real id", () => {
    const p = buildReviewPayload(
      { note: "Agreed", parentId: UUID(1), anchor: {} },
      { name: "S", role: "author" }
    );
    expect(p.parent_id).toBe(UUID(1));
    const bad = buildReviewPayload(
      { note: "x", parentId: "no" },
      { name: "S" }
    );
    expect("parent_id" in bad).toBe(false);
  });
});
