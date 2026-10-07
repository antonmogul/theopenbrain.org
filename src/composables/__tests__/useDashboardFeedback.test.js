import { beforeEach, describe, expect, it, vi } from "vitest";
import { effectScope, ref } from "vue";
vi.mock("@/services/api/client", () => ({ authedRequest: vi.fn() }));
import { authedRequest } from "@/services/api/client";
import { useDashboardFeedback } from "../useDashboardFeedback";

const records = [
  {
    id: "1",
    module_id: "retina",
    section_id: "s1",
    kind: "content",
    message: "Clarify the figure",
    page: "/chapter/2/the-retina",
    created_at: "2026-10-04T12:00:00Z",
    section: { title: "Photoreceptors" },
  },
  { id: "2", module_id: null, kind: "idea", message: "General idea" },
  {
    id: "3",
    module_id: "missing",
    section_id: "gone",
    kind: "bug",
    message: "Missing media",
  },
];
const chapters = [
  { id: "retina", title: "The Retina" },
  { id: "history", title: "History" },
];
function mockData(feedback = records, cap = 500) {
  authedRequest.mockImplementation(async (endpoint) => {
    const offset = Number(
      new URLSearchParams(endpoint.split("?")[1]).get("offset")
    );
    return (endpoint.startsWith("feedback?") ? feedback : chapters).slice(
      offset,
      offset + cap
    );
  });
}
function setup(allowed = true) {
  const scope = effectScope();
  const canRead = ref(allowed);
  const identity = ref("creator-one");
  return {
    scope,
    canRead,
    identity,
    ...scope.run(() => useDashboardFeedback(canRead, identity)),
  };
}
beforeEach(() => {
  vi.clearAllMocks();
  mockData();
});

describe("creator feedback inbox", () => {
  it("loads all pages and provides chapter, section, page and original date context without requesting author IDs", async () => {
    mockData(records, 1);
    const f = setup();
    await f.fetchFeedback();
    expect(f.feedback.value).toHaveLength(3);
    expect(f.feedback.value[0]).toMatchObject({
      chapterTitle: "The Retina",
      sectionTitle: "Photoreceptors",
      page: "/chapter/2/the-retina",
      created_at: "2026-10-04T12:00:00Z",
    });
    expect(f.feedback.value[1].chapterTitle).toBe("No chapter assigned");
    expect(f.feedback.value[2]).toMatchObject({
      chapterTitle: "Unavailable chapter",
      sectionTitle: "Unavailable section",
    });
    expect(f.feedbackChapters.value).toHaveLength(3);
    for (const [query, options] of authedRequest.mock.calls) {
      expect(query).not.toContain("user_id");
      expect(options?.method || "GET").toBe("GET");
    }
    expect(authedRequest.mock.calls[0][0]).toContain(
      "order=created_at.desc,id.desc"
    );
    f.scope.stop();
  });

  it("combines chapter and type filters, including unassigned feedback", async () => {
    const f = setup();
    await f.fetchFeedback();
    f.feedbackChapter.value = "retina";
    expect(f.filteredFeedback.value.map((i) => i.id)).toEqual(["1"]);
    f.feedbackKind.value = "bug";
    expect(f.filteredFeedback.value).toEqual([]);
    f.feedbackChapter.value = "all";
    expect(f.filteredFeedback.value.map((i) => i.id)).toEqual(["3"]);
    f.feedbackChapter.value = "unassigned";
    f.feedbackKind.value = "all";
    expect(f.filteredFeedback.value.map((i) => i.id)).toEqual(["2"]);
    f.scope.stop();
  });

  it("does not query or present a student's own-feedback subset as the creator inbox", async () => {
    const f = setup(false);
    await f.fetchFeedback();
    expect(authedRequest).not.toHaveBeenCalled();
    expect(f.feedbackAccessDenied.value).toBe(true);
    f.scope.stop();
  });

  it.each([401, 403])(
    "shows access denied and clears prior messages on HTTP %i",
    async (status) => {
      const f = setup();
      await f.fetchFeedback();
      authedRequest.mockRejectedValue(
        Object.assign(new Error("denied"), { status })
      );
      await f.fetchFeedback();
      expect(f.feedback.value).toEqual([]);
      expect(f.feedbackAccessDenied.value).toBe(true);
      expect(f.feedbackError.value).toBeNull();
      expect(f.feedbackLoading.value).toBe(false);
      f.scope.stop();
    }
  );

  it("clears failed and empty refreshes and permits a successful retry", async () => {
    const f = setup();
    await f.fetchFeedback();
    authedRequest.mockRejectedValue(new Error("network detail"));
    await f.fetchFeedback();
    expect(f.feedback.value).toEqual([]);
    expect(f.feedbackError.value).toContain("Please try again");
    mockData([]);
    await f.fetchFeedback();
    expect(f.feedback.value).toEqual([]);
    expect(f.feedbackError.value).toBeNull();
    mockData();
    await f.fetchFeedback();
    expect(f.feedback.value).toHaveLength(3);
    f.scope.stop();
  });

  it("ignores an older refresh after a newer empty refresh", async () => {
    let resolveOld;
    authedRequest.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveOld = resolve;
        })
    );
    const f = setup();
    const old = f.fetchFeedback();
    mockData([]);
    await f.fetchFeedback();
    resolveOld(records);
    await old;
    expect(f.feedback.value).toEqual([]);
    expect(f.feedbackLoading.value).toBe(false);
    f.scope.stop();
  });

  it("revokes access immediately and discards an in-flight response after sign-out", async () => {
    let resolveOld;
    authedRequest.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveOld = resolve;
        })
    );
    const f = setup();
    const pending = f.fetchFeedback();
    f.canRead.value = false;
    expect(f.feedbackAccessDenied.value).toBe(true);
    expect(f.feedbackLoading.value).toBe(false);
    resolveOld(records);
    await pending;
    expect(f.feedback.value).toEqual([]);
    f.scope.stop();
  });

  it("clears private data on creator identity change and on disposal", async () => {
    const f = setup();
    await f.fetchFeedback();
    expect(f.feedback.value).toHaveLength(3);
    f.identity.value = "creator-two";
    expect(f.feedback.value).toEqual([]);
    expect(f.feedbackChapters.value).toEqual([]);
    await f.fetchFeedback();
    expect(f.feedback.value).toHaveLength(3);
    f.scope.stop();
    expect(f.feedback.value).toEqual([]);
  });
});
