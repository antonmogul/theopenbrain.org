import { describe, expect, it } from "vitest";
import {
  groupReviewNotes,
  matchesReviewFilters,
  reviewAnchorLabel,
  reviewNoteHref,
  reviewNotesMarkdown,
  reviewStatusLabel,
  reviewTypeLabel,
  reviewViewLabel,
} from "../reviewNotes.mjs";
import {
  REVIEW_MODULES,
  REVIEW_NOTES,
  REVIEW_REPLIES,
  REVIEW_SECTIONS,
} from "@/stories/reviewNoteFixtures.js";

const [retinaContent, historyFigure, retinaBug] = REVIEW_NOTES;
const retina = REVIEW_MODULES[1];

describe("reviewer notes helpers (OPENBRAIN-203)", () => {
  it("filters by chapter, type and status, with 'open' meaning new, doing or question", () => {
    const ids = (filters) =>
      REVIEW_NOTES.filter((n) => matchesReviewFilters(n, filters)).map((n) =>
        n.id.slice(-2)
      );
    expect(ids({ chapter: "all", type: "all", status: "all" })).toEqual([
      "01",
      "02",
      "03",
    ]);
    expect(ids({ status: "open" })).toEqual(["01", "02"]);
    expect(ids({ chapter: "the-retina", status: "all" })).toEqual(["01", "03"]);
    expect(ids({ type: "figure" })).toEqual(["02"]);
    expect(ids({ status: "done" })).toEqual(["03"]);
    expect(ids({ chapter: "the-retina", type: "bug", status: "open" })).toEqual(
      []
    );
  });

  it("links to the paragraph, else the section, through the module row", () => {
    expect(reviewNoteHref(retinaContent, retina)).toBe(
      "/chapter/2/the-retina#3b9a8f1e-2c4d-4e5f-8a6b-7c8d9e0f1a2b"
    );
    expect(reviewNoteHref(historyFigure, REVIEW_MODULES[0])).toBe(
      "/chapter/1/foundations-of-neuroscience#galen"
    );
    // The anchor's ids stand in when the row has none.
    expect(
      reviewNoteHref(
        {
          section_slug: null,
          anchor: { paragraphId: "3b9a8f1e-2c4d-4e5f-8a6b-7c8d9e0f1a2b" },
        },
        retina
      )
    ).toBe("/chapter/2/the-retina#3b9a8f1e-2c4d-4e5f-8a6b-7c8d9e0f1a2b");
    // Nothing usable as a hash: the chapter itself. Unknown chapter: no link.
    expect(
      reviewNoteHref({ section_slug: 'x"><script>', anchor: {} }, retina)
    ).toBe("/chapter/2/the-retina");
    expect(reviewNoteHref(retinaContent, null)).toBeNull();
    expect(reviewNoteHref(retinaContent, { slug: "the-retina" })).toBeNull();
  });

  it("names the place and the view a note was left from", () => {
    expect(reviewAnchorLabel(historyFigure)).toBe(
      "Fig 07 · Galen silences a squealing pig"
    );
    expect(
      reviewAnchorLabel({
        anchor: { figureNumber: "Fig 2", figureTitle: "The eye" },
      })
    ).toBe("Fig 2 · The eye");
    expect(reviewAnchorLabel({ anchor: { widgetId: "sdt" } })).toBe(
      "Widget sdt"
    );
    expect(reviewAnchorLabel({ anchor: {}, paragraph_id: "p" })).toBe(
      "A paragraph"
    );
    expect(reviewAnchorLabel({})).toBe("No place recorded");
    expect(reviewViewLabel(retinaBug)).toBe("390×844 · one-column");
    expect(
      reviewViewLabel({
        anchor: { viewport: { w: 1024, h: 768 }, theme: "dark" },
      })
    ).toBe("1024×768 · dark");
    expect(reviewTypeLabel("content")).toBe("Content");
    expect(reviewStatusLabel("wont_do")).toBe("Won't do");
  });

  it("groups chapter → section in reading order, newest first, unknown places last", () => {
    const stray = {
      ...retinaBug,
      id: "stray",
      section_slug: null,
      anchor: {},
      created_at: "2026-11-18T23:00:00Z",
    };
    const unknownChapter = {
      ...retinaBug,
      id: "unknown",
      chapter_slug: "stress",
      section_slug: "cortisol",
    };
    const later = { ...retinaContent, id: "later", created_at: "2026-11-19" };
    const groups = groupReviewNotes(
      [...REVIEW_NOTES, stray, unknownChapter, later],
      REVIEW_MODULES,
      REVIEW_SECTIONS
    );
    expect(
      groups.map((c) => [
        c.title,
        c.sections.map((s) => [s.title, s.notes.map((n) => n.id.slice(-5))]),
      ])
    ).toEqual([
      [
        "Foundations of Neuroscience",
        [["Galen and the animal spirits", ["d5e02"]]],
      ],
      [
        "The Retina",
        [
          ["Introduction", ["d5e03"]],
          ["Photoreceptors", ["later", "d5e01"]],
          ["No section", ["stray"]],
        ],
      ],
      ["stress", [["cortisol", ["known"]]]],
    ]);
    expect(groups[1].module).toBe(retina);
    expect(groups[2].module).toBeNull();
  });

  it("prints the pull script's tracker table, one escaped row per note", () => {
    const table = reviewNotesMarkdown(
      [
        ...REVIEW_NOTES,
        {
          ...retinaBug,
          id: "pipe",
          note: "a | b\nsecond line " + "x".repeat(300),
        },
      ],
      REVIEW_MODULES,
      REVIEW_SECTIONS,
      { base: "https://example.test" }
    ).split("\n");
    expect(table).toHaveLength(6);
    expect(table[2]).toBe(
      "| 1 | Foundations of Neuroscience | Galen and the animal spirits | Figure | In progress | Fig 07 · Galen silences a squealing pig | The pig should face the other way, toward the text. | Maura, designer | [open](https://example.test/chapter/1/foundations-of-neuroscience#galen) |"
    );
    expect(table.join("\n")).toContain(
      "| “Rods outnumber cones about 10 to 1” → “Rods outnumber cones about 20 to 1” |"
    );
    const pipe = table.find((row) => row.includes("a \\| b second line"));
    expect(pipe).toMatch(/x…/);
    expect(pipe.split(" | ")).toHaveLength(9);
    expect(reviewNotesMarkdown([])).toMatch(/No notes\.$/);
  });

  it("threads replies under their note, oldest first; an orphan stays a row", () => {
    const orphan = {
      ...REVIEW_REPLIES[0],
      id: "orphan",
      parent_id: "not-in-the-list",
    };
    const groups = groupReviewNotes(
      [...REVIEW_NOTES, ...REVIEW_REPLIES, orphan],
      REVIEW_MODULES,
      REVIEW_SECTIONS
    );
    const history = groups[0].sections;
    const maura = history[0].notes[0];
    expect(maura.reviewer_name).toBe("Maura");
    expect(maura.replies.map((r) => r.reviewer_name)).toEqual([
      "Sonia",
      "Stuart",
    ]);
    expect(history.flatMap((s) => s.notes.map((n) => n.id))).toEqual([
      maura.id,
      "orphan",
    ]);
    expect(groups[1].sections[0].notes[0].replies).toEqual([]);

    const table = reviewNotesMarkdown(
      [...REVIEW_NOTES, ...REVIEW_REPLIES],
      REVIEW_MODULES,
      REVIEW_SECTIONS
    ).split("\n");
    expect(table.slice(2, 5).map((r) => r.split(" | ")[0])).toEqual([
      "| 1",
      "| 1↳",
      "| 1↳",
    ]);
    expect(table[3]).toContain("the mirrored version reads better");
    expect(table[5].startsWith("| 2 |")).toBe(true);
  });
});

it("excludes author-checked notes from open and selects them explicitly", () => {
  expect(matchesReviewFilters({ status: "verified" }, { status: "open" })).toBe(
    false
  );
  expect(
    matchesReviewFilters({ status: "verified" }, { status: "verified" })
  ).toBe(true);
});
