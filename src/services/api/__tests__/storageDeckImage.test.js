import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Deck images (OPENBRAIN-129): the chapter-media bucket under
// decks/<deck id>/ (never the slug, which may name a funder), no
// media-library row, the same checks and messages as chapter images.
vi.mock("@/services/api/client", () => ({
  authedRequest: vi.fn(),
  getSession: vi.fn(() => ({ access_token: "tok" })),
}));
import { authedRequest, getSession } from "@/services/api/client";
import { publicUrl, uploadDeckImage } from "@/services/api/storage";

const file = (type, size = 1000) => ({ type, size, name: "stuart.jpg" });
const DECK = "0b4f6d1e-5c2a-4c1e-9d3b-1a2b3c4d5e6f";

describe("uploadDeckImage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({}),
    }));
  });
  afterEach(() => vi.restoreAllMocks());

  it("stores the file under the deck and returns its public URL", async () => {
    const result = await uploadDeckImage(file("image/jpeg"), {
      deckId: DECK,
    });
    const [url, init] = globalThis.fetch.mock.calls[0];
    expect(url).toMatch(
      new RegExp(`/storage/v1/object/chapter-media/decks/${DECK}/[^/]+\\.jpg$`)
    );
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({
      Authorization: "Bearer tok",
      "Content-Type": "image/jpeg",
      "x-upsert": "false",
    });
    const path = url.split("/object/chapter-media/")[1];
    expect(result).toEqual({ src: publicUrl(path), path });
    // Not added to the chapter media library.
    expect(authedRequest).not.toHaveBeenCalled();
  });

  it("files an upload without a deck id (or with a slug) under unfiled/", async () => {
    for (const deckId of ["../modules", "funding", "", undefined]) {
      const { path } = await uploadDeckImage(file("image/png"), { deckId });
      expect(path, String(deckId)).toMatch(/^decks\/unfiled\/[^/]+\.png$/);
    }
  });

  it("refuses what chapter images refuse, before any request", async () => {
    await expect(
      uploadDeckImage(file("image/svg+xml"), { deckId: DECK })
    ).rejects.toThrow(/SVG/);
    await expect(
      uploadDeckImage(file("image/png", 11 * 1048576), { deckId: DECK })
    ).rejects.toThrow(/10 MB/);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("says only creators can upload images, and when the session is gone", async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: false,
      status: 403,
      json: async () => ({ message: "new row violates row-level security" }),
    }));
    await expect(
      uploadDeckImage(file("image/png"), { deckId: DECK })
    ).rejects.toThrow("Only creators can upload images.");
    getSession.mockReturnValueOnce(null);
    await expect(
      uploadDeckImage(file("image/png"), { deckId: DECK })
    ).rejects.toThrow(/Sign in again/);
  });
});
