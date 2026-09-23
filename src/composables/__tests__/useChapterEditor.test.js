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

// An in-memory paragraphs table that enforces UNIQUE (section_id,
// order_index) after every write, like Postgres, so ordering bugs fail.
function fakeTable(initial) {
  const rows = initial.map((r) => ({ ...r }));
  const unique = () => {
    const seen = new Set();
    for (const r of rows) {
      const k = `${r.section_id}:${r.order_index}`;
      if (seen.has(k)) throw new Error(`API Error 409: duplicate key ${k}`);
      seen.add(k);
    }
  };
  authedRequest.mockImplementation(async (path, init = {}) => {
    if (path.startsWith("modules?")) return [{ id: "m1", status: "draft" }];
    if (path.startsWith("sections?")) return [{ id: "s1", order_index: 0 }];
    if (path.startsWith("animations?")) return [];
    if (path.startsWith("paragraphs?section_id"))
      return rows.map((r) => ({ ...r }));
    const id = (path.match(/id=eq\.([^&]+)/) || [])[1];
    if (init.method === "PATCH") {
      const r = rows.find((x) => x.id === id);
      Object.assign(r, JSON.parse(init.body));
      unique();
      return [{ ...r }];
    }
    if (init.method === "POST") {
      const body = JSON.parse(init.body);
      const r = { id: body.id || `new-${rows.length}`, ...body };
      rows.push(r);
      unique();
      return [{ ...r }];
    }
    if (init.method === "DELETE") {
      const i = rows.findIndex((x) => x.id === id);
      const [r] = rows.splice(i, 1);
      return [r];
    }
    if (path.includes("select=content")) {
      const r = rows.find((x) => x.id === id);
      return [{ content: r.content, content_text: r.content_text }];
    }
    return [];
  });
  const order = () =>
    rows
      .slice()
      .sort((a, b) => a.order_index - b.order_index)
      .map((r) => r.id);
  return { rows, order };
}

const seed = () =>
  ["a", "b", "c"].map((id, i) => ({
    id,
    section_id: "s1",
    order_index: i,
    content: { blocks: [{ type: "text", content: id }] },
    content_text: id,
    subsection_level: id === "c" ? 1 : 0,
  }));

describe("useChapterEditor structure edits (OPENBRAIN-61)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("inserts in the middle without breaking the unique order, and undoes", async () => {
    const t = fakeTable(seed());
    const ed = useChapterEditor("s");
    await ed.load();
    const row = await ed.insertParagraph("s1", 1, [
      { type: "text", content: "new" },
    ]);
    expect(t.order()).toEqual(["a", row.id, "b", "c"]);
    expect(row.subsection_level).toBe(0); // takes the level of the row before
    await ed.undo();
    expect(t.order()).toEqual(["a", "b", "c"]);
    expect(t.rows.map((r) => r.order_index).sort()).toEqual([0, 1, 2]);
  });

  it("appends at the end and inherits the previous row's subsection", async () => {
    const t = fakeTable(seed());
    const ed = useChapterEditor("s");
    await ed.load();
    const row = await ed.insertParagraph("s1", 3, [
      { type: "text", content: "z" },
    ]);
    expect(t.order()).toEqual(["a", "b", "c", row.id]);
    expect(row.subsection_level).toBe(1);
  });

  it("moves a block down and back up with undo", async () => {
    const t = fakeTable(seed());
    const ed = useChapterEditor("s");
    await ed.load();
    await ed.moveParagraph("a", 1);
    expect(t.order()).toEqual(["b", "a", "c"]);
    await ed.undo();
    expect(t.order()).toEqual(["a", "b", "c"]);
  });

  it("deletes a block and undo puts the same row back in place", async () => {
    const t = fakeTable(seed());
    const ed = useChapterEditor("s");
    await ed.load();
    await ed.deleteParagraph("b");
    expect(t.order()).toEqual(["a", "c"]);
    await ed.undo();
    expect(t.order()).toEqual(["a", "b", "c"]);
    expect(t.rows.find((r) => r.id === "b").content_text).toBe("b");
  });

  it("sets and removes a figure, with undo", async () => {
    const t = fakeTable(seed());
    const ed = useChapterEditor("s");
    await ed.load();
    await ed.setFigure("a", "anim-1", "auto");
    expect(t.rows[0]).toMatchObject({
      animation_id: "anim-1",
      animation_trigger: "auto",
    });
    await ed.setFigure("a", null);
    expect(t.rows[0]).toMatchObject({
      animation_id: null,
      animation_trigger: null,
    });
    await ed.undo();
    expect(t.rows[0].animation_id).toBe("anim-1");
  });
});
