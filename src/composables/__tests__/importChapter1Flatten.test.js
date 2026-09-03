import { describe, it, expect } from "vitest";

// Round-trip: text.json ──flattenParagraphs (importer)──▶ paragraph rows
//                       ──transformSectionParagraphs (reader)──▶ tree
// and assert the reader ends up with every text string text.json has.
//
// The importer helpers are imported straight from the CLI script (its main()
// is guarded by an import.meta.url check, so this has no side effects and
// needs no Supabase credentials). The reader path is the real one — the same
// exported functions useChapter.fetchChapter runs.
import {
  flattenParagraphs,
  buildParagraphRow,
  buildAnimLookup,
  loadTextJson,
} from "../../../scripts/import-chapter-1-to-supabase.mjs";
import {
  collectTexts,
  missingFrom,
  attachAnimationKeys,
  normalizeText,
} from "../../../scripts/lib/chapter1-parity.mjs";
import {
  transformSectionParagraphs,
  reconstructNesting,
  mergeConsecutiveSubSections,
} from "@/composables/useChapter";

const textData = loadTextJson();

// Every animation key text.json references, so has_animation / animation_id
// resolve the way they do against the real animations table.
const ANIM_KEYS = (() => {
  const keys = new Set();
  const walk = (o) => {
    if (Array.isArray(o)) return o.forEach(walk);
    if (!o || typeof o !== "object") return;
    if (o.animation?.name) {
      const n = o.animation.name;
      keys.add(
        n.startsWith("animation")
          ? n
          : "animation" + n.charAt(0).toUpperCase() + n.slice(1)
      );
    }
    if (o.animationId) keys.add(o.animationId);
    Object.values(o).forEach(walk);
  };
  walk(textData.sections);
  return [...keys];
})();
const ANIM_ROWS = ANIM_KEYS.map((k) => ({
  id: `uuid-${k}`,
  animation_key: k,
  title: k,
}));
const ANIM_LOOKUP = buildAnimLookup(ANIM_ROWS);

/** Simulate the importer writing one section, then the reader fetching it. */
function roundTripSection(section) {
  const flat = flattenParagraphs(section.paragraphs || []);
  const rows = flat.map((fp, i) => ({
    id: `row-${i}`,
    section_id: "sec",
    order_index: i,
    ...buildParagraphRow(fp, ANIM_LOOKUP),
  }));
  attachAnimationKeys(rows, ANIM_ROWS);
  return { flat, rows, tree: transformSectionParagraphs(rows) };
}

/** Find a subSubSection group entry (prose in paragraphs[]) by nested text. */
function findGroup(nodes, startsWith) {
  for (const n of nodes || []) {
    if (n?.subSection)
      for (const s of n.subSection) {
        const g = findGroup(s.paragraphs, startsWith);
        if (g) return g;
      }
    if (n?.subSubSection)
      for (const ss of n.subSubSection) {
        if (
          ss.paragraphs?.some((p) =>
            normalizeText(p.text).startsWith(startsWith)
          )
        )
          return ss;
      }
  }
  return null;
}

// The 15 items verified missing from production (OPENBRAIN-22).
const KNOWN_MISSING = [
  "John Dowling",
  "Chemical synapses: Photoreceptors form glutamatergic synapses",
  "Neurotransmitter release in photoreceptors and bipolar cells occurs",
  "Electrical synapses: Electrical synapses are widespread in the retina",
  "Rhodopsin: In the mid-1870s, Franz Boll",
  "Counting photons: The photoreceptor is given a difficult task",
  "Signal and noise: cGMP-channels are abundant",
  "Signal amplification and single photon detection: A single photon",
  "talking about visual threshold and single photon detection",
  "Center-surround: Recording from ganglion cell axons in the horseshoe crab",
  "Work over the following decades would reveal the circuitry",
  "RW Rodieck modelled excitatory (center) and inhibitory (surround)",
  "Color blindness",
  "Direction-selectivity: In the human and non-human primate visual system",
  "At least in the mouse and rabbit retina, there are several types of direction selective ganglion cells",
];

describe("Chapter 1 importer ⇄ reader round-trip (OPENBRAIN-22)", () => {
  it("round-trips the full text set of EVERY main section", () => {
    const failures = [];
    for (const section of textData.sections) {
      const want = collectTexts(section.paragraphs);
      const have = collectTexts(roundTripSection(section).tree);
      const missing = missingFrom(want, have);
      const extra = missingFrom(have, want);
      if (missing.length || extra.length) {
        failures.push({ section: section.title, missing, extra });
      }
      expect(new Set(have)).toEqual(new Set(want));
    }
    expect(failures).toEqual([]);
  });

  it("recovers the 15 items verified missing from production", () => {
    const have = new Set();
    for (const section of textData.sections) {
      collectTexts(roundTripSection(section).tree).forEach((t) => have.add(t));
    }
    const haveList = [...have];
    for (const prefix of KNOWN_MISSING) {
      const hit = haveList.find((t) => t.startsWith(prefix));
      expect(hit, `expected an item starting with "${prefix}"`).toBeTruthy();
    }
  });

  it("emits one level-2 row per nested paragraph, none of them empty", () => {
    for (const section of textData.sections) {
      const { flat } = roundTripSection(section);
      for (const row of flat) {
        if (row.subsection_level !== 2) continue;
        expect(
          row.content.blocks.length,
          `empty level-2 row in "${section.title}"`
        ).toBeGreaterThan(0);
        expect(row.is_subsection_header).toBe(false);
      }
    }
  });

  it("folds a group animation onto its first paragraph (Center-surround → CenterSurroundReceptiveFields)", () => {
    const section = textData.sections.find((s) =>
      s.title.startsWith("Amacrine and ganglion cells")
    );
    const { rows, tree } = roundTripSection(section);
    const first = rows.find((r) =>
      r.content_text?.startsWith("Center-surround: Recording")
    );
    expect(first).toBeTruthy();
    expect(first.subsection_level).toBe(2);
    expect(first.has_animation).toBe(true);
    expect(first.animation_id).toBe(
      "uuid-animationCenterSurroundReceptiveFields"
    );
    expect(first.animation_trigger).toBe("CenterSurroundReceptiveFields");
    // The sibling paragraphs of the same group carry no animation.
    const second = rows.find((r) =>
      r.content_text?.startsWith("Work over the following decades")
    );
    expect(second.has_animation).toBe(false);
    expect(second.animation_id).toBeNull();

    // The reader puts the trigger on that first subSubSection item.
    const items = tree
      .flatMap((n) => n.subSection || [])
      .flatMap((s) => s.paragraphs || [])
      .flatMap((p) => p.subSubSection || []);
    const rendered = items.find((i) =>
      normalizeText(i.text).startsWith("Center-surround: Recording")
    );
    expect(rendered.animation.id).toBe(
      "animationCenterSurroundReceptiveFields"
    );
  });

  it("keeps a nested paragraph's own animation + image (Direction-selectivity)", () => {
    const section = textData.sections.find((s) =>
      s.title.startsWith("Amacrine and ganglion cells")
    );
    const { rows } = roundTripSection(section);
    const ds = rows.find((r) =>
      r.content_text?.startsWith("Direction-selectivity:")
    );
    expect(ds.subsection_level).toBe(2);
    expect(ds.has_animation).toBe(true);
    expect(ds.animation_id).toBe("uuid-animationDirectionSelectivity");
    expect(ds.animation_trigger).toBe("DirectionSelectivity");
    expect(ds.content.blocks.map((b) => b.type)).toEqual(["text", "image"]);
    expect(ds.content.blocks[1].src).toBe("GABAergic");
    expect(ds.content.blocks[1].closed).toBe(true);
  });

  it("keeps fullscreen markers and break blocks inside a group (Phototransduction)", () => {
    const section = textData.sections.find((s) =>
      s.title.startsWith("Photoreceptors and phototransduction")
    );
    const { rows } = roundTripSection(section);
    const l2 = rows.filter((r) => r.subsection_level === 2);
    const types = l2.map((r) => r.content.blocks.map((b) => b.type).join("+"));
    expect(types).toContain("animation_full");
    expect(types).toContain("text+break_section");
    expect(types).toContain("text+break_video");
    const full = l2.filter(
      (r) => r.content.blocks[0].type === "animation_full"
    );
    expect(full.map((r) => r.animation_id)).toEqual([
      "uuid-animationPhototransduction",
      "uuid-animationTheVisualCycle",
    ]);
    expect(full.every((r) => r.has_animation)).toBe(true);
    // The { paragraphs: [...] } wrapper nested INSIDE the group is flattened too.
    expect(
      l2.some((r) =>
        r.content_text?.startsWith("Light sensitivity and temporal differences")
      )
    ).toBe(true);
  });

  it("represents an untyped group title as a level-4 heading block in the first row, which the reader renders", () => {
    // No real group in text.json carries a bare title today; synthesize one so
    // the representation is pinned down.
    const flat = flattenParagraphs([
      {
        subSection: [
          {
            id: "sub",
            title: "Sub",
            paragraphs: [
              {
                subSubSection: [
                  {
                    title: "Group title",
                    paragraphs: [
                      { id: "a", text: "<p>First</p>" },
                      { id: "b", text: "<p>Second</p>" },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ]);
    const l2 = flat.filter((r) => r.subsection_level === 2);
    expect(l2).toHaveLength(2);
    expect(l2[0].content.blocks).toEqual([
      { type: "heading", level: 4, content: "Group title" },
      { type: "text", content: "<p>First</p>" },
    ]);
    expect(l2[1].content.blocks).toEqual([
      { type: "text", content: "<p>Second</p>" },
    ]);

    const rows = flat.map((fp, i) => ({
      id: `r${i}`,
      order_index: i,
      ...buildParagraphRow(fp, {}),
    }));
    const tree = mergeConsecutiveSubSections(reconstructNesting(rows));
    const items = tree[0].subSection[0].paragraphs[0].subSubSection;
    expect(items[0].hasHeading).toBe(true);
    expect(items[0].text).toBe(
      '<h4 class="text-black">Group title</h4><p>First</p>'
    );
    expect(collectTexts(tree)).toEqual([
      "Sub",
      "Group title",
      "First",
      "Second",
    ]);
  });

  it("leaf subSubSection entries (text only) flatten exactly as before", () => {
    const section = textData.sections.find((s) =>
      s.title.startsWith("Organization and cell types")
    );
    const { rows } = roundTripSection(section);
    const photoreceptors = rows.find((r) =>
      r.content_text?.startsWith("Photoreceptors: Photoreceptors are vital")
    );
    expect(photoreceptors.subsection_level).toBe(2);
    expect(photoreceptors.content.blocks.map((b) => b.type)).toEqual([
      "text",
      "image",
    ]);
    const dowling = rows.find((r) =>
      r.content_text?.startsWith("Retinal cell types, connectivity")
    );
    expect(dowling.content.blocks).toEqual([
      { type: "text", content: expect.any(String) },
      {
        type: "break_video",
        title: "John Dowling",
        videoSlug: "dowling-and-werblin",
      },
    ]);
  });

  it("text.json really has subSubSection groups with nested paragraphs (guards the fixture)", () => {
    const g = findGroup(
      textData.sections.find((s) => s.title.startsWith("Amacrine")).paragraphs,
      "Center-surround"
    );
    expect(g).toBeTruthy();
    expect(g.text ?? "").toBe("");
    expect(g.paragraphs).toHaveLength(3);
    expect(g.animation.name).toBe("CenterSurroundReceptiveFields");
  });
});
