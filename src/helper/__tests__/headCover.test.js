import { describe, expect, it } from "vitest";
import {
  MOTION,
  createHead,
  drawHead,
  lidPose,
  sceneFit,
  stepHead,
  toolSpot,
} from "@/helper/headCover";
import { reactiveCoverForModule } from "@/helper/chapterCover";

// OPENBRAIN-171: the History opener's logic. OPENBRAIN-198: the tool keeps
// to a small region on the crown, glides, and the lid lifts slowly.
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

describe("toolSpot", () => {
  const { x, y, rx, ry } = spec.work;
  const inWork = (p) => Math.hypot((p.x - x) / rx, (p.y - y) / ry);

  it("maps the whole cover into the small region on the crown", () => {
    expect(toolSpot(0.5, 0.5, spec.work)).toEqual({ x, y });
    expect(toolSpot(0, 0.5, spec.work)).toEqual({ x: x - rx, y });
    expect(toolSpot(1, 0.5, spec.work)).toEqual({ x: x + rx, y });
    expect(toolSpot(0.5, 1, spec.work)).toEqual({ x, y: y + ry });
  });

  it("never leaves it: corners and wild values come to its edge", () => {
    for (const [u, v] of [
      [0, 0],
      [1, 1],
      [1, 0],
      [-4, 0.5],
      [9, 9],
    ])
      expect(inWork(toolSpot(u, v, spec.work))).toBeLessThanOrEqual(1 + 1e-9);
  });

  it("is a really small region: a twelfth of the girl's width at most", () => {
    expect(rx * 2).toBeLessThan(spec.fit[2] / 12);
    expect(ry).toBeLessThanOrEqual(rx);
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

/* Drive the head as a reader would: a list of [u, v] the pointer visits
   (0 to 1 across the cover), 40 ms apart. `seen` is called after each. */
const STEP = 40;
function play(head, points, t0, present = true, seen = () => {}) {
  let now = t0;
  for (const [u, v] of points) {
    now += STEP;
    stepHead(head, { present, u, v }, now, spec);
    seen(head);
  }
  return now;
}
// A walk through the given corners, ten steps (0.4 s) a leg: an unhurried
// hand. A stroke counts once the tool has turned back, so a walk with n
// turns in it is n strokes.
const walk = (corners, steps = 10) =>
  corners.flatMap(([u, v], i) => {
    if (!i) return [[u, v]];
    const [pu, pv] = corners[i - 1];
    return Array.from({ length: steps }, (_, k) => [
      pu + ((u - pu) * (k + 1)) / steps,
      pv + ((v - pv) * (k + 1)) / steps,
    ]);
  });
const A = [0.35, 0.5]; // left of the middle of the cover
const B = [0.65, 0.5]; // right of it: 28 px of the tool's travel
const hold = (at, n) => Array(n).fill(at);
const inWork = (p) =>
  Math.hypot(
    (p.x - spec.work.x) / spec.work.rx,
    (p.y - spec.work.y) / spec.work.ry
  );

describe("stepHead", () => {
  it("plays the girl at 12 frames a second, hand or no hand", () => {
    const head = createHead(spec, 0);
    const away = { present: false, u: 0.5, v: 0.5 };
    // A second of frames, 20 ms apart: twelve of the girl's.
    for (let t = 20; t <= 1000; t += 20) stepHead(head, away, t, spec);
    expect(head.frame).toBe(12);
    // Nineteen in all, then round again.
    for (let t = 1020; t <= 1600; t += 20) stepHead(head, away, t, spec);
    expect(head.frame).toBe(0);
  });

  it("brings the hand in on the crown, wherever the pointer came in", () => {
    const head = createHead(spec, 0);
    stepHead(head, { present: true, u: 0.9, v: 0.1 }, STEP, spec);
    // Not on show yet, so it starts where it belongs: no swing across.
    expect(head.hand).toEqual(toolSpot(0.9, 0.1, spec.work));
    const now = play(head, hold([0.9, 0.1], 20), STEP);
    expect(head.inside).toBe(true);
    expect(head.handAlpha).toBeGreaterThan(0.9);
    play(head, hold([0.9, 0.1], 30), now, false);
    expect(head.inside).toBe(false);
    expect(head.handAlpha).toBeLessThan(0.1);
  });

  it("keeps the tool in its region however far the pointer travels", () => {
    const head = createHead(spec, 0);
    const far = walk(
      [
        [0, 0],
        [1, 1],
        [0, 1],
        [1, 0],
        [0.5, 0.5],
      ],
      6
    );
    play(head, far, 0, true, (h) =>
      expect(inWork(h.hand)).toBeLessThanOrEqual(1 + 1e-9)
    );
  });

  it("glides: a jump of the pointer is a slow, short move of the tool", () => {
    const head = createHead(spec, 0);
    const now = play(head, hold([0, 0.5], 20), 0);
    let before = { ...head.hand };
    let fastest = 0;
    // The pointer crosses the whole cover between two frames.
    play(head, hold([1, 0.5], 60), now, true, (h) => {
      fastest = Math.max(
        fastest,
        Math.hypot(h.hand.x - before.x, h.hand.y - before.y)
      );
      before = { ...h.hand };
    });
    expect(fastest).toBeLessThanOrEqual((MOTION.maxSpeed * STEP) / 1000 + 1e-9);
    // And it gets there.
    expect(head.hand.x).toBeCloseTo(spec.work.x + spec.work.rx, 0);
  });

  it("opens the head in six careful strokes, slowly, and it stays open", () => {
    const head = createHead(spec, 0);
    // The hand comes to rest, then works to and fro.
    let now = play(head, hold(A, 10), 0);
    expect(head.progress).toBe(0);
    now = play(head, walk([A, B, A, B]), now); // two turns
    now = play(head, hold(B, 5), now);
    expect(head.progress).toBeCloseTo(2 / 6);
    expect(head.latched).toBe(false);
    expect(head.at).toBeGreaterThan(spec.keys.first);
    now = play(head, walk([B, A, B, A, B]), now); // four more
    now = play(head, hold(B, 5), now);
    expect(head.progress).toBe(1);
    expect(head.latched).toBe(true);
    // Six strokes took about four seconds; the lid is still on its way.
    expect(head.at).toBeLessThan(spec.keys.open);
    // Holding still, it finishes opening, never hurried, and stays.
    let last = head.at;
    let fastest = 0;
    now = play(head, hold(B, 200), now, true, (h) => {
      fastest = Math.max(fastest, h.at - last);
      last = h.at;
    });
    expect(fastest).toBeLessThanOrEqual(
      (MOTION.openSpeed * STEP) / 1000 + 1e-9
    );
    expect(head.at).toBe(spec.keys.open);
    play(head, hold(B, 100), now);
    expect(head.at).toBe(spec.keys.open);
  });

  it("lifts the lid softly: no step is a jump, and it eases to a stop", () => {
    const head = createHead(spec, 0);
    let now = play(head, hold(A, 10), 0);
    const moves = [];
    let last = head.at;
    const seen = (h) => {
      moves.push(h.at - last);
      last = h.at;
    };
    now = play(head, walk([A, B, A, B, A, B, A, B]), now, true, seen);
    play(head, hold(B, 200), now, true, seen);
    // It picks up speed gradually…
    const start = moves.findIndex((m) => m > 0);
    expect(moves[start]).toBeLessThan((MOTION.openSpeed * STEP) / 1000 / 2);
    // …and the last moves before it rests are the smallest.
    const end = moves.findLastIndex((m) => m > 0);
    expect(moves[end]).toBeLessThan(0.01);
    expect(MOTION.openSpeed).toBeLessThanOrEqual(3);
  });

  it("is not opened by a shake of the mouse, nor by a tremble", () => {
    const head = createHead(spec, 0);
    let now = play(head, hold([0.5, 0.5], 10), 0);
    // A hard shake about that spot, 40% of the cover wide, every frame.
    const shake = Array.from({ length: 80 }, (_, i) => [
      i % 2 ? 0.7 : 0.3,
      0.5,
    ]);
    now = play(head, shake, now);
    expect(head.progress).toBe(0);
    // A slow tremble of a few px of pointer.
    const tremble = walk(
      Array.from({ length: 12 }, (_, i) => [i % 2 ? 0.52 : 0.48, 0.5])
    );
    play(head, tremble, now);
    expect(head.progress).toBe(0);
    expect(head.at).toBe(spec.keys.first);
  });

  it("lets a half-open head sink back when left alone", () => {
    const head = createHead(spec, 0);
    let now = play(head, hold(A, 10), 0);
    now = play(head, walk([A, B, A, B]), now);
    now = play(head, hold(B, 5), now);
    const reached = head.progress;
    expect(reached).toBeGreaterThan(0);
    play(head, hold(B, Math.ceil(MOTION.idleMs / STEP) + 50), now);
    expect(head.progress).toBeLessThan(reached);
  });

  it("closes, gently, when the pointer leaves the cover", () => {
    const head = createHead(spec, 0);
    let now = play(head, hold(A, 10), 0);
    now = play(head, walk([A, B, A, B, A, B, A, B]), now);
    now = play(head, hold(B, 200), now);
    expect(head.at).toBe(spec.keys.open);
    // Gone: it shuts, at its own pace.
    now = play(head, hold(B, 10), now, false);
    expect(head.latched).toBe(false);
    expect(head.at).toBeLessThan(spec.keys.open);
    expect(head.at).toBeGreaterThan(spec.keys.first);
    let last = head.at;
    let fastest = 0;
    play(head, hold(B, 200), now, false, (h) => {
      fastest = Math.max(fastest, last - h.at);
      last = h.at;
    });
    expect(fastest).toBeLessThanOrEqual(
      (MOTION.closeSpeed * STEP) / 1000 + 1e-9
    );
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
    // The tool's tip is where the head says the hand is.
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

  it("holds the lid and the hand steady: a stroke bumps neither", () => {
    const sizes = [];
    const turns = [];
    const ctx = {
      canvas: { width: 1, height: 1 },
      setTransform() {},
      clearRect() {},
      save() {},
      restore() {},
      translate() {},
      rotate: (a) => turns.push(a),
      globalAlpha: 1,
      drawImage: (img, x, y, w) => img === "hand" && sizes.push(w),
    };
    const head = createHead(spec, 0);
    head.handAlpha = 1;
    head.progress = 0.5; // mid-way through its strokes, lid not yet moved
    drawHead(
      ctx,
      { oval: 1, brain: 2, body: [3], lid: 4, lidOutline: 5, hand: "hand" },
      spec,
      head,
      { scale: 1, left: 0, top: 0 }
    );
    expect(sizes).toEqual([spec.hand.size[0] * spec.hand.scale]);
    expect(turns).toEqual([0]);
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
