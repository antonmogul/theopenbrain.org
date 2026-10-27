import { describe, it, expect } from "vitest";
import {
  coverForModule,
  COVER_BY_SLUG,
  DEFAULT_COVER,
  normalizeReactiveCover,
  reactiveCoverForModule,
} from "@/helper/chapterCover";

describe("coverForModule", () => {
  it("prefers the module's own cover column when set", () => {
    expect(
      coverForModule({ slug: "the-retina", cover_image_url: "/x/cover.jpg" })
    ).toBe("/x/cover.jpg");
  });

  it("falls back to the slug map when the column is absent, null or blank", () => {
    expect(coverForModule({ slug: "the-retina" })).toBe(
      COVER_BY_SLUG["the-retina"]
    );
    expect(coverForModule({ slug: "the-retina", cover_image_url: null })).toBe(
      COVER_BY_SLUG["the-retina"]
    );
    expect(coverForModule({ slug: "the-retina", cover_image_url: "  " })).toBe(
      COVER_BY_SLUG["the-retina"]
    );
    expect(coverForModule({ slug: "attention-and-working-memory" })).toBe(
      COVER_BY_SLUG["attention-and-working-memory"]
    );
  });

  it("uses the neutral default for unknown or missing modules", () => {
    expect(coverForModule({ slug: "a-future-chapter" })).toBe(DEFAULT_COVER);
    expect(coverForModule(null)).toBe(DEFAULT_COVER);
    expect(coverForModule(undefined)).toBe(DEFAULT_COVER);
  });

  it("gives History the Matisse reader until a cover is set (OPENBRAIN-67)", () => {
    expect(coverForModule({ slug: "foundations-of-neuroscience" })).toBe(
      "/publicAssets/images/attention-matisse-reader.jpg"
    );
    expect(
      coverForModule({
        slug: "foundations-of-neuroscience",
        cover_image_url: "https://x/cover.jpg",
      })
    ).toBe("https://x/cover.jpg");
  });
});

describe("reactiveCoverForModule (OPENBRAIN-146)", () => {
  const EYE = {
    kind: "lottie",
    poster: null,
    lottie: "/publicAssets/animations/covers/matisse-eyes.json",
    axis: "x",
    reverse: false,
    fit: "slice",
    idle: 14,
  };

  it("gives Retina the eye Lottie, scrubbed on x, defaults filled", () => {
    expect(reactiveCoverForModule({ slug: "the-retina" })).toEqual(EYE);
  });

  it("has none for other chapters or a missing module", () => {
    expect(reactiveCoverForModule({ slug: "stress" })).toBeNull();
    expect(
      reactiveCoverForModule({ slug: "attention-and-working-memory" })
    ).toBeNull();
    expect(reactiveCoverForModule(null)).toBeNull();
  });

  it("lets a module's own reactive_cover record win over the slug map", () => {
    expect(
      reactiveCoverForModule({
        slug: "the-retina",
        reactive_cover: {
          lottie: " https://x/cover.json ",
          axis: "y",
          reverse: true,
          fit: "slice",
          idle: 0,
        },
      })
    ).toEqual({
      kind: "lottie",
      poster: null,
      lottie: "https://x/cover.json",
      axis: "y",
      reverse: true,
      fit: "slice",
      idle: 0,
    });
  });

  it("ignores a record without a Lottie and normalises odd values", () => {
    expect(normalizeReactiveCover({ axis: "y" })).toBeNull();
    expect(normalizeReactiveCover("eye.json")).toBeNull();
    expect(
      reactiveCoverForModule({
        slug: "the-retina",
        reactive_cover: { lottie: " " },
      })
    ).toEqual(EYE);
    expect(
      normalizeReactiveCover({
        lottie: "/a.json",
        idle: "nope",
        axis: "z",
        reverse: "yes",
      })
    ).toEqual({ ...EYE, lottie: "/a.json", fit: "meet" });
  });
});

describe("the History skull cutaway (OPENBRAIN-156)", () => {
  const HERO = "/publicAssets/images/covers/foundations-hero";

  it("gives History the cutaway, in fractions of the sketch, with the sketch as poster", () => {
    const rec = reactiveCoverForModule({ slug: "foundations-of-neuroscience" });
    expect(rec).toMatchObject({
      kind: "cutaway",
      axis: "x",
      reverse: false,
      poster: `${HERO}/hist-header-sketch.png`,
      base: `${HERO}/hist-header-sketch.png`,
      brain: `${HERO}/hist-header-cutaway.png`,
      hand: `${HERO}/hist-header-hand.png`,
      paper: "#f8f2e3",
      open: 8,
    });
    expect(rec.ratio).toBeCloseTo(1728 / 1116);
    // The registration: scale 0.5785, offset (147, 38) sketch px.
    expect(rec.brainBox.left).toBeCloseTo(147 / 1728);
    expect(rec.brainBox.top).toBeCloseTo(38 / 1116);
    expect(rec.brainBox.width).toBeCloseTo((2553 * 0.5785) / 1728, 2);
    expect(rec.brainBox.height).toBeCloseTo((1640 * 0.5785) / 1116, 2);
    // Every polygon point and the pivot are inside the sketch.
    for (const [x, y] of [...rec.cap, ...rec.band, rec.pivot]) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(1);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(1);
    }
    expect(rec.cap.length).toBeGreaterThanOrEqual(3);
    expect(rec.band.length).toBeGreaterThanOrEqual(3);
    // The hand photo is wider than the sketch and waits up and to the right.
    expect(rec.handBox.width).toBeGreaterThan(1);
    expect(rec.handRest.x).toBeGreaterThan(0);
    expect(rec.handRest.y).toBeLessThan(0);
  });

  it("keeps the band inside the cap so it is covered at rest", () => {
    // Every band point is above (smaller y than) the cap's cut line at that x.
    const rec = reactiveCoverForModule({ slug: "foundations-of-neuroscience" });
    const cut = rec.cap
      .filter(([, y]) => y > 0.2) // the lower edge, not the top of the crown
      .sort((a, b) => a[0] - b[0]);
    const cutY = (x) => {
      for (let i = 1; i < cut.length; i++) {
        const [x0, y0] = cut[i - 1];
        const [x1, y1] = cut[i];
        if (x >= x0 && x <= x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
      }
      return Infinity;
    };
    for (const [x, y] of rec.band) expect(y).toBeLessThan(cutY(x));
  });

  it("lets a module's own cutaway record win, and rejects a broken one", () => {
    const raw = {
      kind: "cutaway",
      base: " /a.png ",
      brain: "/b.png",
      hand: "/c.png",
      size: [100, 50],
      brainBox: [10, 5, 80, 40],
      cap: [
        [20, 10],
        [80, 10],
        [50, 25],
      ],
      pivot: [20, 25],
      band: [
        [30, 15],
        [60, 15],
        [45, 20],
      ],
      handBox: [-10, -20, 120],
      handRest: [60, -30],
      open: "12",
    };
    expect(
      reactiveCoverForModule({ slug: "the-retina", reactive_cover: raw })
    ).toEqual({
      kind: "cutaway",
      axis: "x",
      reverse: false,
      poster: "/a.png",
      base: "/a.png",
      brain: "/b.png",
      hand: "/c.png",
      paper: null,
      ratio: 2,
      brainBox: { left: 0.1, top: 0.1, width: 0.8, height: 0.8 },
      cap: [
        [0.2, 0.2],
        [0.8, 0.2],
        [0.5, 0.5],
      ],
      pivot: [0.2, 0.5],
      open: 12,
      band: [
        [0.3, 0.3],
        [0.6, 0.3],
        [0.45, 0.4],
      ],
      handBox: { left: -0.1, top: -0.4, width: 1.2 },
      handRest: { x: 0.5, y: -0.25 },
    });
    // Missing or malformed geometry: no record, so the slug map stands.
    for (const broken of [
      { ...raw, hand: "" },
      { ...raw, size: [100] },
      { ...raw, cap: [[1, 2]] },
      { ...raw, band: "nope" },
      { ...raw, brainBox: [1, 2, 3] },
      { ...raw, handBox: [0, 0, 0] },
      { ...raw, pivot: ["a", 1] },
    ]) {
      expect(normalizeReactiveCover(broken)).toBeNull();
    }
    expect(
      reactiveCoverForModule({
        slug: "the-retina",
        reactive_cover: { ...raw, size: null },
      }).kind
    ).toBe("lottie");
    // Defaults: no rest offset, the standard opening, no paper.
    const bare = normalizeReactiveCover({
      ...raw,
      handRest: undefined,
      open: -3,
    });
    expect(bare.handRest).toEqual({ x: 0, y: 0 });
    expect(bare.open).toBe(8);
  });
});
