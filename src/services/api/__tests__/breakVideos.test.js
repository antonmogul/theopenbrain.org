import { describe, expect, it, vi, beforeEach } from "vitest";
import { get } from "../client";
import { fetchBreakVideo } from "../breakVideos";
vi.mock("../client", () => ({ get: vi.fn() }));
beforeEach(() => vi.clearAllMocks());
describe("block-owned break video routes", () => {
  it("reads the live block before the catalog, so author media edits appear at both URLs", async () => {
    get.mockResolvedValueOnce([
      {
        content: {
          blocks: [
            {
              type: "break_video",
              videoSlug: "baden",
              src: "/custom.mp4",
              poster: "/custom.webp",
              title: "Author title",
              credit: "Author credit",
            },
          ],
        },
      },
    ]);
    expect(await fetchBreakVideo("baden")).toMatchObject({
      src: "/custom.mp4",
      poster: "/custom.webp",
      caption: "Author title — Author credit",
    });
    expect(get).toHaveBeenCalledTimes(1);
    expect(get.mock.calls[0][0]).toContain("paragraphs?content->blocks=cs.");
  });
  it("resolves an unplaced old URL from its RLS catalog", async () => {
    get.mockResolvedValueOnce([]).mockResolvedValueOnce([
      {
        data: {
          videoSlug: "neitz-myopia",
          src: "/neitz.mp4",
          title: "Neitz",
        },
      },
    ]);
    expect(await fetchBreakVideo("neitz-myopia")).toMatchObject({
      title: "Neitz",
      src: "/neitz.mp4",
    });
  });
  it("keeps old blocks playable before the catalog migration and rejects unknown assets", async () => {
    get
      .mockResolvedValueOnce([
        {
          content: {
            blocks: [
              { type: "break_video", videoSlug: "baden", title: "Tom Baden" },
              { type: "text", content: "Upside down?" },
            ],
          },
        },
      ])
      .mockRejectedValueOnce({ status: 404 });
    expect(await fetchBreakVideo("baden")).toMatchObject({
      src: "/publicAssets/videos/baden.mp4",
      poster: "/publicAssets/videos/baden.webp",
      caption: "Tom Baden — Upside down?",
    });
    get.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    expect(await fetchBreakVideo("unknown")).toBeNull();
    expect(await fetchBreakVideo("../../private")).toBeNull();
  });
  it("surfaces authorization and connection failures", async () => {
    get.mockResolvedValueOnce([]).mockRejectedValueOnce({ status: 403 });
    await expect(fetchBreakVideo("baden")).rejects.toEqual({ status: 403 });
  });
});
