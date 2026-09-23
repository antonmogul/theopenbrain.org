import { describe, expect, it, vi } from "vitest";
import { saveInlineEdit } from "@/editor/inlineSave";

// A fake PostgREST: GET returns the stored row, PATCH records its body and
// answers with one updated row (or none, like an RLS refusal).
function fakeRest(stored, { refused = false } = {}) {
  const patches = [];
  const rest = vi.fn(async (path, init = {}) => {
    if (!init.method) return stored ? [{ content: stored }] : [];
    patches.push({ path, body: JSON.parse(init.body) });
    return refused ? [] : [{ id: "x" }];
  });
  return { rest, patches };
}

describe("saveInlineEdit (OPENBRAIN-58)", () => {
  it("saves a plain paragraph once and keeps animationFlags", async () => {
    const { rest, patches } = fakeRest({
      blocks: [{ type: "text", content: "Old" }],
      animationFlags: { transition: true },
    });
    await saveInlineEdit(rest, {
      paragraphId: "p1",
      content: "<p>New <b>text</b></p>",
      type: "paragraph",
    });
    expect(patches).toHaveLength(1);
    expect(patches[0].path).toBe("paragraphs?id=eq.p1");
    expect(patches[0].body).toEqual({
      content: {
        blocks: [{ type: "text", content: "<p>New <b>text</b></p>" }],
        animationFlags: { transition: true },
      },
      content_text: "New text",
    });
  });

  it("refuses to flatten a paragraph with citations, and writes nothing", async () => {
    const { rest, patches } = fakeRest({
      blocks: [
        { type: "text", content: "Rods" },
        { type: "citation_ref", number: 12 },
      ],
    });
    await expect(
      saveInlineEdit(rest, {
        paragraphId: "p2",
        content: "Rods",
        type: "paragraph",
      })
    ).rejects.toThrow(/citations/);
    expect(patches).toHaveLength(0);
  });

  it("saves level-2 subsection paragraphs (they used to be dropped)", async () => {
    const { rest, patches } = fakeRest({ blocks: [{ type: "text" }] });
    await saveInlineEdit(rest, {
      paragraphId: "p3",
      content: "Deep",
      type: "subSubParagraph",
    });
    expect(patches).toHaveLength(1);
  });

  it("keeps a heading title a heading, with plain words", async () => {
    const { rest, patches } = fakeRest({
      blocks: [{ type: "heading", level: 3, content: "Old title" }],
    });
    await saveInlineEdit(rest, {
      paragraphId: "h1",
      content: "<p>New title</p>",
      type: "subsection-title",
    });
    expect(patches[0].body.content.blocks).toEqual([
      { type: "heading", level: 3, content: "New title" },
    ]);
  });

  it("reports a refused update instead of looking saved", async () => {
    const { rest } = fakeRest({ blocks: [] }, { refused: true });
    await expect(
      saveInlineEdit(rest, { paragraphId: "p4", content: "x", type: "intro" })
    ).rejects.toThrow(/didn't allow/);
  });

  it("saves section titles to the sections table as plain text", async () => {
    const { rest, patches } = fakeRest(null);
    await saveInlineEdit(rest, {
      paragraphId: "s1",
      content: "<p>Story of the eye</p>",
      type: "section-title",
    });
    expect(patches[0]).toEqual({
      path: "sections?id=eq.s1",
      body: { title: "Story of the eye" },
    });
  });
});
