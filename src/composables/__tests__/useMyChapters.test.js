import { describe, expect, it } from "vitest";
import { myChaptersFrom } from "../useMyChapters.js";

// "My chapters": every chapter the student has opened, from reading_progress
// (Stuart, 24 Sep; OPENBRAIN-101).
describe("myChaptersFrom", () => {
  const modules = [
    {
      id: "h",
      order_index: 1,
      slug: "foundations-of-neuroscience",
      title: "History",
    },
    { id: "r", order_index: 2, slug: "the-retina", title: "The Retina" },
    { id: "a", order_index: 3, slug: "attention", title: "Attention" },
  ];

  it("lists opened chapters, most recent first, with their status", () => {
    const list = myChaptersFrom(modules, [
      {
        module_id: "h",
        scroll_position: 42.4,
        last_accessed_at: "2026-09-20T10:00:00Z",
      },
      {
        module_id: "r",
        is_completed: true,
        scroll_position: 97,
        last_accessed_at: "2026-09-24T10:00:00Z",
      },
    ]);
    expect(list.map((c) => [c.module.id, c.status, c.percent])).toEqual([
      ["r", "done", 100],
      ["h", "reading", 42],
    ]);
    expect(list[1].route).toBe("/chapter/1/foundations-of-neuroscience");
  });

  it("keeps the most recent row when a chapter was read in two courses", () => {
    const [c] = myChaptersFrom(modules, [
      {
        module_id: "h",
        scroll_position: 10,
        last_accessed_at: "2026-09-01T00:00:00Z",
      },
      {
        module_id: "h",
        scroll_position: 60,
        last_accessed_at: "2026-09-05T00:00:00Z",
      },
    ]);
    expect(c.percent).toBe(60);
  });

  it("marks a chapter opened but not scrolled, and ignores unknown modules", () => {
    const list = myChaptersFrom(modules, [
      { module_id: "a", scroll_position: 0 },
      { module_id: "gone", scroll_position: 50 },
    ]);
    expect(list).toHaveLength(1);
    expect(list[0].status).toBe("opened");
  });
});
