import { beforeEach, describe, expect, it, vi } from "vitest";
import { FUNDING_DECK } from "@/data/decks/funding.js";
import { DECK_TEMPLATES } from "@/data/decks/templates.js";

// The Decks section's data (OPENBRAIN-129): the list, the writes from it,
// and the migration-missing state before `supabase db push`.
const { authedRequest } = vi.hoisted(() => ({ authedRequest: vi.fn() }));
vi.mock("@/services/api/client", () => ({
  authedRequest,
  apiRequest: authedRequest,
  isApiConfigured: () => true,
}));

import { DECK_LIST_QUERY, deckHomeLabel, useDecks } from "../useDecks";

const ROW = {
  id: "d1",
  slug: "funding",
  title: "The Open Brain — Funding deck",
  kind: "funding",
  status: "published",
  pinned: true,
  share_token: "0123456789abcdef0123456789abcdef",
};

function apiError(status, body) {
  const error = new Error(`API Error ${status}: ${body}`);
  error.status = status;
  error.response = body;
  return error;
}

// Calls other than the list refetch.
const writes = () =>
  authedRequest.mock.calls.filter(([url]) => url !== DECK_LIST_QUERY);
const body = (call) => JSON.parse(call[1].body);

beforeEach(() => {
  authedRequest.mockReset();
  authedRequest.mockImplementation(async (url, options = {}) => {
    if (url === DECK_LIST_QUERY) return [ROW];
    if (options.method === "POST" || options.method === "PATCH")
      return [{ ...ROW, ...JSON.parse(options.body || "{}") }];
    return [];
  });
});

describe("useDecks", () => {
  it("lists decks with their first slide, newest edits first", async () => {
    const { decks, fetchDecks, loading } = useDecks();
    const pending = fetchDecks();
    expect(loading.value).toBe(true);
    await pending;
    expect(authedRequest).toHaveBeenCalledWith(
      "decks?select=id,slug,title,kind,status,slide_count,version,published_version,published_at,updated_at,pinned,share_token,first_slide:slides->0&order=updated_at.desc"
    );
    expect(decks.value).toEqual([ROW]);
    expect(loading.value).toBe(false);
  });

  it.each([
    ["a 404", apiError(404, '{"code":"PGRST205"}')],
    ["PGRST205 in the body", apiError(400, '{"code":"PGRST205"}')],
  ])("knows the table is missing on %s", async (_, err) => {
    authedRequest.mockRejectedValueOnce(err);
    const { fetchDecks, missingTable, error } = useDecks();
    await fetchDecks();
    expect(missingTable.value).toBe(true);
    expect(error.value).toMatch(/supabase db push/);
  });

  it("keeps missingTable off for other errors", async () => {
    authedRequest.mockRejectedValueOnce(apiError(500, "{}"));
    const { fetchDecks, missingTable, error } = useDecks();
    await fetchDecks();
    expect(missingTable.value).toBe(false);
    expect(error.value).toBeTruthy();
  });

  it.each([
    ["blank", 1, (slides) => slides[0].layout === "hero"],
    ["funding", FUNDING_DECK.length, (slides) => slides[0].id === "intro"],
    [
      "templates",
      DECK_TEMPLATES.length,
      (slides) => slides[0].label === "Section divider",
    ],
  ])("creates a deck from the %s starter", async (starter, count, check) => {
    const { createDeck, decks } = useDecks();
    const row = await createDeck({
      title: " New deck ",
      slug: "new-deck",
      kind: "pitch",
      starter,
    });
    const [call] = writes();
    expect(call[0]).toMatch(/^decks\?select=/);
    expect(call[1].method).toBe("POST");
    const sent = body(call);
    expect(sent).toMatchObject({
      title: "New deck",
      slug: "new-deck",
      kind: "pitch",
      schema_version: 1,
    });
    expect(sent.slides).toHaveLength(count);
    expect(check(sent.slides)).toBe(true);
    expect(row.slug).toBe("new-deck");
    // The list is refetched after a write.
    expect(authedRequest.mock.calls.at(-1)[0]).toBe(DECK_LIST_QUERY);
    expect(decks.value).toEqual([ROW]);
  });

  it("explains a taken slug", async () => {
    authedRequest.mockRejectedValueOnce(
      apiError(409, '{"code":"23505","message":"duplicate key"}')
    );
    const { createDeck } = useDecks();
    await expect(
      createDeck({ title: "T", slug: "funding", starter: "blank" })
    ).rejects.toThrow(/already exists/);
  });

  it("duplicates into the next free -copy slug, as a fresh draft", async () => {
    authedRequest.mockImplementation(async (url, options = {}) => {
      if (url === DECK_LIST_QUERY)
        return [ROW, { ...ROW, id: "d2", slug: "funding-copy" }];
      if (url.startsWith("decks?id=eq.d1&select=title"))
        return [
          {
            title: ROW.title,
            kind: "funding",
            slides: FUNDING_DECK,
            schema_version: 1,
          },
        ];
      if (options.method === "POST") return [JSON.parse(options.body)];
      return [];
    });
    const { fetchDecks, duplicateDeck, slugTaken } = useDecks();
    await fetchDecks();
    expect(slugTaken("funding-copy")).toBe(true);
    expect(slugTaken("other")).toBe(false);
    const row = await duplicateDeck(ROW);
    const sent = body(writes().find(([, o]) => o?.method === "POST"));
    expect(sent).toMatchObject({
      slug: "funding-copy-2",
      title: "Copy of The Open Brain — Funding deck",
      status: "draft",
      slides: FUNDING_DECK,
    });
    expect(sent).not.toHaveProperty("pinned");
    expect(sent).not.toHaveProperty("share_token");
    expect(row.slug).toBe("funding-copy-2");
  });

  it("tries the next suffix when the list was stale", async () => {
    let posts = 0;
    authedRequest.mockImplementation(async (url, options = {}) => {
      if (url === DECK_LIST_QUERY) return [ROW];
      if (url.startsWith("decks?id=eq.d1&select=title"))
        return [{ title: "T", kind: "talk", slides: [], schema_version: 1 }];
      if (options.method === "POST") {
        posts += 1;
        if (posts === 1) throw apiError(409, '{"code":"23505"}');
        return [JSON.parse(options.body)];
      }
      return [];
    });
    const { fetchDecks, duplicateDeck } = useDecks();
    await fetchDecks();
    const row = await duplicateDeck(ROW);
    expect(row.slug).toBe("funding-copy-2");
  });

  it("archives (and unpins), restores and unpublishes", async () => {
    const { archiveDeck, restoreDeck, unpublishDeck } = useDecks();
    await archiveDeck(ROW);
    await restoreDeck(ROW);
    await unpublishDeck(ROW);
    const patches = writes().filter(([, o]) => o?.method === "PATCH");
    expect(patches.map(([url]) => url.split("&")[0])).toEqual([
      "decks?id=eq.d1",
      "decks?id=eq.d1",
      "decks?id=eq.d1",
    ]);
    expect(patches.map(body)).toEqual([
      { status: "archived", pinned: false },
      { status: "draft" },
      { status: "draft", pinned: false },
    ]);
  });

  it("deletes, and says so when nothing was deleted", async () => {
    const { deleteDeck } = useDecks();
    authedRequest.mockImplementationOnce(async () => [{ id: "d1" }]);
    await expect(deleteDeck(ROW)).resolves.toBe(true);
    expect(authedRequest.mock.calls[0]).toEqual([
      "decks?id=eq.d1&select=id",
      { method: "DELETE", headers: { Prefer: "return=representation" } },
    ]);
    authedRequest.mockImplementationOnce(async () => []);
    await expect(deleteDeck(ROW)).rejects.toThrow(/Only creators/);
  });

  it("makes a new 32-hex share link", async () => {
    const { rotateLink } = useDecks();
    const row = await rotateLink(ROW);
    const sent = body(writes()[0]);
    expect(sent.share_token).toMatch(/^[0-9a-f]{32}$/);
    expect(sent.share_token).not.toBe(ROW.share_token);
    expect(row.share_token).toBe(sent.share_token);
  });

  it("pins a deck to /deck, and unpins only that deck", async () => {
    const { setPinned } = useDecks();
    await setPinned(ROW);
    // Off is a PATCH of this deck's row, never set_pinned_deck(null): a
    // switch left on in a stale tab must not unpin the deck shown now.
    const off = await setPinned(ROW, false);
    const calls = writes();
    expect(calls.map(([url]) => url)).toEqual([
      "rpc/set_pinned_deck",
      expect.stringMatching(/^decks\?id=eq\.d1&select=/),
    ]);
    expect(calls[1][1].method).toBe("PATCH");
    expect(calls.map(body)).toEqual([{ p_id: "d1" }, { pinned: false }]);
    expect(off).toMatchObject({ id: "d1", pinned: false });
  });

  it("names /deck by the host the site is on", () => {
    expect(deckHomeLabel()).toBe(`${window.location.host}/deck`);
  });

  it("explains /deck refusing a draft", async () => {
    authedRequest.mockRejectedValueOnce(
      apiError(400, '{"code":"P0001","message":"deck_not_published"}')
    );
    const { setPinned } = useDecks();
    await expect(setPinned(ROW)).rejects.toThrow(/Publish the deck/);
  });

  it("reads the media library's images", async () => {
    authedRequest.mockResolvedValueOnce([{ id: "m1" }]);
    const { fetchImageLibrary } = useDecks();
    await expect(fetchImageLibrary()).resolves.toEqual([{ id: "m1" }]);
    expect(authedRequest).toHaveBeenCalledWith(
      "animations?select=id,title,animation_key,media_type,image_file_url&media_type=eq.image&order=title.asc"
    );
  });

  it("builds the share URL from the token", () => {
    const { shareUrl } = useDecks();
    expect(shareUrl(ROW)).toBe(
      `${window.location.origin}/deck/s/0123456789abcdef0123456789abcdef`
    );
  });
});
