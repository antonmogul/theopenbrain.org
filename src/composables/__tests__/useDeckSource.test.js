import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { effectScope, nextTick, reactive } from "vue";
import { flushPromises } from "@vue/test-utils";
import { FUNDING_DECK } from "@/data/decks/funding.js";
import { DECK_TEMPLATES } from "@/data/decks/templates.js";

// Where DeckView's slides come from (OPENBRAIN-129): the bundled decks, the
// pinned deck at /deck with a quiet fallback, share links that never fall
// back, and the creator's draft presenter.
const { apiRequest, authedRequest, config } = vi.hoisted(() => ({
  apiRequest: vi.fn(),
  authedRequest: vi.fn(),
  config: { configured: true },
}));
vi.mock("@/services/api/client", () => ({
  apiRequest,
  authedRequest,
  isApiConfigured: () => config.configured,
}));

import { useDeckSource } from "../useDeckSource";

const TOKEN = "0123456789abcdef0123456789abcdef";
const DB_DECK = {
  slug: "funding-2027",
  title: "Funding 2027",
  kind: "funding",
  published_at: "2026-10-07T12:00:00Z",
  slides: [{ id: "a", label: "A", layout: "section", props: { title: "A" } }],
};

let scopes = [];
let warn;
let error;

function source(props) {
  const state = reactive(props);
  const scope = effectScope();
  scopes.push(scope);
  return { state, src: scope.run(() => useDeckSource(() => state)) };
}

function apiError(status, body = "{}") {
  const err = new Error(`API Error ${status}: ${body}`);
  err.status = status;
  err.response = body;
  return err;
}

beforeEach(() => {
  apiRequest.mockReset();
  authedRequest.mockReset();
  config.configured = true;
  warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  error = vi.spyOn(console, "error");
});

afterEach(() => {
  scopes.forEach((s) => s.stop());
  scopes = [];
  // A deck page has nothing worth a console error.
  expect(error).not.toHaveBeenCalled();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("useDeckSource", () => {
  it.each([
    ["funding", FUNDING_DECK],
    ["templates", DECK_TEMPLATES],
  ])("serves the bundled %s deck with no request", (deck, entries) => {
    const { src } = source({ source: "bundled", deck });
    expect(src.status.value).toBe("ready");
    expect(src.entries.value).toBe(entries);
    expect(src.origin.value).toBe("bundled");
    expect(src.deckSlug.value).toBeNull();
    expect(apiRequest).not.toHaveBeenCalled();
    expect(authedRequest).not.toHaveBeenCalled();
  });

  describe("pinned (/deck)", () => {
    it("shows the pinned deck from the database, with a GET", async () => {
      apiRequest.mockResolvedValue(DB_DECK);
      const { src } = source({ source: "pinned", deck: "funding" });
      expect(src.status.value).toBe("loading");
      await flushPromises();
      expect(apiRequest).toHaveBeenCalledWith("rpc/get_pinned_deck", {
        signal: expect.any(AbortSignal),
      });
      expect(apiRequest.mock.calls[0][1]).not.toHaveProperty("method");
      expect(src.status.value).toBe("ready");
      expect(src.origin.value).toBe("db");
      expect(src.title.value).toBe("Funding 2027");
      expect(src.entries.value).toEqual(DB_DECK.slides);
      expect(src.deckSlug.value).toBe("funding-2027");
      expect(warn).not.toHaveBeenCalled();
    });

    it("uses the bundled copy with no request when Supabase isn't configured", () => {
      config.configured = false;
      const { src } = source({ source: "pinned", deck: "funding" });
      expect(src.status.value).toBe("ready");
      expect(src.origin.value).toBe("bundled");
      expect(src.entries.value).toBe(FUNDING_DECK);
      expect(apiRequest).not.toHaveBeenCalled();
    });

    it.each([
      ["null (nothing pinned)", () => Promise.resolve(null)],
      ["[]", () => Promise.resolve([])],
      [
        "a deck with no slides",
        () => Promise.resolve({ ...DB_DECK, slides: [] }),
      ],
      [
        "a 404 before the push",
        () => Promise.reject(apiError(404, '{"code":"PGRST202"}')),
      ],
      [
        "a network error",
        () => Promise.reject(new TypeError("Failed to fetch")),
      ],
    ])(
      "falls back to the bundled copy on %s, with one warning",
      async (_, answer) => {
        apiRequest.mockImplementation(answer);
        const { src } = source({ source: "pinned", deck: "funding" });
        await flushPromises();
        expect(src.status.value).toBe("ready");
        expect(src.origin.value).toBe("bundled");
        expect(src.entries.value).toBe(FUNDING_DECK);
        expect(src.title.value).toBe("The Open Brain — Funding deck");
        expect(warn).toHaveBeenCalledTimes(1);
      }
    );

    it("gives up after 5 s and falls back", async () => {
      vi.useFakeTimers();
      apiRequest.mockImplementation(
        (_, { signal }) =>
          new Promise((_, reject) =>
            signal.addEventListener("abort", () =>
              reject(new DOMException("Aborted", "AbortError"))
            )
          )
      );
      const { src } = source({ source: "pinned", deck: "funding" });
      await vi.advanceTimersByTimeAsync(4999);
      expect(src.status.value).toBe("loading");
      await vi.advanceTimersByTimeAsync(1);
      await flushPromises();
      expect(src.status.value).toBe("ready");
      expect(src.origin.value).toBe("bundled");
      expect(warn).toHaveBeenCalledTimes(1);
    });
  });

  describe("shared (/deck/s/<token>)", () => {
    it("shows the published snapshot", async () => {
      apiRequest.mockResolvedValue(DB_DECK);
      const { src } = source({ source: "shared", token: TOKEN });
      await flushPromises();
      expect(apiRequest).toHaveBeenCalledWith(
        `rpc/get_shared_deck?p_token=${TOKEN}`
      );
      expect(src.status.value).toBe("ready");
      expect(src.origin.value).toBe("db");
      expect(src.entries.value).toEqual(DB_DECK.slides);
    });

    it.each(["", "nope", TOKEN.toUpperCase(), `${TOKEN}0`, "../decks"])(
      "makes no request for the malformed token %j",
      (token) => {
        const { src } = source({ source: "shared", token });
        expect(src.status.value).toBe("unavailable");
        expect(apiRequest).not.toHaveBeenCalled();
      }
    );

    it("is unavailable with no request when Supabase isn't configured", () => {
      config.configured = false;
      const { src } = source({ source: "shared", token: TOKEN });
      expect(src.status.value).toBe("unavailable");
      expect(src.entries.value).toEqual([]);
      expect(apiRequest).not.toHaveBeenCalled();
      expect(warn).not.toHaveBeenCalled();
    });

    it.each([
      ["null", null],
      ["[]", []],
    ])("is unavailable on %s, never the bundled deck", async (_, answer) => {
      apiRequest.mockResolvedValue(answer);
      const { src } = source({ source: "shared", token: TOKEN });
      await flushPromises();
      expect(src.status.value).toBe("unavailable");
      expect(src.entries.value).toEqual([]);
    });

    it("is an error with a retry when the request fails", async () => {
      apiRequest.mockRejectedValueOnce(new TypeError("Failed to fetch"));
      const { src } = source({ source: "shared", token: TOKEN });
      await flushPromises();
      expect(src.status.value).toBe("error");
      expect(src.entries.value).toEqual([]);

      apiRequest.mockResolvedValueOnce(DB_DECK);
      src.retry();
      expect(src.status.value).toBe("loading");
      await flushPromises();
      expect(src.status.value).toBe("ready");
    });
  });

  describe("draft (the creator's presenter)", () => {
    it("reads the working copy, notes and all", async () => {
      authedRequest.mockResolvedValue([
        { slug: "funding", title: "Draft", slides: FUNDING_DECK },
      ]);
      const { src } = source({ source: "draft", slug: "funding" });
      await flushPromises();
      expect(authedRequest).toHaveBeenCalledWith(
        "decks?slug=eq.funding&select=slug,title,slides"
      );
      expect(src.status.value).toBe("ready");
      expect(src.origin.value).toBe("db");
      expect(src.deckSlug.value).toBe("funding");
      expect(src.entries.value[0].notes).toBeTruthy();
    });

    it("is unavailable for a slug with no deck", async () => {
      authedRequest.mockResolvedValue([]);
      const { src } = source({ source: "draft", slug: "nope" });
      await flushPromises();
      expect(src.status.value).toBe("unavailable");
      expect(src.deckSlug.value).toBe("nope");
    });

    it("is unavailable with no request when Supabase isn't configured", () => {
      config.configured = false;
      const { src } = source({ source: "draft", slug: "funding" });
      expect(src.status.value).toBe("unavailable");
      expect(src.deckSlug.value).toBe("funding");
      expect(authedRequest).not.toHaveBeenCalled();
    });

    it("is an error when the request fails", async () => {
      authedRequest.mockRejectedValue(apiError(500));
      const { src } = source({ source: "draft", slug: "funding" });
      await flushPromises();
      expect(src.status.value).toBe("error");
    });
  });

  it("reloads when the props change, ignoring the stale answer", async () => {
    let resolveFirst;
    apiRequest
      .mockImplementationOnce(() => new Promise((r) => (resolveFirst = r)))
      .mockResolvedValueOnce(DB_DECK);
    const { state, src } = source({ source: "shared", token: TOKEN });
    state.token = "f".repeat(32);
    await nextTick();
    await flushPromises();
    expect(src.status.value).toBe("ready");
    resolveFirst(null);
    await flushPromises();
    expect(src.status.value).toBe("ready");
    expect(src.entries.value).toEqual(DB_DECK.slides);

    state.source = "bundled";
    state.deck = "templates";
    await nextTick();
    expect(src.entries.value).toBe(DECK_TEMPLATES);
  });
});
