import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import ReviewMyNotes from "../ReviewMyNotes.vue";
import ReviewAllNotes from "../ReviewAllNotes.vue";
import ReviewPins from "../ReviewPins.vue";
import ReviewWidget from "../ReviewWidget.vue";
import {
  REVIEW_KEYS,
  reloadReviewState,
  resetReviewForTests,
  setReviewTransport,
  useReviewFeedback,
} from "@/composables/useReviewFeedback";

const ID = "aaaaaaaa-0000-4000-8000-000000000001";
const note = {
  id: ID,
  clientId: "r_secret",
  state: "sent",
  chapterSlug: "the-retina",
  status: "done",
  label: "Figure legend",
  note: "Wrong date",
  reply: "Fixed the date",
  payload: { client_id: "r_secret" },
};
const button = (w, text) => w.findAll("button").find((b) => b.text() === text);
function seed(notes = [note]) {
  localStorage.setItem(REVIEW_KEYS.queue, JSON.stringify(notes));
  localStorage.setItem(
    REVIEW_KEYS.identity,
    JSON.stringify({ name: "Stuart", role: "author" })
  );
  reloadReviewState();
}
beforeEach(() => {
  resetReviewForTests();
});
afterEach(() => {
  setReviewTransport(null);
  document.body.innerHTML = "";
});

describe("author check-off", () => {
  it("shows fixed reply and author controls, requires a comment and preserves it after failure", async () => {
    const action = vi
      .fn()
      .mockRejectedValueOnce(new Error("Offline. Try again."))
      .mockResolvedValue(true);
    const w = mount(ReviewMyNotes, {
      props: { notes: [note], authorAction: action },
    });
    expect(w.text()).toContain("Fixed: please check");
    expect(w.text()).toContain("Fixed the date");
    expect(button(w, "Show me")).toBeTruthy();
    await button(w, "Not quite").trigger("click");
    expect(w.get("textarea").attributes("required")).toBeDefined();
    expect(
      button(w, "Reopen with comment").attributes("disabled")
    ).toBeDefined();
    await w.get("textarea").setValue("Still 1543 in the legend");
    await w.get("form").trigger("submit");
    await flushPromises();
    expect(w.get('[role="alert"]').text()).toContain("Offline");
    expect(w.get("textarea").element.value).toBe("Still 1543 in the legend");
    await w.get("form").trigger("submit");
    await flushPromises();
    expect(action).toHaveBeenLastCalledWith(
      ID,
      "reopen",
      "Still 1543 in the legend"
    );
    expect(w.find("textarea").exists()).toBe(false);
    await button(w, "Looks good ✓").trigger("click");
    expect(action).toHaveBeenLastCalledWith(ID, "verify", "");
    await w.setProps({ notes: [{ ...note, status: "verified" }] });
    expect(w.text()).toContain("✓Checked by author");
    expect(button(w, "Looks good ✓")).toBeUndefined();
    w.unmount();
  });

  it("gives All notes controls only for an id held in the author's queue", async () => {
    const w = mount(ReviewAllNotes, {
      props: {
        groups: [{ key: "", notes: [{ ...note, replies: [] }] }],
        authorAction: vi.fn(),
      },
    });
    expect(button(w, "Looks good ✓")).toBeUndefined();
    await w.setProps({ ownIds: [ID] });
    expect(button(w, "Looks good ✓")).toBeTruthy();
    expect(w.text()).toContain("Show checked");
    w.unmount();
  });

  it("sends stored proof only on an explicit action and retains the queue payload", async () => {
    seed();
    const action = vi.fn();
    action.mockResolvedValue({
      id: ID,
      status: "verified",
      verified_at: "2026-11-19T12:00:00Z",
      reply: "Fixed",
    });
    setReviewTransport({ authorAction: action });
    const review = useReviewFeedback();
    expect(review.awaitingCheckCount.value).toBe(1);
    await expect(review.authorAction("not-mine", "verify")).rejects.toThrow(
      /browser/
    );
    await expect(review.authorAction(ID, "reopen", " ")).rejects.toThrow(
      /comment/
    );
    expect(action).not.toHaveBeenCalled();
    await review.authorAction(ID, "verify");
    expect(action).toHaveBeenCalledWith(ID, "r_secret", "verify", null);
    expect(review.queue.value[0]).toMatchObject({
      clientId: "r_secret",
      verifiedAt: "2026-11-19T12:00:00Z",
      payload: note.payload,
    });
    expect(review.awaitingCheckCount.value).toBe(0);
    expect(JSON.parse(localStorage.getItem(REVIEW_KEYS.queue))[0].status).toBe(
      "verified"
    );
  });

  it("does not let a slow status GET undo a completed author check", async () => {
    seed();
    let resolveStatus;
    setReviewTransport({
      statuses: () =>
        new Promise((resolve) => {
          resolveStatus = resolve;
        }),
      authorAction: async () => ({ id: ID, status: "verified" }),
    });
    const review = useReviewFeedback();
    const pending = review.refreshStatuses();
    await review.authorAction(ID, "verify");
    resolveStatus([{ id: ID, status: "done" }]);
    await pending;
    expect(review.queue.value[0].status).toBe("verified");
    expect(review.awaitingCheckCount.value).toBe(0);
  });

  it("does not let a slow All notes GET undo a completed author check", async () => {
    seed();
    let resolveList;
    const list = vi.fn().mockResolvedValueOnce([{ id: ID, status: "done" }]);
    list.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveList = resolve;
        })
    );
    setReviewTransport({
      list,
      authorAction: async () => ({ id: ID, status: "verified" }),
    });
    const review = useReviewFeedback();
    await review.fetchChapterNotes("the-retina");
    const pending = review.fetchChapterNotes("the-retina");
    await review.authorAction(ID, "verify");
    resolveList([{ id: ID, status: "done" }]);
    await pending;
    expect(review.chapterNotes.value[0].status).toBe("verified");
  });

  it("checks sent status once at load, again when opened, and never sends queued notes on load", async () => {
    seed([note, { ...note, id: null, clientId: "queued", state: "queued" }]);
    const statuses = vi.fn().mockResolvedValue([{ id: ID, status: "done" }]);
    const submit = vi.fn().mockResolvedValue({ id: "sent", status: "new" });
    setReviewTransport({ statuses, submit });
    const w = mount(ReviewWidget, {
      props: { force: true, figureRecords: [], chapterSlug: "the-retina" },
    });
    await flushPromises();
    expect(statuses).toHaveBeenCalledTimes(1);
    expect(submit).not.toHaveBeenCalled();
    expect(w.get('[data-testid="review-check-badge"]').text()).toBe("◇ 1");
    await w.get('[data-testid="review-fab"]').trigger("click");
    await flushPromises();
    expect(statuses).toHaveBeenCalledTimes(2);
    w.unmount();
    resetReviewForTests();
    statuses.mockClear();
    const first = mount(ReviewWidget, {
      props: { force: true, figureRecords: [] },
    });
    await flushPromises();
    expect(statuses).not.toHaveBeenCalled();
    first.unmount();
  });

  it("paints pins by status with labels and symbols, hiding checked by default", async () => {
    const target = document.createElement("div");
    target.setAttribute("data-paragraph-id", ID);
    target.getBoundingClientRect = () => ({
      left: 80,
      top: 100,
      width: 400,
      height: 100,
    });
    document.body.append(target);
    const items = ["new", "doing", "done", "verified"].map((status, i) => ({
      id: status,
      n: i + 1,
      status,
      label: "Paragraph",
      anchor: { kind: "paragraph", paragraphId: ID },
    }));
    const w = mount(ReviewPins, {
      props: { items },
      global: { stubs: { Teleport: true } },
    });
    await new Promise((r) => requestAnimationFrame(r));
    expect(w.findAll("button").map((b) => b.attributes("data-status"))).toEqual(
      ["new", "doing", "done"]
    );
    expect(w.get('[data-status="done"]').attributes("aria-label")).toContain(
      "Fixed: please check"
    );
    await w.setProps({ showChecked: true });
    await new Promise((r) => requestAnimationFrame(r));
    expect(w.get('[data-status="verified"]').text()).toContain("✓ 4");
    w.unmount();
  });
});
