import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { effectScope, ref } from "vue";
import { flushPromises } from "@vue/test-utils";
import { FUNDING_DECK } from "@/data/decks/funding.js";

// The deck editor's document (OPENBRAIN-129): a debounced compare-and-swap
// save, conflicts and refusals told apart, undo with coalescing, slide
// operations, publishing and discarding unpublished changes.
const { authedRequest } = vi.hoisted(() => ({ authedRequest: vi.fn() }));
vi.mock("@/services/api/client", () => ({
  authedRequest,
  apiRequest: authedRequest,
  isApiConfigured: () => true,
}));

import { REFUSED_MESSAGE, useDeckEditor } from "../useDeckEditor";

const clone = (v) => JSON.parse(JSON.stringify(v));

function apiError(status, body = "{}") {
  const err = new Error(`API Error ${status}: ${body}`);
  err.status = status;
  err.response = body;
  return err;
}

// A one-row stand-in for PostgREST: PATCH honours version=eq.n like the
// real filter, publish_deck and discard_deck_changes raise deck_conflict on
// a stale version, as the SQL does.
let row;
let refuse;
function server(url, options = {}) {
  const method = options.method || "GET";
  const body = options.body ? JSON.parse(options.body) : null;
  if (method === "GET" && url.startsWith("decks?slug=eq.")) {
    const slug = decodeURIComponent(url.match(/slug=eq\.([^&]*)/)[1]);
    return row && row.slug === slug ? [clone(row)] : [];
  }
  if (method === "GET" && url.startsWith("decks?id=eq.")) {
    if (!row) return [];
    const out = {
      id: row.id,
      version: row.version,
      updated_at: row.updated_at,
    };
    if (/select=[^&]*\bslides\b/.test(url))
      Object.assign(out, {
        title: row.title,
        slides: clone(row.slides),
        published_slides: clone(row.published_slides),
        published_version: row.published_version,
      });
    return [out];
  }
  if (method === "PATCH") {
    const version = Number(url.match(/version=eq\.(\d+)/)?.[1]);
    if (!row || refuse || row.version !== version) return [];
    Object.assign(row, clone(body), { updated_at: "2026-10-07T14:02:00Z" });
    const meta = clone(row);
    delete meta.slides;
    delete meta.published_slides;
    return [meta];
  }
  if (url === "rpc/publish_deck") {
    if (row.version !== body.p_version)
      throw apiError(400, '{"code":"P0001","message":"deck_conflict"}');
    Object.assign(row, {
      status: "published",
      published_slides: clone(row.slides),
      published_title: row.title,
      published_version: row.version,
      published_at: "2026-10-07T14:03:00Z",
    });
    return clone(row);
  }
  if (url === "rpc/discard_deck_changes") {
    if (row.version !== body.p_version || !row.published_slides)
      throw apiError(400, '{"code":"P0001","message":"deck_conflict"}');
    Object.assign(row, {
      slides: clone(row.published_slides),
      title: row.published_title ?? row.title,
      version: row.version + 1,
      published_version: row.version + 1,
      updated_at: "2026-10-07T14:04:00Z",
    });
    return clone(row);
  }
  throw new Error(`unexpected ${method} ${url}`);
}

const patches = () =>
  authedRequest.mock.calls.filter(([, o]) => o?.method === "PATCH");

let scopes = [];
async function editor(slug = "funding") {
  const scope = effectScope();
  scopes.push(scope);
  const ed = scope.run(() => useDeckEditor(slug));
  await ed.load();
  return ed;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-07T14:00:00Z"));
  refuse = false;
  row = {
    id: "d1",
    slug: "funding",
    title: "Funding deck",
    kind: "funding",
    status: "draft",
    version: 1,
    published_version: null,
    published_slides: null,
    published_title: null,
    pinned: false,
    share_token: "0123456789abcdef0123456789abcdef",
    updated_at: "2026-10-07T13:00:00Z",
    slides: clone(FUNDING_DECK.slice(0, 3)),
  };
  authedRequest.mockReset();
  authedRequest.mockImplementation(async (url, options) =>
    server(url, options)
  );
});

afterEach(() => {
  scopes.forEach((s) => s.stop());
  scopes = [];
  vi.useRealTimers();
});

describe("loading", () => {
  it("loads the deck by slug and selects the first slide", async () => {
    const ed = await editor();
    expect(authedRequest).toHaveBeenCalledWith(
      "decks?slug=eq.funding&select=*"
    );
    expect(ed.status.value).toBe("ready");
    expect(ed.title.value).toBe("Funding deck");
    expect(ed.entries.value).toEqual(FUNDING_DECK.slice(0, 3));
    expect(ed.deck.value).toMatchObject({ id: "d1", version: 1 });
    expect(ed.deck.value).not.toHaveProperty("slides");
    expect(ed.selectedId.value).toBe("intro");
    expect(ed.selected.value.id).toBe("intro");
    expect(ed.selectedIndex.value).toBe(0);
    expect(ed.saveState.value).toBe("saved");
    expect(ed.canUndo.value).toBe(false);
  });

  it("follows a slug ref", async () => {
    const slug = ref("nope");
    const ed = await editor(slug);
    expect(ed.status.value).toBe("not-found");
    slug.value = "funding";
    await vi.runAllTimersAsync();
    await flushPromises();
    expect(ed.status.value).toBe("ready");
  });

  it.each([
    ["missing-table", apiError(404, '{"code":"PGRST205"}')],
    ["error", apiError(500)],
    ["error", new TypeError("Failed to fetch")],
  ])("is %s when the load fails that way", async (state, err) => {
    authedRequest.mockRejectedValueOnce(err);
    const ed = await editor();
    expect(ed.status.value).toBe(state);
    expect(ed.loadError.value).toBeTruthy();
  });
});

describe("saving", () => {
  it("saves the whole deck 1 s after the last change, with version=eq.n", async () => {
    const ed = await editor();
    ed.update("props.title", "The Open Brain!");
    expect(ed.saveState.value).toBe("pending");
    await vi.advanceTimersByTimeAsync(600);
    ed.setTitle("Funding deck 2027");
    await vi.advanceTimersByTimeAsync(999);
    expect(patches()).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(1);
    await flushPromises();

    expect(patches()).toHaveLength(1);
    const [url, options] = patches()[0];
    expect(url).toMatch(/^decks\?id=eq\.d1&version=eq\.1&select=/);
    expect(options.headers).toEqual({ Prefer: "return=representation" });
    const body = JSON.parse(options.body);
    expect(body).toEqual({
      title: "Funding deck 2027",
      slides: expect.any(Array),
      schema_version: 1,
      version: 2,
    });
    expect(body.slides[0].props.title).toBe("The Open Brain!");
    expect(ed.saveState.value).toBe("saved");
    expect(ed.deck.value.version).toBe(2);
    expect(ed.lastSavedAt.value).toEqual(new Date("2026-10-07T14:00:01.600Z"));

    // The next save carries the new version.
    ed.update("label", "Opening");
    await vi.advanceTimersByTimeAsync(1000);
    await flushPromises();
    expect(patches()[1][0]).toMatch(/version=eq\.2/);
  });

  it("flushes on demand", async () => {
    const ed = await editor();
    ed.update("label", "Opening");
    await expect(ed.flush()).resolves.toBe(true);
    expect(patches()).toHaveLength(1);
    // Nothing left: no second request.
    await expect(ed.flush()).resolves.toBe(true);
    expect(patches()).toHaveLength(1);
  });

  it("calls zero rows and a newer version a conflict", async () => {
    const ed = await editor();
    row.version = 4; // another tab saved
    row.updated_at = "2026-10-07T13:59:00Z";
    ed.update("label", "Mine");
    await expect(ed.flush()).resolves.toBe(false);
    expect(ed.saveState.value).toBe("conflict");
    expect(ed.conflict.value).toEqual({
      version: 4,
      updatedAt: "2026-10-07T13:59:00Z",
    });
    // No autosave while the creator decides.
    ed.update("label", "Mine again");
    await vi.advanceTimersByTimeAsync(2000);
    expect(patches()).toHaveLength(1);

    // Keep mine: overwrite their version.
    await expect(ed.resolveConflict("mine")).resolves.toBe(true);
    expect(patches()[1][0]).toMatch(/version=eq\.4/);
    expect(JSON.parse(patches()[1][1].body).version).toBe(5);
    expect(ed.saveState.value).toBe("saved");
    expect(row.slides[0].label).toBe("Mine again");
  });

  it("loads theirs on request, with mine one undo away", async () => {
    const ed = await editor();
    row.version = 3;
    row.title = "Their title";
    ed.setTitle("My title");
    await ed.flush();
    expect(ed.saveState.value).toBe("conflict");
    await ed.resolveConflict("theirs");
    expect(ed.status.value).toBe("ready");
    expect(ed.title.value).toBe("Their title");
    expect(ed.deck.value.version).toBe(3);
    expect(ed.saveState.value).toBe("saved");
    // Load theirs is not the end of the edits it dropped: undo brings them
    // back and saves them over theirs.
    expect(ed.canUndo.value).toBe(true);
    ed.undo();
    expect(ed.title.value).toBe("My title");
    await ed.flush();
    expect(row).toMatchObject({ title: "My title", version: 4 });
  });

  it("counts its own save as saved when only the answer was lost", async () => {
    const ed = await editor();
    // The PATCH lands (row 1 → 2) but the connection drops before the reply.
    authedRequest.mockImplementationOnce(async (url, options) => {
      server(url, options);
      throw new TypeError("Failed to fetch");
    });
    ed.update("label", "Edit 1");
    await ed.flush();
    expect(ed.saveState.value).toBe("error");
    expect(row.version).toBe(2);
    expect(ed.deck.value.version).toBe(1);

    // The next save finds version 2: this tab's own save, not another tab's.
    ed.update("notes", "Edit 2");
    await expect(ed.flush()).resolves.toBe(true);
    expect(ed.saveState.value).toBe("saved");
    expect(ed.conflict.value).toBeNull();
    expect(row.version).toBe(3);
    expect(row.slides[0]).toMatchObject({ label: "Edit 1", notes: "Edit 2" });
    expect(ed.deck.value.version).toBe(3);
  });

  it("publishes what is here when a lost save landed and was undone", async () => {
    const ed = await editor();
    const original = ed.entries.value[0].label;
    authedRequest.mockImplementationOnce(async (url, options) => {
      server(url, options);
      throw new TypeError("Failed to fetch");
    });
    ed.update("label", "Landed anyway");
    await ed.flush();
    expect(row.version).toBe(2);
    // Undo makes the tab look saved, so publish goes out at version 1: the
    // conflict is this tab's own save, which is adopted, and what is here
    // (the undone label) is saved and published, not dropped.
    ed.undo();
    const meta = await ed.publish();
    expect(meta).toMatchObject({ status: "published", version: 3 });
    expect(ed.saveState.value).toBe("saved");
    expect(ed.conflict.value).toBeNull();
    expect(row.published_slides[0].label).toBe(original);
    expect(row.published_version).toBe(3);
  });

  it("still calls it a conflict when the lost save didn't land", async () => {
    const ed = await editor();
    authedRequest.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    ed.update("label", "Mine");
    await ed.flush();
    // Another tab saves something else meanwhile.
    Object.assign(row, { version: 2, title: "Theirs" });
    ed.update("notes", "More of mine");
    await expect(ed.flush()).resolves.toBe(false);
    expect(ed.saveState.value).toBe("conflict");
    expect(row.title).toBe("Theirs");
  });

  it("retries a lost save with nothing new as saved, not a conflict", async () => {
    const ed = await editor();
    authedRequest.mockImplementationOnce(async (url, options) => {
      server(url, options);
      throw new TypeError("Failed to fetch");
    });
    ed.setTitle("Landed");
    await ed.flush();
    await expect(ed.retry()).resolves.toBe(true);
    expect(ed.saveState.value).toBe("saved");
    expect(ed.deck.value.version).toBe(2);
    expect(patches()).toHaveLength(2);
  });

  it.each([
    ["the same version", () => (refuse = true)],
    ["no row at all", () => (row.slug = "gone")],
  ])("calls zero rows with %s a refusal", async (_, arrange) => {
    const ed = await editor();
    arrange();
    if (row.slug === "gone") row = null;
    ed.update("label", "X");
    await expect(ed.flush()).resolves.toBe(false);
    expect(ed.saveState.value).toBe("refused");
    expect(ed.saveError.value).toBe(REFUSED_MESSAGE);
  });

  it("calls a 403 a refusal", async () => {
    const ed = await editor();
    authedRequest.mockRejectedValueOnce(apiError(403, '{"code":"42501"}'));
    ed.update("label", "X");
    await ed.flush();
    expect(ed.saveState.value).toBe("refused");
  });

  it("keeps the local copy on a network error and retries on the next change", async () => {
    const ed = await editor();
    authedRequest.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    ed.update("label", "Offline edit");
    await vi.advanceTimersByTimeAsync(1000);
    await flushPromises();
    expect(ed.saveState.value).toBe("error");
    expect(ed.saveError.value).toMatch(/connection/);
    expect(ed.entries.value[0].label).toBe("Offline edit");

    ed.update("notes", "Back online");
    expect(ed.saveState.value).toBe("pending");
    await vi.advanceTimersByTimeAsync(1000);
    await flushPromises();
    expect(ed.saveState.value).toBe("saved");
    expect(row.slides[0]).toMatchObject({
      label: "Offline edit",
      notes: "Back online",
    });
  });

  it("retries on request", async () => {
    const ed = await editor();
    authedRequest.mockRejectedValueOnce(apiError(500));
    ed.update("label", "X");
    await ed.flush();
    expect(ed.saveState.value).toBe("error");
    await expect(ed.retry()).resolves.toBe(true);
    expect(ed.saveState.value).toBe("saved");
  });
});

describe("edits that change nothing", () => {
  it("re-choosing the current value is no edit: no save, no undo step", async () => {
    Object.assign(row, {
      status: "published",
      version: 3,
      published_version: 3,
      published_slides: clone(row.slides),
    });
    const ed = await editor();
    ed.select("team");
    ed.update("props.eyebrow", ed.selected.value.props.eyebrow);
    ed.update("props.people", clone(ed.selected.value.props.people));
    // Removing a key that isn't there.
    ed.update("props.people.0.position", undefined);
    expect(ed.canUndo.value).toBe(false);
    expect(ed.saveState.value).toBe("saved");
    await vi.advanceTimersByTimeAsync(2000);
    expect(patches()).toHaveLength(0);
    expect(ed.dirtySincePublish.value).toBe(false);
    // A real change still is one.
    ed.update("props.eyebrow", "New");
    expect(ed.canUndo.value).toBe(true);
    await ed.flush();
    expect(row.version).toBe(4);
  });

  it("refuses an id another slide has, so every slide stays selectable", async () => {
    const ed = await editor();
    ed.select("team");
    expect(ed.updateEntry("team", "id", "intro")).toBe(false);
    expect(ed.entries.value.map((e) => e.id)).toEqual([
      "intro",
      "team",
      "textbook-today",
    ]);
    expect(ed.selectedId.value).toBe("team");
    expect(ed.canUndo.value).toBe(false);
    // A free id is fine, and the selection follows it.
    expect(ed.updateEntry("team", "id", "people")).toBe(true);
    expect(ed.selectedId.value).toBe("people");
    expect(ed.selected.value.label).toBe("Team");
  });
});

describe("history", () => {
  it("coalesces edits to one field within 800 ms into one step", async () => {
    const ed = await editor();
    ed.update("props.title", "T");
    await vi.advanceTimersByTimeAsync(300);
    ed.update("props.title", "Th");
    await vi.advanceTimersByTimeAsync(300);
    ed.update("props.title", "The");
    await vi.advanceTimersByTimeAsync(900);
    ed.update("props.title", "The end");
    // A different field is its own step.
    ed.update("props.kicker", "K");

    ed.undo();
    expect(ed.entries.value[0].props.kicker).toBe("Funding overview · 2026");
    expect(ed.entries.value[0].props.title).toBe("The end");
    ed.undo();
    expect(ed.entries.value[0].props.title).toBe("The");
    ed.undo();
    expect(ed.entries.value[0].props.title).toBe("The Open Brain");
    expect(ed.canUndo.value).toBe(false);

    ed.redo();
    expect(ed.entries.value[0].props.title).toBe("The");
    expect(ed.canRedo.value).toBe(true);
    // A new edit clears the redo stack.
    ed.update("label", "New");
    expect(ed.canRedo.value).toBe(false);
  });

  it("undoes the title and saves the result", async () => {
    const ed = await editor();
    ed.setTitle("Renamed");
    await ed.flush();
    ed.undo();
    expect(ed.title.value).toBe("Funding deck");
    expect(ed.saveState.value).toBe("pending");
    await ed.flush();
    expect(row.title).toBe("Funding deck");
  });

  it("keeps 50 steps", async () => {
    const ed = await editor();
    for (let i = 0; i < 60; i++) ed.toggleHidden("team");
    let steps = 0;
    while (ed.canUndo.value) {
      ed.undo();
      steps += 1;
    }
    expect(steps).toBe(50);
  });

  it("edits immutably: earlier snapshots are untouched", async () => {
    const ed = await editor();
    const before = ed.entries.value;
    ed.update("props.people.0.name", "Someone else");
    expect(before[1].props.people[0].name).toBe("Stuart Trenholm");
    ed.select("team");
    ed.update("props.people.0.name", "Someone else");
    expect(ed.entries.value[1].props.people[0].name).toBe("Someone else");
    expect(before[1].props.people[0].name).toBe("Stuart Trenholm");
    // undefined removes a key.
    ed.update("props.eyebrow", undefined);
    expect(ed.entries.value[1].props).not.toHaveProperty("eyebrow");
  });
});

describe("slides", () => {
  it("inserts after a slide with a fresh id and selects it", async () => {
    const ed = await editor();
    const id = ed.insert(
      { id: "intro", label: "Copy", layout: "section", props: { title: "S" } },
      { after: "intro" }
    );
    expect(id).toMatch(/^s-[0-9a-f]{8}$/);
    expect(ed.entries.value.map((e) => e.id)).toEqual([
      "intro",
      id,
      "team",
      "textbook-today",
    ]);
    expect(ed.selectedId.value).toBe(id);
    ed.undo();
    expect(ed.entries.value).toHaveLength(3);
  });

  it("duplicates, moves, hides and removes", async () => {
    const ed = await editor();
    const copy = ed.duplicate("team");
    expect(ed.entries.value[2]).toMatchObject({ id: copy, label: "Team" });

    ed.move(copy, -2);
    expect(ed.entries.value[0].id).toBe(copy);
    ed.moveTo(copy, 99);
    expect(ed.entries.value.at(-1).id).toBe(copy);

    ed.toggleHidden("team");
    expect(ed.entries.value[1].hidden).toBe(true);
    ed.toggleHidden("team");
    expect(ed.entries.value[1]).not.toHaveProperty("hidden");

    ed.select("team");
    ed.remove("team");
    expect(ed.entries.value.map((e) => e.id)).toEqual([
      "intro",
      "textbook-today",
      copy,
    ]);
    expect(ed.selectedId.value).toBe("textbook-today");
    ed.select(copy);
    ed.remove(copy);
    expect(ed.selectedId.value).toBe("textbook-today");
  });

  it("switches layout, carrying over what fits", async () => {
    const ed = await editor();
    const dropped = ed.changeLayout("intro", "section");
    expect(dropped.sort()).toEqual([
      "brand",
      "footnote",
      "image",
      "kicker",
      "size",
    ]);
    expect(ed.entries.value[0]).toMatchObject({
      id: "intro",
      layout: "section",
      props: { title: "The Open Brain" },
    });
    ed.undo();
    expect(ed.entries.value[0].layout).toBe("hero");
  });

  it("renumbers eyebrows as one undoable step", async () => {
    const ed = await editor();
    // Nothing to renumber: no step, so an Undo can't take an earlier edit.
    ed.update("label", "Earlier edit");
    const steps = () => {
      let n = 0;
      while (ed.canUndo.value) {
        ed.undo();
        n += 1;
      }
      for (let i = 0; i < n; i += 1) ed.redo();
      return n;
    };
    const before = steps();
    expect(ed.renumber()).toBe(false);
    expect(steps()).toBe(before);
    ed.moveTo("intro", 2);
    expect(ed.renumber()).toBe(true);
    expect(ed.entries.value.map((e) => e.props.eyebrow)).toEqual([
      "01 · Team",
      "02 · Product",
      undefined,
    ]);
    ed.undo();
    expect(ed.entries.value[0].props.eyebrow).toBe("02 · Team");
  });
});

describe("problems", () => {
  it("counts problems per slide and adds overflow from the preview", async () => {
    const ed = await editor();
    expect(ed.errorCount.value).toBe(0);
    expect(ed.problemsById.value.team).toEqual({ errors: 0, warnings: 5 });

    ed.update("props.title", "");
    expect(ed.errorCount.value).toBe(1);
    expect(ed.problemsById.value.intro).toEqual({ errors: 1, warnings: 0 });

    ed.setOverflow("intro", true);
    expect(ed.problems.value).toContainEqual(
      expect.objectContaining({ slideId: "intro", code: "W_OVERFLOW" })
    );
    expect(ed.problemsById.value.intro).toEqual({ errors: 1, warnings: 1 });
    ed.setOverflow("intro", false);
    expect(ed.warningCount.value).toBe(6);
  });
});

describe("publishing", () => {
  it("saves, then publishes the version it saved", async () => {
    const ed = await editor();
    ed.update("label", "Opening");
    const meta = await ed.publish();
    const call = authedRequest.mock.calls.find(
      ([url]) => url === "rpc/publish_deck"
    );
    expect(call[1].method).toBe("POST");
    expect(JSON.parse(call[1].body)).toEqual({ p_id: "d1", p_version: 2 });
    expect(meta).toMatchObject({ status: "published", published_version: 2 });
    expect(ed.deck.value).not.toHaveProperty("slides");
    expect(ed.dirtySincePublish.value).toBe(false);

    ed.update("label", "Changed");
    expect(ed.dirtySincePublish.value).toBe(true);
    await ed.flush();
    expect(ed.dirtySincePublish.value).toBe(true);
  });

  it("runs the conflict flow on deck_conflict", async () => {
    const ed = await editor();
    authedRequest.mockImplementation(async (url, options) => {
      if (url === "rpc/publish_deck") {
        row.version = 7;
        throw apiError(400, '{"code":"P0001","message":"deck_conflict"}');
      }
      return server(url, options);
    });
    await expect(ed.publish()).resolves.toBeNull();
    expect(ed.saveState.value).toBe("conflict");
    expect(ed.conflict.value.version).toBe(7);
  });

  it("refuses to publish with errors", async () => {
    const ed = await editor();
    ed.update("props.title", "");
    await expect(ed.publish()).rejects.toThrow("Fix 1 problem to publish.");
    expect(
      authedRequest.mock.calls.some(([url]) => url === "rpc/publish_deck")
    ).toBe(false);
  });

  it("discards unpublished changes on the server, undoably", async () => {
    const ed = await editor();
    await ed.publish();
    ed.update("label", "Unpublished edit");
    ed.setTitle("Unpublished title");
    await ed.flush();
    expect(ed.deck.value.version).toBe(2);

    await expect(ed.discardUnpublished()).resolves.toBe(true);
    const call = authedRequest.mock.calls.findLast(
      ([url]) => url === "rpc/discard_deck_changes"
    );
    expect(call[1].method).toBe("POST");
    // Only the version: the snapshot comes from the row, not this tab.
    expect(JSON.parse(call[1].body)).toEqual({ p_id: "d1", p_version: 2 });
    expect(row).toMatchObject({ version: 3, published_version: 3 });
    expect(ed.deck.value).toMatchObject({ version: 3, published_version: 3 });
    expect(ed.entries.value[0].label).toBe("Intro");
    expect(ed.title.value).toBe("Funding deck");
    expect(ed.dirtySincePublish.value).toBe(false);
    expect(ed.saveState.value).toBe("saved");

    ed.undo();
    expect(ed.entries.value[0].label).toBe("Unpublished edit");
    expect(ed.title.value).toBe("Unpublished title");
    expect(ed.dirtySincePublish.value).toBe(true);
  });

  it("discards to what funders see now, even after another tab published", async () => {
    // Published at version 3 (P0); the working copy has moved on to 5.
    Object.assign(row, {
      status: "published",
      version: 5,
      published_version: 3,
      published_slides: clone(FUNDING_DECK.slice(0, 2)),
      published_title: "P0 title",
      title: "Working title",
    });
    const tabA = await editor();
    const tabB = await editor();
    expect(tabB.dirtySincePublish.value).toBe(true);

    // Tab A publishes the working copy (version stays 5).
    await tabA.publish();
    expect(row.published_slides).toHaveLength(3);

    // Tab B still remembers P0, but the discard restores what is live.
    await expect(tabB.discardUnpublished()).resolves.toBe(true);
    expect(row).toMatchObject({
      version: 6,
      published_version: 6,
      title: "Working title",
    });
    expect(row.slides).toEqual(row.published_slides);
    expect(row.slides).toHaveLength(3);
    expect(tabB.entries.value).toHaveLength(3);
    expect(tabB.title.value).toBe("Working title");
    expect(tabB.dirtySincePublish.value).toBe(false);
  });

  it("treats a discard whose reply was lost, but landed, as not a conflict", async () => {
    Object.assign(row, {
      status: "published",
      version: 2,
      published_version: 1,
      published_slides: clone(FUNDING_DECK.slice(0, 2)),
    });
    const ed = await editor();
    authedRequest.mockImplementationOnce(async (url, options) => {
      server(url, options);
      throw new TypeError("Failed to fetch");
    });
    await expect(ed.discardUnpublished()).rejects.toThrow(/connection/);
    expect(row.version).toBe(3);
    // Told it failed, the creator edits on: that goes out over the discard.
    ed.update("label", "Kept going");
    await expect(ed.flush()).resolves.toBe(true);
    expect(ed.saveState.value).toBe("saved");
    expect(row).toMatchObject({ version: 4, published_version: 3 });
    expect(row.slides).toHaveLength(3);
    expect(row.slides[0].label).toBe("Kept going");
    expect(ed.dirtySincePublish.value).toBe(true);
  });

  it("calls a stale discard a conflict", async () => {
    Object.assign(row, {
      status: "published",
      version: 2,
      published_version: 1,
      published_slides: clone(FUNDING_DECK.slice(0, 2)),
    });
    const ed = await editor();
    row.version = 4; // another tab saved
    await expect(ed.discardUnpublished()).resolves.toBe(false);
    expect(ed.saveState.value).toBe("conflict");
    expect(ed.conflict.value.version).toBe(4);
    expect(row.version).toBe(4);
  });

  it("merges a row from elsewhere into the meta", async () => {
    const ed = await editor();
    ed.applyMeta({ share_token: "f".repeat(32), slides: [] });
    expect(ed.deck.value.share_token).toBe("f".repeat(32));
    expect(ed.deck.value).not.toHaveProperty("slides");
    expect(ed.entries.value).toHaveLength(3);
  });
});
