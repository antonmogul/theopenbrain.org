import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock the REST client. fetchChapter issues (in order):
//   modules?slug=...  →  [module]
//   sections?module_id=...  →  [sections]
//   paragraphs?section_id=in.(...)  →  [paragraphs]
//   animations?id=in.(...)  →  [anim key rows]
// We route the mock by endpoint substring so a single implementation serves all calls.
vi.mock("@/services/api/client", () => ({
  apiRequest: vi.fn(),
}));

import { apiRequest } from "@/services/api/client";
import { useChapter } from "@/composables/useChapter";

const MODULE_ID = "mod-1";

/**
 * Build a mock that returns the given sections + paragraphs (+ optional animation
 * key rows) from the sequential REST calls fetchChapter makes.
 */
function mockRest({ sections, paragraphs, animKeys = [] }) {
  apiRequest.mockImplementation((endpoint) => {
    if (endpoint.startsWith("modules?"))
      return Promise.resolve([
        { id: MODULE_ID, title: "The Retina", slug: "the-retina" },
      ]);
    if (endpoint.startsWith("sections?")) return Promise.resolve(sections);
    if (endpoint.startsWith("paragraphs?")) return Promise.resolve(paragraphs);
    if (endpoint.startsWith("animations?")) return Promise.resolve(animKeys);
    return Promise.resolve([]);
  });
}

const SECTION_ID = "sec-main";

/** A minimal main (non-intro) section. order_index 1 keeps it out of the intro slot. */
function mainSection() {
  return [{ id: SECTION_ID, title: "Main", slug: "main", order_index: 1 }];
}

/** Header row helper. */
function header(id, title, animKey) {
  return {
    id,
    section_id: SECTION_ID,
    order_index: id,
    content: { blocks: [] },
    content_text: title,
    is_subsection_header: true,
    subsection_level: 1,
    animation_id: animKey ? `a-${animKey}` : null,
    animation_key: animKey || null,
    animation_title: animKey || "",
  };
}

/** Plain paragraph row at a given level. */
function para(id, level, opts = {}) {
  return {
    id,
    section_id: SECTION_ID,
    order_index: id,
    content: { blocks: [{ type: "text", content: `p${id}` }] },
    content_text: "",
    is_subsection_header: false,
    subsection_level: level,
    animation_id: opts.animKey ? `a-${opts.animKey}` : null,
    animation_key: opts.animKey || null,
    animation_title: opts.animKey || "",
    ...opts.row,
  };
}

async function transform(paragraphs) {
  mockRest({ sections: mainSection(), paragraphs });
  const { fetchChapter, transformedData } = useChapter();
  await fetchChapter("the-retina");
  // main sections exclude intro (order 0) — our only section is order 1
  return transformedData.value.sections.find((s) => s.id === SECTION_ID);
}

describe("useChapter reconstructNesting flush (CODE-FIX #1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("keeps ALL 5 consecutive subsection headers (Diseases strip), each with its animation", async () => {
    // 5 consecutive level-1 headers, each linking a distinct animation. Pre-fix this
    // collapsed to a single subSection (only the last survived).
    const rows = [
      header(1, "Normal vision", "animationNormalVision"),
      header(2, "Cataracts", "animationCataracts"),
      header(3, "Glaucoma", "animationGlaucoma"),
      header(4, "Diabetic retinopathy", "animationDiabeticRetinopathy"),
      header(5, "AMD", "animationAgeRelatedMacularDegeneration"),
    ];
    const section = await transform(rows);

    // mergeConsecutiveSubSections groups the 5 flushed entries into ONE wrapper.
    const wrappers = section.paragraphs.filter((p) => p.subSection);
    expect(wrappers).toHaveLength(1);
    expect(wrappers[0].subSection).toHaveLength(5);
    expect(wrappers[0].subSection.map((s) => s.animation.id)).toEqual([
      "animationNormalVision",
      "animationCataracts",
      "animationGlaucoma",
      "animationDiabeticRetinopathy",
      "animationAgeRelatedMacularDegeneration",
    ]);
  });

  it("attaches a level-1 body paragraph to its preceding header", async () => {
    const rows = [header(1, "Sub A"), para(2, 1)];
    const section = await transform(rows);
    const sub = section.paragraphs.find((p) => p.subSection).subSection[0];
    expect(sub.title).toBe("Sub A");
    expect(sub.paragraphs).toHaveLength(1);
    expect(sub.paragraphs[0].text).toContain("p2");
  });

  it("wraps level-2 rows under their header as a subSubSection", async () => {
    const rows = [header(1, "Sub A"), para(2, 2), para(3, 2)];
    const section = await transform(rows);
    const sub = section.paragraphs.find((p) => p.subSection).subSection[0];
    const subSub = sub.paragraphs.find((x) => x.subSubSection);
    expect(subSub.subSubSection).toHaveLength(2);
  });

  it("flushes an open subSection when a top-level (level-0) paragraph follows", async () => {
    const rows = [header(1, "Sub A"), para(2, 1), para(3, 0)];
    const section = await transform(rows);
    // subSection wrapper comes first, then the top-level paragraph at the end
    expect(section.paragraphs.some((p) => p.subSection)).toBe(true);
    const last = section.paragraphs[section.paragraphs.length - 1];
    expect(last.text).toContain("p3");
  });

  it("discards an orphan level-2 group so it does not leak into the next header (shared-transformer safety)", async () => {
    // level-2 row before any header → orphan; a later header must NOT inherit it.
    const rows = [para(1, 2), header(2, "Sub A"), para(3, 1)];
    const section = await transform(rows);
    const sub = section.paragraphs.find((p) => p.subSection).subSection[0];
    expect(sub.title).toBe("Sub A");
    // Sub A has one body paragraph (p3) and NO phantom subSubSection from the orphan.
    expect(sub.paragraphs.some((x) => x.subSubSection)).toBe(false);
  });

  it("handles an empty-title header without throwing", async () => {
    const rows = [header(1, ""), para(2, 1)];
    const section = await transform(rows);
    const sub = section.paragraphs.find((p) => p.subSection).subSection[0];
    expect(sub.title).toBe("");
    expect(sub.paragraphs).toHaveLength(1);
  });

  it("Chapter 2+ flat no-nesting shape is unchanged (regression guard)", async () => {
    const rows = [para(1, 0), para(2, 0), para(3, 0)];
    const section = await transform(rows);
    // No subSection wrappers; three plain paragraphs preserved in order.
    expect(section.paragraphs.some((p) => p.subSection)).toBe(false);
    expect(section.paragraphs.map((p) => p.text)).toEqual([
      expect.stringContaining("p1"),
      expect.stringContaining("p2"),
      expect.stringContaining("p3"),
    ]);
  });
});

describe("useChapter transformParagraph fullscreen (CODE-FIX #4)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("does NOT emit para.animation when the row is a fullscreen (animation_full) row", async () => {
    const rows = [
      para(1, 0, {
        animKey: "animationPhototransduction",
        row: {
          content: {
            blocks: [
              {
                type: "animation_full",
                animationId: "animationPhototransduction",
              },
            ],
          },
        },
      }),
    ];
    const section = await transform(rows);
    const p = section.paragraphs[0];
    expect(p.animationFull).toBe(true);
    expect(p.animation).toBeUndefined();
  });

  it("still emits para.animation for a normal (non-fullscreen) animation row", async () => {
    const rows = [para(1, 0, { animKey: "animationEyeStructur" })];
    const section = await transform(rows);
    const p = section.paragraphs[0];
    expect(p.animationFull).toBeUndefined();
    expect(p.animation.id).toBe("animationEyeStructur");
  });
});
