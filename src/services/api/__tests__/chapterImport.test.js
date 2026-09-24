import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/api/client", () => ({ post: vi.fn(), del: vi.fn() }));
vi.mock("@/services/api/versions", () => ({
  fetchVersions: vi.fn(),
  createVersion: vi.fn(),
}));
import { post, del } from "@/services/api/client";
import { fetchVersions, createVersion } from "@/services/api/versions";
import { importChapter } from "@/services/api/chapterImport";

// OPENBRAIN-78: the wizard's import is all-or-nothing.
const meta = { title: "Stress", slug: "stress", order_index: 4 };
const sections = [
  {
    title: "One",
    slug: "one",
    order_index: 0,
    paragraphs: [{ content_text: "a", order_index: 0 }],
  },
  {
    title: "Two",
    slug: "two",
    order_index: 1,
    paragraphs: [
      { content_text: "b", order_index: 0 },
      { content_text: "c", order_index: 1 },
    ],
  },
];
const echo = (prefix) => (table, rows) =>
  Array.isArray(rows)
    ? rows.map((r, i) => ({ id: `${prefix}${i}`, ...r }))
    : [{ id: `${prefix}0`, ...rows }];

describe("importChapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchVersions.mockResolvedValue([{ id: "v-draft", status: "draft" }]);
    del.mockResolvedValue({ success: true });
  });

  it("writes the chapter in bulk, paragraphs under the right sections", async () => {
    post.mockImplementation(async (table, rows) => echo(table[0])(table, rows));
    const chapter = await importChapter({ meta, sections, userId: "u1" });
    expect(chapter.id).toBe("m0");
    const tables = post.mock.calls.map((c) => c[0]);
    expect(tables).toEqual(["modules", "sections", "paragraphs"]);
    const paras = post.mock.calls[2][1];
    expect(paras.map((p) => p.section_id)).toEqual(["s0", "s1", "s1"]);
    expect(post.mock.calls[0][1].content_version_id).toBe("v-draft");
    expect(del).not.toHaveBeenCalled();
  });

  it("removes the partial chapter (and a version it made) when a step fails", async () => {
    fetchVersions.mockResolvedValue([]);
    createVersion.mockResolvedValue({ id: "v-new" });
    post.mockImplementation(async (table, rows) => {
      if (table === "paragraphs") throw new Error("API Error 400: bad row");
      return echo(table[0])(table, rows);
    });
    await expect(importChapter({ meta, sections })).rejects.toThrow(
      /bad row.*Nothing was saved/
    );
    expect(del.mock.calls.map((c) => c[0])).toEqual([
      "modules?id=eq.m0",
      "content_versions?id=eq.v-new",
    ]);
  });

  it("says so when the clean-up fails too", async () => {
    post.mockImplementation(async (table, rows) => {
      if (table === "sections") throw new Error("offline");
      return echo(table[0])(table, rows);
    });
    del.mockRejectedValue(new Error("still offline"));
    await expect(importChapter({ meta, sections })).rejects.toThrow(
      /Part of the chapter may remain/
    );
  });

  it("creates nothing to clean when the chapter row itself fails", async () => {
    post.mockRejectedValue(new Error("duplicate slug"));
    await expect(importChapter({ meta, sections })).rejects.toThrow(
      /^duplicate slug$/
    );
    expect(del).not.toHaveBeenCalled();
  });
});
