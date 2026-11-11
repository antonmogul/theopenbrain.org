import { describe, expect, it } from "vitest";
import {
  MOTION,
  createHead,
  drawHead,
  inEllipse,
  inPolygon,
  lidPose,
  sceneFit,
  stepHead,
} from "@/helper/headCover";
import { reactiveCoverForModule } from "@/helper/chapterCover";

// OPENBRAIN-171: the History opener's logic, with the designers' numbers.
const spec = reactiveCoverForModule({ slug: "foundations-of-neuroscience" });

describe("sceneFit", () => {
  it("centres the part that must show, as large as fits, less the margin", () => {
    // A wide box: the height decides.
    const wide = sceneFit({ width: 1440, height: 836 }, spec.fit);
    expect(wide.scale).toBeCloseTo((836 / 1660) * 0.97);
    const [x, y, w, h] = spec.fit;
    expect(wide.left + (x + w / 2) * wide.scale).toBeCloseTo(720);
    expect(wide.top + (y + h / 2) * wide.scale).toBeCloseTo(418);
    // A phone: the width decides, and the whole girl is still on screen.
    const tall = sceneFit({ width: 390, height: 760 }, spec.fit);
    expect(tall.scale).toBeCloseTo((390 / 1540) * 0.97);
    expect(tall.left + x * tall.scale).toBeGreaterThanOrEqual(0);
    expect(tall.left + (x + w) * tall.scale).toBeLessThanOrEqual(390);
  });

  it("is nothing for a box with no size", () => {
    expect(sceneFit({ width: 0, height: 500 }, spec.fit).scale).toBe(0);
  });
});

describe("zones", () => {
  it("lets the hand appear over the head and the upper right, not the page", () => {
    expect(inPolygon(1300, 400, spec.zone)).toBe(true); // on the head
    expect(inPolygon(2300, 0, spec.zone)).toBe(true); // coming in
    expect(inPolygon(900, 1300, spec.zone)).toBe(false); // the writing hand
    expect(inPolygon(2400, 1200, spec.zone)).toBe(false); // lower right
  });

  it("counts strokes only on the head", () => {
    expect(inEllipse(spec.head.x, spec.head.y, spec.head)).toBe(true);
    expect(
      inEllipse(spec.head.x + spec.head.rx + 1, spec.head.y, spec.head)
    ).toBe(false);
  });
});

describe("lidPose", () => {
  const { keys, first, open } = spec.keys;
  it("is closed at the first key: lid in place, brain tucked under it", () => {
    expect(lidPose(first, keys, first)).toEqual({
      lidX: 0,
      lidY: 0,
      lidTurn: 0,
      brainX: 46,
      brainY: 74,
    });
  });
  it("is open at the last: lid up and to the left, brain risen", () => {
    const p = lidPose(open, keys, first);
    expect(p.lidX).toBeCloseTo(-235, 0);
    expect(p.lidY).toBeCloseTo(-215.3, 0);
    expect(p.brainY).toBeCloseTo(-24, 0);
  });
  it("moves between keys, and stays in range outside them", () => {
    const mid = lidPose(first + 4.5, keys, first);
    expect(mid.lidX).toBeLessThan(-35.2);
    expect(mid.lidX).toBeGreaterThan(-112.3);
    expect(lidPose(-5, keys, first).lidX).toBe(0);
    expect(lidPose(999, keys, first).lidX).toBeCloseTo(-235, 0);
  });
});

/* Drive the head as a reader would: a list of [x, y] the pointer visits,
   40 ms apart. */
function play(head, points, t0, present = true) {
  let now = t0;
  for (const [x, y] of points) {
    now += 40;
    stepHead(head, { present, x, y }, now, spec);
  }
  return now;
}
// A walk through the given corners, five steps a leg, so a reversal is
// seen as a reader's is. A stroke counts when the hand turns back, so a
// walk with n turns in it is n strokes.
const walk = (corners) =>
  corners.flatMap(([x, y], i) => {
    if (!i) return [[x, y]];
    const [px, py] = corners[i - 1];
    return [1, 2, 3, 4, 5].map((k) => [
      px + ((x - px) * k) / 5,
      py + ((y - py) * k) / 5,
    ]);
  });
const A = [1150, 420]; // on the head
const B = [1370, 380]; // 224 px away, still on it

describe("stepHead", () => {
  it("plays the girl at 12 frames a second, hand or no hand", () => {
    const head = createHead(spec, 0);
    const away = { present: false, x: 0, y: 0 };
    // A second of frames, 20 ms apart: twelve of the girl's.
    for (let t = 20; t <= 1000; t += 20) stepHead(head, away, t, spec);
    expect(head.frame).toBe(12);
    // Nineteen in all, then round again.
    for (let t = 1020; t <= 1600; t += 20) stepHead(head, away, t, spec);
    expect(head.frame).toBe(0);
  });

  it("shows the hand only in its zone, glued to the pointer", () => {
    const head = createHead(spec, 0);
    const now = play(head, Array(10).fill([2300, 100]), 0);
    expect(head.inside).toBe(true);
    expect(head.handAlpha).toBeGreaterThan(0.9);
    expect(head.hand).toEqual({ x: 2300, y: 100 });
    play(head, Array(10).fill([2400, 1200]), now);
    expect(head.inside).toBe(false);
    expect(head.handAlpha).toBeLessThan(0.1);
  });

  it("opens the head in four strokes over it, and it stays open", () => {
    const head = createHead(spec, 0);
    // The hand comes to rest on the head, then rubs.
    let now = play(head, Array(10).fill(A), 0);
    expect(head.progress).toBe(0);
    now = play(head, walk([A, B, A, B]), now); // two turns
    expect(head.progress).toBeCloseTo(0.5);
    expect(head.latched).toBe(false);
    expect(head.at).toBeGreaterThan(spec.keys.first);
    now = play(head, walk([B, A, B]), now); // two more
    expect(head.progress).toBe(1);
    expect(head.latched).toBe(true);
    // Holding still, it finishes opening and stays.
    now = play(head, Array(60).fill(B), now);
    expect(head.at).toBe(spec.keys.open);
    play(head, Array(100).fill(B), now);
    expect(head.at).toBe(spec.keys.open);
  });

  it("ignores a jitter, and a stroke shorter than a stroke", () => {
    const head = createHead(spec, 0);
    let now = play(head, Array(10).fill(A), 0);
    const jitter = Array.from({ length: 40 }, (_, i) => [
      A[0] + (i % 2 ? 30 : 0),
      A[1],
    ]);
    play(head, jitter, now);
    expect(head.progress).toBe(0);
    expect(MOTION.minStroke).toBeGreaterThan(30);
  });

  it("closes when the hand leaves the head", () => {
    const head = createHead(spec, 0);
    let now = play(head, Array(10).fill(A), 0);
    now = play(head, walk([A, B, A, B, A, B]), now);
    now = play(head, Array(60).fill(B), now);
    expect(head.at).toBe(spec.keys.open);
    // Off the head but still in the hand's zone: it shuts, more slowly.
    now = play(head, Array(10).fill([2300, 100]), now);
    expect(head.latched).toBe(false);
    expect(head.at).toBeLessThan(spec.keys.open);
    expect(head.at).toBeGreaterThan(spec.keys.first);
    play(head, Array(60).fill([2300, 100]), now);
    expect(head.at).toBe(spec.keys.first);
  });
});

describe("drawHead", () => {
  it("draws bottom to top: opening, brain, girl, lid, outlined lid, hand", () => {
    const calls = [];
    const ctx = {
      canvas: { width: 800, height: 600 },
      setTransform: (...a) => calls.push(["setTransform", ...a]),
      clearRect: () => calls.push(["clear"]),
      save: () => {},
      restore: () => {},
      translate: () => {},
      rotate: () => {},
      drawImage: (img, ...rest) => calls.push(["draw", img, ...rest]),
      globalAlpha: 1,
    };
    const images = {
      oval: "oval",
      brain: "brain",
      body: spec.body.frames.map((_, i) => `body${i}`),
      lid: "lid",
      lidOutline: "lidOutline",
      hand: "hand",
    };
    const head = createHead(spec, 0);
    head.frame = 3;
    head.handAlpha = 1;
    head.hand = { x: 1500, y: 300 };
    drawHead(ctx, images, spec, head, {
      scale: 0.5,
      left: 10,
      top: 20,
      dpr: 2,
    });
    expect(calls.filter((c) => c[0] === "draw").map((c) => c[1])).toEqual([
      "oval",
      "brain",
      "body3",
      "lid",
      "lidOutline",
      "hand",
    ]);
    // Artwork px to device px: scale × dpr, the origin × dpr.
    expect(calls[2]).toEqual(["setTransform", 1, 0, 0, 1, 20, 40]);
    // The tool's tip is on the pointer.
    const hand = calls.at(-1);
    expect(hand[2]).toBeCloseTo(1500 - 20 * 1.2);
    expect(hand[3]).toBeCloseTo(300 - 874 * 1.2);
    // Closed: the brain is tucked 46, 74 under the lid.
    expect(calls[4]).toEqual(["draw", "brain", 1100 + 46, 321 + 74]);
  });

  it("passes the lid in front of the hand as it comes off", () => {
    const run = (at, handAlpha = 1) => {
      const draws = [];
      const ctx = {
        canvas: { width: 1, height: 1 },
        setTransform() {},
        clearRect() {},
        save() {},
        restore() {},
        translate() {},
        rotate() {},
        globalAlpha: 1,
        drawImage(img) {
          draws.push([img, this.globalAlpha]);
        },
      };
      const head = createHead(spec, 0);
      head.at = at;
      head.handAlpha = handAlpha;
      head.hand = { x: 1500, y: 300 };
      drawHead(
        ctx,
        {
          oval: "o",
          brain: "b",
          body: ["g"],
          lid: "lid",
          lidOutline: "out",
          hand: "hand",
        },
        spec,
        head,
        { scale: 1, left: 0, top: 0 }
      );
      return draws.filter(([img]) => img === "hand" || img === "lid");
    };
    // Closed: the tool works on top of the head.
    expect(run(spec.keys.first)).toEqual([
      ["lid", 1],
      ["hand", 1],
    ]);
    // Open: the hand is drawn before the lid, so the lid covers it.
    expect(run(spec.keys.open)).toEqual([
      ["hand", 1],
      ["lid", 1],
    ]);
    // On the way: both sides of the lid, the top copy fading.
    const mid = run(spec.keys.first + 4.4);
    expect(mid.map(([img]) => img)).toEqual(["hand", "lid", "hand"]);
    expect(mid[0][1]).toBe(1);
    expect(mid[2][1]).toBeGreaterThan(0);
    expect(mid[2][1]).toBeLessThan(1);
    // A fading hand: away from the lid the two copies add up to its opacity.
    const [below, , above] = run(spec.keys.first + 4.4, 0.5);
    expect(1 - (1 - below[1]) * (1 - above[1])).toBeCloseTo(0.5, 6);
    const fadingOpen = run(spec.keys.open, 0.5);
    expect(fadingOpen).toEqual([
      ["hand", 0.5],
      ["lid", 1],
    ]);
  });

  it("leaves the hand out when it is not there", () => {
    const drawn = [];
    const ctx = {
      canvas: { width: 1, height: 1 },
      setTransform() {},
      clearRect() {},
      save() {},
      restore() {},
      translate() {},
      rotate() {},
      drawImage: (img) => drawn.push(img),
    };
    drawHead(
      ctx,
      { oval: 1, brain: 2, body: [3], lid: 4, lidOutline: 5, hand: 6 },
      spec,
      createHead(spec, 0),
      { scale: 1, left: 0, top: 0 }
    );
    expect(drawn).toEqual([1, 2, 3, 4, 5]);
  });
});
