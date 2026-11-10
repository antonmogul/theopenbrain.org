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

describe("the History head (OPENBRAIN-171)", () => {
  const HEAD = "/publicAssets/images/covers/foundations-hero/head";

  it("gives History the head, as the designers' config has it", () => {
    const rec = reactiveCoverForModule({ slug: "foundations-of-neuroscience" });
    expect(rec).toMatchObject({
      kind: "head",
      paper: "#F8F2E4",
      ink: "#1c1c1c",
      size: [2680, 1732],
      poster: `${HEAD}/poster.webp`,
      oval: { src: `${HEAD}/oval.webp`, at: [1106, 345] },
      brain: { src: `${HEAD}/brain.webp`, at: [1100, 321] },
      lid: { src: `${HEAD}/lid.webp`, outline: `${HEAD}/lidS.webp` },
      hand: { src: `${HEAD}/hand.webp`, tip: [20, 874], scale: 1.2 },
    });
    expect(rec.body.frames).toHaveLength(19);
    expect(rec.body.frames[0]).toBe(`${HEAD}/body/00.webp`);
    expect(rec.body.frames[18]).toBe(`${HEAD}/body/18.webp`);
    expect(rec.body.fps).toBe(12);
    // Closed at the first key (nothing has moved), open at the last.
    expect(rec.keys.keys[0].slice(0, 3)).toEqual([0, 0, 0]);
    expect(rec.keys.open - rec.keys.first).toBe(rec.keys.keys.length - 1);
    // The part that must always show is inside the artwork, and the head's
    // ellipse is inside that.
    const [x, y, w, h] = rec.fit;
    expect(x).toBeGreaterThanOrEqual(0);
    expect(y).toBeGreaterThanOrEqual(0);
    expect(x + w).toBeLessThanOrEqual(rec.size[0]);
    expect(y + h).toBeLessThanOrEqual(rec.size[1]);
    expect(rec.head.x - rec.head.rx).toBeGreaterThan(x);
    expect(rec.head.x + rec.head.rx).toBeLessThan(x + w);
  });

  it("copies the record, so a caller can't change the book's", () => {
    const a = reactiveCoverForModule({ slug: "foundations-of-neuroscience" });
    a.keys.keys[0][0] = 99;
    a.zone[0][0] = 99;
    const b = reactiveCoverForModule({ slug: "foundations-of-neuroscience" });
    expect(b.keys.keys[0][0]).toBe(0);
    expect(b.zone[0][0]).toBe(666);
  });

  it("lets a module's own head record win, and rejects a broken one", () => {
    const raw = reactiveCoverForModule({ slug: "foundations-of-neuroscience" });
    const own = { ...raw, poster: " /mine.webp " };
    expect(
      reactiveCoverForModule({ slug: "the-retina", reactive_cover: own }).poster
    ).toBe("/mine.webp");
    for (const broken of [
      { ...raw, poster: "" },
      { ...raw, size: [100] },
      { ...raw, fit: [0, 0, 0, 10] },
      { ...raw, oval: { src: "/o.webp" } },
      { ...raw, lid: { ...raw.lid, outline: "" } },
      { ...raw, body: { ...raw.body, frames: [] } },
      { ...raw, body: { ...raw.body, fps: 0 } },
      { ...raw, hand: { ...raw.hand, tip: [1] } },
      { ...raw, zone: [[1, 2]] },
      { ...raw, head: { ...raw.head, rx: 0 } },
      { ...raw, keys: { ...raw.keys, open: 99 } },
      { ...raw, keys: { ...raw.keys, keys: [[0, 0, 0, 0]] } },
    ]) {
      expect(normalizeReactiveCover(broken)).toBeNull();
    }
    // A broken own record: the slug map stands.
    expect(
      reactiveCoverForModule({
        slug: "the-retina",
        reactive_cover: { ...raw, size: null },
      }).kind
    ).toBe("lottie");
  });
});
