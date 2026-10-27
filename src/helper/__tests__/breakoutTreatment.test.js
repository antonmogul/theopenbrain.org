import { describe, it, expect } from "vitest";
import {
  BOX_TREATMENTS,
  BOX_TREATMENT_BY_SLUG,
  DEFAULT_BOX_TREATMENT,
  boxTreatmentFor,
  normalizeBoxTreatment,
} from "@/helper/breakoutTreatment";

const HISTORY = "foundations-of-neuroscience";

describe("boxTreatmentFor (OPENBRAIN-153)", () => {
  it("gives every live History box the dark panel (Anton, 27 Oct)", () => {
    for (const slug of [
      "box-sacred-disease",
      "box-rete-mirabile",
      "box-penfield",
      "box-descartes",
      "box-psychosurgery",
      "box-electrical-stim",
      "box-ngf",
    ]) {
      expect(boxTreatmentFor({ slug }, HISTORY), slug).toBe("dark");
    }
  });

  it("keeps the Figma's violet for the humoral-theory box (pre-fold data)", () => {
    expect(boxTreatmentFor({ slug: "box-humoral-theory" }, HISTORY)).toBe(
      "violet"
    );
  });

  it("leaves other chapters' boxes pale, even with a History box slug", () => {
    expect(boxTreatmentFor({ slug: "box-descartes" }, "the-retina")).toBe(
      "pale"
    );
    expect(
      boxTreatmentFor(
        { slug: "box-signal-detection-theory" },
        "attention-and-working-memory"
      )
    ).toBe("pale");
    expect(boxTreatmentFor({ slug: "box-descartes" }, null)).toBe("pale");
    expect(boxTreatmentFor({ slug: "box-descartes" }, undefined)).toBe("pale");
  });

  it("is pale for an unmapped History box or a missing section", () => {
    expect(boxTreatmentFor({ slug: "box-new" }, HISTORY)).toBe("pale");
    expect(boxTreatmentFor({}, HISTORY)).toBe("pale");
    expect(boxTreatmentFor(null, HISTORY)).toBe(DEFAULT_BOX_TREATMENT);
  });

  it("lets the section's own treatment (a future DB column) win over the map", () => {
    expect(
      boxTreatmentFor({ slug: "box-descartes", treatment: "violet" }, HISTORY)
    ).toBe("violet");
    expect(
      boxTreatmentFor({ slug: "box-descartes", treatment: " Pale " }, HISTORY)
    ).toBe("pale");
    expect(
      boxTreatmentFor({ slug: "box-x", treatment: "dark" }, "the-retina")
    ).toBe("dark");
  });

  it("ignores an unknown or malformed section treatment", () => {
    expect(
      boxTreatmentFor({ slug: "box-descartes", treatment: "neon" }, HISTORY)
    ).toBe("dark");
    expect(
      boxTreatmentFor({ slug: "box-descartes", treatment: 1 }, HISTORY)
    ).toBe("dark");
    expect(boxTreatmentFor({ slug: "box-x", treatment: "" }, "stress")).toBe(
      "pale"
    );
  });
});

describe("normalizeBoxTreatment", () => {
  it("accepts the three treatments, trimmed and case-insensitive", () => {
    for (const t of BOX_TREATMENTS) expect(normalizeBoxTreatment(t)).toBe(t);
    expect(normalizeBoxTreatment("DARK")).toBe("dark");
    expect(normalizeBoxTreatment(" violet\n")).toBe("violet");
  });

  it("returns null for anything else", () => {
    expect(normalizeBoxTreatment(undefined)).toBeNull();
    expect(normalizeBoxTreatment(null)).toBeNull();
    expect(normalizeBoxTreatment("")).toBeNull();
    expect(normalizeBoxTreatment("card")).toBeNull();
    expect(normalizeBoxTreatment({})).toBeNull();
  });
});

describe("BOX_TREATMENT_BY_SLUG", () => {
  it("only names treatments that exist and only box-* slugs", () => {
    for (const [chapter, boxes] of Object.entries(BOX_TREATMENT_BY_SLUG)) {
      expect(typeof chapter).toBe("string");
      for (const [slug, treatment] of Object.entries(boxes)) {
        expect(slug, `${chapter}/${slug}`).toMatch(/^box-/);
        expect(BOX_TREATMENTS, `${chapter}/${slug}`).toContain(treatment);
      }
    }
  });

  it("is frozen, so a box flips by editing the map, not at runtime", () => {
    expect(Object.isFrozen(BOX_TREATMENT_BY_SLUG)).toBe(true);
    expect(Object.isFrozen(BOX_TREATMENT_BY_SLUG[HISTORY])).toBe(true);
  });
});
