import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/api/client", () => ({ authedRequest: vi.fn() }));
import { authedRequest } from "@/services/api/client";
import {
  useChapterEditor,
  blocksToPlainText,
} from "@/composables/useChapterEditor";

const stored = {
  content: {
    blocks: [{ type: "text", content: "Old" }],
    animationFlags: { transition: true },
  },
  content_text: "Old",
};

function api({ refuse = false } = {}) {
  const patches = [];
  authedRequest.mockImplementation(async (path, init = {}) => {
    if (path.startsWith("modules?"))
      return [{ id: "m1", slug: "s", status: "draft" }];
    if (path.startsWith("sections?")) return [{ id: "s1", order_index: 0 }];
    if (path.startsWith("animations?")) return [];
    if (path.startsWith("paragraphs?section_id"))
      return [{ id: "p1", section_id: "s1", order_index: 0, ...stored }];
    if (path.startsWith("paragraphs?id=eq.p1&select")) return [stored];
    if (init.method === "PATCH") {
      const body = JSON.parse(init.body);
      patches.push(body);
      return refuse ? [] : [{ id: "p1", section_id: "s1", ...body }];
    }
    return [];
  });
  return patches;
}

describe("useChapterEditor (OPENBRAIN-60)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("saves blocks once, keeps other content keys, and can undo", async () => {
    const patches = api();
    const ed = useChapterEditor("s");
    await ed.load();
    await ed.saveBlocks("p1", [
      { type: "text", content: "New <em>words</em>" },
      { type: "citation_ref", number: 2 },
    ]);
    expect(patches).toHaveLength(1);
    expect(patches[0].content).toEqual({
      blocks: [
        { type: "text", content: "New <em>words</em>" },
        { type: "citation_ref", number: 2 },
      ],
      animationFlags: { transition: true },
    });
    expect(patches[0].content_text).toBe("New words2");
    expect(ed.paragraphs.value[0].content_text).toBe("New words2");
    expect(ed.undoStack.value).toHaveLength(1);

    await ed.undo();
    expect(patches).toHaveLength(2);
    expect(patches[1].content).toEqual(stored.content);
    expect(ed.undoStack.value).toHaveLength(0);
  });

  it("reports a refused save and records no undo", async () => {
    api({ refuse: true });
    const ed = useChapterEditor("s");
    await ed.load();
    await expect(
      ed.saveBlocks("p1", [{ type: "text", content: "x" }])
    ).rejects.toThrow(/didn't allow/);
    expect(ed.undoStack.value).toHaveLength(0);
  });

  it("groups paragraphs by section in order", async () => {
    api();
    const ed = useChapterEditor("s");
    await ed.load();
    expect(ed.paragraphsBySection.value.get("s1")).toHaveLength(1);
    expect(ed.stats.value.sections).toBe(1);
  });
});

describe("blocksToPlainText", () => {
  it("is what the reader shows, without tags", () => {
    expect(
      blocksToPlainText([
        { type: "text", content: "Rods <b>and</b> cones" },
        { type: "figure_placeholder", number: "F" },
      ])
    ).toBe("Rods and conesFigure F");
  });
});
