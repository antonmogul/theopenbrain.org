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
function fakeTable(initial, media = []) {
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
    if (path.startsWith("animations?")) return media;
    if (path === "animations" && init.method === "POST") {
      const r = { id: `media-${media.length}`, ...JSON.parse(init.body) };
      media.push(r);
      return [r];
    }
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

// Sections with UNIQUE (module_id, order_index) and (module_id, slug).
function fakeSections(initial, paragraphs = []) {
  const rows = initial.map((r) => ({ ...r }));
  const unique = () => {
    for (const key of ["order_index", "slug"]) {
      const seen = new Set();
      for (const r of rows) {
        const k = `${r.module_id}:${r[key]}`;
        if (seen.has(k))
          throw new Error(`API Error 409: duplicate ${key} ${k}`);
        seen.add(k);
      }
    }
  };
  authedRequest.mockImplementation(async (path, init = {}) => {
    if (path.startsWith("modules?"))
      return [{ id: "m1", slug: "c", status: "draft" }];
    if (path.startsWith("animations?")) return [];
    if (path.startsWith("paragraphs?")) return paragraphs;
    if (path.startsWith("sections?module_id"))
      return rows
        .map((r) => ({ ...r }))
        .sort((a, b) => a.order_index - b.order_index);
    const id = (path.match(/id=eq\.([^&]+)/) || [])[1];
    if (init.method === "PATCH") {
      const r = rows.find((x) => x.id === id);
      Object.assign(r, JSON.parse(init.body));
      unique();
      return [{ ...r }];
    }
    if (init.method === "POST") {
      const body = JSON.parse(init.body);
      const r = { id: body.id || `sec-${rows.length}`, ...body };
      rows.push(r);
      unique();
      return [{ ...r }];
    }
    if (init.method === "DELETE") {
      const i = rows.findIndex((x) => x.id === id);
      return rows.splice(i, 1);
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

const secSeed = () =>
  [
    ["introduction", "Introduction"],
    ["story", "The story of attention"],
    ["measured", "Attention is measured"],
  ].map(([slug, title], i) => ({
    id: slug,
    module_id: "m1",
    slug,
    title,
    order_index: i,
  }));

describe("useChapterEditor sections (OPENBRAIN-62)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("adds a section in the middle with a unique slug, and undoes", async () => {
    const t = fakeSections(secSeed());
    const ed = useChapterEditor("c");
    await ed.load();
    const created = await ed.addSection(1, "The story of attention");
    expect(created.slug).toBe("the-story-of-attention");
    expect(t.order()).toEqual([
      "introduction",
      created.id,
      "story",
      "measured",
    ]);
    const again = await ed.addSection(4, "Introduction");
    expect(again.slug).toBe("introduction-section"); // reserved slug avoided
    await ed.undo();
    await ed.undo();
    expect(t.order()).toEqual(["introduction", "story", "measured"]);
  });

  it("renames, moves and undoes", async () => {
    const t = fakeSections(secSeed());
    const ed = useChapterEditor("c");
    await ed.load();
    await ed.renameSection("story", "A history of attention");
    expect(t.rows.find((r) => r.id === "story").title).toBe(
      "A history of attention"
    );
    await ed.moveSection("measured", -1);
    expect(t.order()).toEqual(["introduction", "measured", "story"]);
    await ed.undo();
    expect(t.order()).toEqual(["introduction", "story", "measured"]);
    await ed.undo();
    expect(t.rows.find((r) => r.id === "story").title).toBe(
      "The story of attention"
    );
  });

  it("only deletes empty sections, and undo brings one back", async () => {
    const t = fakeSections(secSeed(), [
      { id: "p", section_id: "story", order_index: 0, content: { blocks: [] } },
    ]);
    const ed = useChapterEditor("c");
    await ed.load();
    await expect(ed.deleteSection("story")).rejects.toThrow(/blocks first/);
    await ed.deleteSection("measured");
    expect(t.order()).toEqual(["introduction", "story"]);
    await ed.undo();
    expect(t.order()).toEqual(["introduction", "story", "measured"]);
  });
});

describe("useChapterEditor cover (OPENBRAIN-67)", () => {
  beforeEach(() => vi.clearAllMocks());

  function coverApi({ refuse = false } = {}) {
    const patches = [];
    authedRequest.mockImplementation(async (path, init = {}) => {
      if (path.startsWith("modules?id=eq.m1") && init.method === "PATCH") {
        const body = JSON.parse(init.body);
        patches.push(body);
        return refuse ? [] : [{ id: "m1", ...body }];
      }
      if (path.startsWith("modules?"))
        return [{ id: "m1", slug: "s", cover_image_url: "/old.jpg" }];
      return [];
    });
    return patches;
  }

  it("sets the cover and undo restores the previous one", async () => {
    const patches = coverApi();
    const ed = useChapterEditor("s");
    await ed.load();
    await ed.setCover("https://x.supabase.co/new.jpg");
    expect(patches).toEqual([
      { cover_image_url: "https://x.supabase.co/new.jpg" },
    ]);
    expect(ed.module.value.cover_image_url).toBe(
      "https://x.supabase.co/new.jpg"
    );
    await ed.undo();
    expect(patches[1]).toEqual({ cover_image_url: "/old.jpg" });
    expect(ed.module.value.cover_image_url).toBe("/old.jpg");
  });

  it("resets to the default with null, and reports a refused save", async () => {
    const patches = coverApi();
    const ed = useChapterEditor("s");
    await ed.load();
    await ed.setCover(null);
    expect(patches).toEqual([{ cover_image_url: null }]);

    coverApi({ refuse: true });
    await expect(ed.setCover("/x.jpg")).rejects.toThrow(/didn't allow/);
    expect(ed.undoStack.value).toHaveLength(1);
  });
});

describe("useChapterEditor subsections (OPENBRAIN-70)", () => {
  beforeEach(() => vi.clearAllMocks());

  const flat = () =>
    ["a", "b", "c", "d"].map((id, i) => ({
      id,
      section_id: "s1",
      order_index: i,
      content: { blocks: [{ type: "text", content: id }] },
      content_text: id,
      is_subsection_header: false,
      subsection_level: 0,
    }));
  const levels = (t) =>
    t.rows
      .slice()
      .sort((x, y) => x.order_index - y.order_index)
      .map((r) => (r.is_subsection_header ? "H" : r.subsection_level));

  it("adds a heading and the blocks below join it, with one undo", async () => {
    const t = fakeTable(flat());
    const ed = useChapterEditor("s");
    await ed.load();
    const { row, adopted } = await ed.insertSubsection("s1", 2, [
      { type: "text", content: "Methods" },
    ]);
    expect(adopted).toBe(2);
    expect(t.order()).toEqual(["a", "b", row.id, "c", "d"]);
    expect(levels(t)).toEqual([0, 0, "H", 1, 1]);
    expect(ed.undoStack.value.map((u) => u.label)).toEqual(["Add subsection"]);
    await ed.undo();
    expect(t.order()).toEqual(["a", "b", "c", "d"]);
    expect(levels(t)).toEqual([0, 0, 0, 0]);
  });

  it("stops adopting at the next subsection heading", async () => {
    const rows = flat();
    rows[3] = { ...rows[3], is_subsection_header: true, subsection_level: 1 };
    const t = fakeTable(rows);
    const ed = useChapterEditor("s");
    await ed.load();
    await ed.insertSubsection("s1", 1, [{ type: "text", content: "H1" }]);
    expect(levels(t)).toEqual([0, "H", 1, 1, "H"]);
  });

  it("indents only under a subsection, outdents, and undoes", async () => {
    const t = fakeTable(flat());
    const ed = useChapterEditor("s");
    await ed.load();
    expect(ed.canIndent("b")).toBe(false); // no subsection above
    await ed.insertSubsection("s1", 1, [{ type: "text", content: "H" }]);
    // Taking c out takes d (after it in the subsection) out too.
    expect(await ed.shiftLevel("c", -1)).toBe(2);
    expect(levels(t)).toEqual([0, "H", 1, 0, 0]);
    expect(ed.canIndent("c")).toBe(true);
    await ed.undo();
    expect(levels(t)).toEqual([0, "H", 1, 1, 1]);
    await ed.shiftLevel("c", 1); // one deeper
    expect(levels(t)).toEqual([0, "H", 1, 2, 1]);
    expect(ed.canIndent("c")).toBe(false); // 2 is the deepest
  });

  it("ungroups a subsection and undo regroups it", async () => {
    const t = fakeTable(flat());
    const ed = useChapterEditor("s");
    await ed.load();
    const { row } = await ed.insertSubsection("s1", 1, [
      { type: "text", content: "H" },
    ]);
    await ed.shiftLevel("c", 1);
    await ed.ungroupSubsection(row.id);
    expect(levels(t)).toEqual([0, 0, 0, 0, 0]);
    await ed.undo();
    expect(levels(t)).toEqual([0, "H", 1, 2, 1]);
  });
});

describe("useChapterEditor chapter details (OPENBRAIN-70 C1, C2)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("saves title, subtitle and authors, and undo restores them", async () => {
    const patches = [];
    authedRequest.mockImplementation(async (path, init = {}) => {
      if (path.startsWith("modules?id=eq.m1") && init.method === "PATCH") {
        const body = JSON.parse(init.body);
        patches.push(body);
        return [{ id: "m1", ...body }];
      }
      if (path.startsWith("modules?"))
        return [{ id: "m1", title: "Old", description: "Long", authors: null }];
      return [];
    });
    const ed = useChapterEditor("s");
    await ed.load();
    const authors = [{ name: "Stuart Trenholm", affiliation: "MNI" }];
    await ed.setDetails({ title: "New", description: "Short", authors });
    expect(patches[0]).toEqual({ title: "New", description: "Short", authors });
    expect(ed.module.value.authors).toEqual(authors);
    await ed.undo();
    expect(patches[1]).toEqual({
      title: "Old",
      description: "Long",
      authors: null,
    });
    expect(ed.module.value.title).toBe("Old");
  });
});

describe("useChapterEditor figures: panel or text (OPENBRAIN-70 B2)", () => {
  beforeEach(() => vi.clearAllMocks());

  const skull = {
    id: "fig1",
    media_type: "image",
    title: "Incan skull",
    image_file_url: "/img/fig01-01.jpg",
    config: {
      caption: "An Incan skull.",
      images: [{ src: "/img/fig01-01.jpg", alt: "A trepanned skull" }],
    },
  };
  const rowsWith = () => {
    const r = seed().map((x) => ({ ...x, subsection_level: 0 }));
    r[0].animation_id = "fig1";
    return r;
  };

  it("moves a panel figure into the text after its paragraph, one undo", async () => {
    const t = fakeTable(rowsWith(), [skull]);
    const ed = useChapterEditor("s");
    await ed.load();
    const { row } = await ed.figureToText("a");
    expect(t.order()).toEqual(["a", row.id, "b", "c"]);
    expect(t.rows.find((r) => r.id === "a").animation_id).toBeNull();
    expect(row.content.blocks[0]).toMatchObject({
      type: "image",
      src: "/img/fig01-01.jpg",
      alt: "A trepanned skull",
      caption: "An Incan skull.",
    });
    expect(ed.undoStack.value.map((u) => u.label)).toEqual([
      "Figure into text",
    ]);
    await ed.undo();
    expect(t.order()).toEqual(["a", "b", "c"]);
    expect(t.rows.find((r) => r.id === "a").animation_id).toBe("fig1");
  });

  it("moves an image block into the panel of the paragraph before it", async () => {
    const r = seed().map((x) => ({ ...x, subsection_level: 0 }));
    r[1].content = {
      blocks: [
        { type: "image", src: "/img/new.jpg", alt: "New", caption: "Cap" },
      ],
    };
    const media = [];
    const t = fakeTable(r, media);
    const ed = useChapterEditor("s");
    await ed.load();
    const { host } = await ed.imageToPanel("b");
    expect(host.id).toBe("a");
    expect(t.order()).toEqual(["a", "c"]);
    expect(media).toHaveLength(1); // added to the library
    expect(t.rows.find((x) => x.id === "a").animation_id).toBe(media[0].id);
    await ed.undo();
    expect(t.order()).toEqual(["a", "b", "c"]);
    expect(t.rows.find((x) => x.id === "a").animation_id ?? null).toBeNull();
  });

  it("refuses to move a non-image figure into the text", async () => {
    fakeTable(rowsWith(), [{ ...skull, media_type: "lottie" }]);
    const ed = useChapterEditor("s");
    await ed.load();
    await expect(ed.figureToText("a")).rejects.toThrow(/Only image figures/);
  });
});

describe("useChapterEditor figure frames (OPENBRAIN-70 B3)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("saves frames, caption and title; undo restores them", async () => {
    const media = [
      {
        id: "fig2",
        media_type: "image",
        title: "Methods",
        image_file_url: "/a.jpg",
        config: { placeholder: true, images: [{ src: "/a.jpg" }] },
      },
    ];
    const patches = [];
    authedRequest.mockImplementation(async (path, init = {}) => {
      if (path.startsWith("modules?")) return [{ id: "m1" }];
      if (path.startsWith("animations?id=eq.fig2") && init.method === "PATCH") {
        const body = JSON.parse(init.body);
        patches.push(body);
        return [{ ...media[0], ...body }];
      }
      if (path.startsWith("animations?")) return media;
      return [];
    });
    const ed = useChapterEditor("s");
    await ed.load();
    await ed.setFigureFrames("fig2", {
      title: "Trepanation",
      caption: "Four methods",
      images: [
        { src: "/b.jpg", alt: "B", caption: "" },
        { src: "/a.jpg", alt: "", caption: "First" },
      ],
    });
    expect(patches[0]).toMatchObject({
      title: "Trepanation",
      image_file_url: "/b.jpg",
      config: {
        placeholder: true, // other config keys are kept
        caption: "Four methods",
        images: [
          { src: "/b.jpg", alt: "B" },
          { src: "/a.jpg", caption: "First" },
        ],
      },
    });
    await ed.undo();
    expect(patches[1]).toMatchObject({
      title: "Methods",
      image_file_url: "/a.jpg",
      config: { placeholder: true, images: [{ src: "/a.jpg" }] },
    });
    await expect(
      ed.setFigureFrames("fig2", { title: "x", caption: "", images: [] })
    ).rejects.toThrow(/at least one image/);
  });
});
