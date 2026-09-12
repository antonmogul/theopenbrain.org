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

// Draft gating (OPENBRAIN-33): the composable asks useAuth whether the
// reader is a creator. Hoisted so the mock factory can reference it.
const { creatorFlag, authState } = vi.hoisted(() => ({
  creatorFlag: { value: false },
  authState: { isAuthenticated: false, profileLoading: false, loading: false },
}));
vi.mock("@/composables/useAuth", () => ({
  useAuth: () => ({
    isCreator: creatorFlag,
    isAuthenticated: {
      get value() {
        return authState.isAuthenticated;
      },
    },
    profileLoading: {
      get value() {
        return authState.profileLoading;
      },
    },
    loading: {
      get value() {
        return authState.loading;
      },
    },
  }),
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
        {
          id: MODULE_ID,
          title: "The Retina",
          slug: "the-retina",
          status: "published",
        },
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

describe("useChapter missing chapter", () => {
  it("returns a controlled not-found error for a retired slug", async () => {
    apiRequest.mockResolvedValue([]);
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});

    const { fetchChapter, error } = useChapter();
    const result = await fetchChapter("visual-perception-ux");

    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
    expect(error.value).toBe(
      'Chapter with slug "visual-perception-ux" not found'
    );
  });

  it("clears a previously loaded chapter when the next route slug is missing", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});

    mockRest({ sections: mainSection(), paragraphs: [para(1, 0)] });
    const { fetchChapter, chapterData, transformedData } = useChapter();

    await fetchChapter("the-retina");
    expect(chapterData.value?.id).toBe(MODULE_ID);
    expect(transformedData.value?.moduleId).toBe(MODULE_ID);

    apiRequest.mockResolvedValue([]);
    const result = await fetchChapter("visual-perception-ux");

    expect(result.data).toBeNull();
    expect(chapterData.value).toBeNull();
    expect(transformedData.value).toBeNull();
  });
});

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

describe("useChapter transform: chapter identity and box sections", () => {
  beforeEach(() => vi.clearAllMocks());

  async function load(sections) {
    mockRest({ sections, paragraphs: [] });
    const { fetchChapter, transformedData } = useChapter();
    await fetchChapter("the-retina");
    return transformedData.value;
  }

  it("carries the module title and slug on the transformed chapter", async () => {
    const t = await load([
      {
        id: "intro",
        title: "Introduction",
        slug: "introduction",
        order_index: 0,
      },
      ...mainSection(),
    ]);
    expect(t.title).toBe("The Retina");
    expect(t.slug).toBe("the-retina");
  });

  it("names the hero after the module, keeping the intro section's own title alongside", async () => {
    const t = await load([
      {
        id: "intro",
        title: "Introduction",
        slug: "introduction",
        order_index: 0,
      },
      ...mainSection(),
    ]);
    expect(t.intro[0].title).toBe("The Retina");
    expect(t.intro[0].sectionTitle).toBe("Introduction");
  });

  it("marks sections slugged box-* as breakout boxes and the rest as sections", async () => {
    const t = await load([
      {
        id: "s1",
        title: "Where is my mind?",
        slug: "where-is-my-mind",
        order_index: 1,
      },
      {
        id: "b1",
        title: "Descartes and dualism",
        slug: "box-descartes",
        order_index: 2,
      },
    ]);
    expect(t.sections.map((s) => [s.slug, s.kind])).toEqual([
      ["where-is-my-mind", "section"],
      ["box-descartes", "box"],
    ]);
  });
});

/*
 * OPENBRAIN-33: unpublished modules are creator-only. The public catalog
 * already filters status=published; this closes the direct-URL path with the
 * same "not found" error a missing slug produces, so the URL does not reveal
 * that a draft exists.
 */
describe("useChapter draft gating", () => {
  function mockModule(status) {
    apiRequest.mockImplementation((endpoint) => {
      if (endpoint.startsWith("modules?"))
        return Promise.resolve([
          { id: MODULE_ID, title: "Draft", slug: "draft-chapter", status },
        ]);
      if (endpoint.startsWith("sections?"))
        return Promise.resolve([
          { id: SECTION_ID, title: "Main", slug: "main", order_index: 1 },
        ]);
      if (endpoint.startsWith("paragraphs?")) return Promise.resolve([]);
      return Promise.resolve([]);
    });
  }

  beforeEach(() => {
    creatorFlag.value = false;
  });

  it("hides a draft from non-creators as not found", async () => {
    mockModule("draft");
    const { fetchChapter, transformedData } = useChapter();
    const { data, error } = await fetchChapter("draft-chapter");
    expect(data).toBeNull();
    expect(String(error?.message)).toContain("not found");
    expect(transformedData.value).toBeNull();
  });

  it("renders a draft for creators", async () => {
    creatorFlag.value = true;
    mockModule("draft");
    const { fetchChapter } = useChapter();
    const { data, error } = await fetchChapter("draft-chapter");
    expect(error).toBeNull();
    expect(data?.moduleId).toBe(MODULE_ID);
  });

  it("renders a published chapter for everyone", async () => {
    mockModule("published");
    const { fetchChapter } = useChapter();
    const { data, error } = await fetchChapter("draft-chapter");
    expect(error).toBeNull();
    expect(data?.moduleId).toBe(MODULE_ID);
  });

  it("treats a missing or blank status as unpublished (no bypass)", async () => {
    for (const status of [undefined, null, ""]) {
      mockModule(status);
      const { fetchChapter } = useChapter();
      const { data, error } = await fetchChapter("draft-chapter");
      expect(data).toBeNull();
      expect(String(error?.message)).toContain("not found");
    }
  });

  it("waits for the profile to load before deciding, so a creator on a direct load is not refused", async () => {
    // Session present, profile still loading, role unknown → the gate must
    // wait, not answer "not found" from the pre-hydration false.
    creatorFlag.value = false;
    authState.isAuthenticated = true;
    authState.profileLoading = true;
    setTimeout(() => {
      creatorFlag.value = true;
      authState.profileLoading = false;
    }, 20);
    mockModule("draft");
    const { fetchChapter } = useChapter();
    const { data, error } = await fetchChapter("draft-chapter");
    expect(error).toBeNull();
    expect(data?.moduleId).toBe(MODULE_ID);
    authState.isAuthenticated = false;
  });
});

/*
 * OPENBRAIN-35: markdown bold that leaked through an import must render as
 * bold, not as literal asterisks. Single asterisks are prose, not emphasis.
 */
import {
  markdownBoldToHtml,
  contentBlocksToHTML,
} from "@/composables/chapterTransform.mjs";

describe("markdownBoldToHtml", () => {
  it("converts balanced ** pairs to <strong>", () => {
    expect(markdownBoldToHtml("and **defended by** Ramón y Cajal")).toBe(
      "and <strong>defended by</strong> Ramón y Cajal"
    );
    expect(markdownBoldToHtml("**A** then **B**")).toBe(
      "<strong>A</strong> then <strong>B</strong>"
    );
  });

  it("drops unbalanced or empty markers (import residue) and leaves single asterisks alone", () => {
    expect(markdownBoldToHtml("p < 0.05 * 2")).toBe("p < 0.05 * 2");
    expect(markdownBoldToHtml("a ** b")).toBe("a b");
    expect(
      markdownBoldToHtml("and **defended by Ramón y Cajal during the century.”")
    ).toBe("and defended by Ramón y Cajal during the century.”");
    expect(markdownBoldToHtml("(i.e., ****in Eccles’ model")).toBe(
      "(i.e., in Eccles’ model"
    );
    expect(markdownBoldToHtml("plain")).toBe("plain");
    expect(markdownBoldToHtml(null)).toBe("");
  });

  it("is applied to text blocks by contentBlocksToHTML", () => {
    const { text } = contentBlocksToHTML([
      { type: "text", content: "the **neuron doctrine** held" },
    ]);
    expect(text).toContain("<strong>neuron doctrine</strong>");
    expect(text).not.toContain("**");
  });
});
