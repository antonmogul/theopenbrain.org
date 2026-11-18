import { describe, expect, it } from "vitest";
import {
  MOTION,
  createHead,
  drawHead,
  headAutoplays,
  loopPointer,
  pryPose,
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

/* The clock only advances while HeadCover is visible. */
const STEP = 20;
const pointer = { present: true, u: 0.5, v: 0.5 };
function play(head, ms, input = pointer, seen = () => {}) {
  const end = head.last + ms;
  for (let now = head.last + STEP; now <= end; now += STEP) {
    stepHead(head, input, now, spec);
    seen(head);
  }
}

describe("prying and automatic mode", () => {
  it("uses the back end of the actual lid cut, with only a tiny nudge", () => {
    expect(spec.work).toEqual({ x: 1470, y: 400, rx: 2, ry: 1 });
    expect([
      spec.work.x - spec.lid.at[0],
      spec.work.y - spec.lid.at[1],
    ]).toEqual([479, 95]);
    for (const width of [1024, 1280, 1440, 1920]) {
      for (const height of [450, 768, 900]) {
        const view = sceneFit({ width, height }, spec.fit);
        const canvasTip = {
          x: view.left + spec.work.x * view.scale,
          y: view.top + spec.work.y * view.scale,
        };
        expect((canvasTip.x - view.left) / view.scale).toBeCloseTo(1470);
        expect((canvasTip.y - view.top) / view.scale).toBeCloseTo(400);
      }
    }
  });

  it("autoplays below 1024px or on coarse pointers", () => {
    expect(headAutoplays(1023)).toBe(true);
    expect(headAutoplays(1024)).toBe(false);
    expect(headAutoplays(1920, true)).toBe(true);
  });

  it("rocks both ways about the tip, then rests after three full rocks", () => {
    const { settleMs, rockMs, rockDegrees, steps } = MOTION;
    expect(pryPose(settleMs - 1)).toEqual({ turn: 0, progress: 0 });
    expect(pryPose(settleMs + rockMs / 4).turn).toBe(rockDegrees);
    expect(pryPose(settleMs + (rockMs * 3) / 4).turn).toBe(-rockDegrees);
    expect(pryPose(settleMs + rockMs).progress).toBe(1 / steps);
    expect(pryPose(settleMs + rockMs * steps)).toEqual({
      turn: 0,
      progress: 1,
    });
    expect(pryPose(60000)).toEqual({ turn: 0, progress: 1 });
  });

  it("pauses, plays, closes and repeats without any finger input", () => {
    const { loopPauseMs, loopActiveMs, loopRestMs } = MOTION;
    const cycle = loopPauseMs + loopActiveMs + loopRestMs;
    expect(loopPointer(0).present).toBe(false);
    expect(loopPointer(loopPauseMs)).toEqual(pointer);
    expect(loopPointer(loopPauseMs + loopActiveMs).present).toBe(false);
    expect(loopPointer(cycle + loopPauseMs)).toEqual(pointer);
    const head = createHead(spec);
    const automatic = { automatic: true, present: false, u: 0, v: 1 };
    play(head, loopPauseMs + loopActiveMs - 100, automatic);
    expect(head.at).toBe(spec.keys.open);
    expect(head.hand).toEqual({ x: 1470, y: 400 });
    play(head, loopRestMs + 100, automatic);
    expect(head.at).toBe(spec.keys.first);
    expect(head.handAlpha).toBeLessThan(0.01);
    play(head, loopPauseMs + 1400, automatic);
    expect(head.handAlpha).toBeGreaterThan(0.99);
    expect(Math.abs(head.handTurn)).toBeGreaterThan(0.5);
  });
});

describe("stepHead", () => {
  it("plays the girl at 12fps without redrawing unchanged frames", () => {
    const head = createHead(spec);
    play(head, 1000, { ...pointer, present: false });
    expect(head.frame).toBe(12);
    play(head, 600, { ...pointer, present: false });
    expect(head.frame).toBe(0);
  });

  it("opens after three gentle rocks even with a still pointer, then rests", () => {
    const head = createHead(spec);
    const turns = [];
    let previous = head.at;
    play(head, 12000, pointer, (h) => {
      turns.push(h.handTurn);
      expect(h.at - previous).toBeLessThanOrEqual(
        (MOTION.openSpeed * STEP) / 1000 + 1e-9
      );
      expect(h.hand).toEqual({ x: 1470, y: 400 });
      previous = h.at;
    });
    expect(Math.min(...turns)).toBeLessThan(-2);
    expect(Math.max(...turns)).toBeGreaterThan(2);
    expect(head.progress).toBe(1);
    expect(head.latched).toBe(true);
    expect(head.at).toBe(spec.keys.open);
    expect(head.handTurn).toBe(0);
  });

  it("keeps a wild pointer to four artwork pixels of travel", () => {
    const head = createHead(spec);
    let before = { ...head.hand };
    for (let i = 0; i < 200; i++) {
      stepHead(
        head,
        { present: true, u: i % 2 ? -9 : 9, v: i % 2 },
        head.last + STEP,
        spec
      );
      expect(
        Math.hypot((head.hand.x - 1470) / 2, head.hand.y - 400)
      ).toBeLessThanOrEqual(1 + 1e-9);
      if (i)
        expect(
          Math.hypot(head.hand.x - before.x, head.hand.y - before.y)
        ).toBeLessThanOrEqual((MOTION.maxSpeed * STEP) / 1000 + 1e-9);
      before = { ...head.hand };
    }
  });

  it("starts closed, eases the lid off, and closes gently on leave", () => {
    const head = createHead(spec);
    play(head, MOTION.settleMs + MOTION.rockMs - 20);
    expect(head.at).toBe(spec.keys.first);
    play(head, 10000);
    expect(head.at).toBe(spec.keys.open);
    let previous = head.at;
    const changes = [];
    play(head, 6000, { ...pointer, present: false }, (h) => {
      changes.push(previous - h.at);
      previous = h.at;
    });
    expect(Math.max(...changes)).toBeLessThanOrEqual(
      (MOTION.closeSpeed * STEP) / 1000 + 1e-9
    );
    expect(head.at).toBe(spec.keys.first);
    expect(head.handAlpha).toBeLessThan(0.01);
    expect(head.latched).toBe(false);
  });

  it("does not jump the animation when the clock resumes after a pause", () => {
    const head = createHead(spec);
    play(head, 1000, { automatic: true });
    const before = head.loopClock;
    stepHead(head, { automatic: true }, 60000, spec);
    expect(head.loopClock - before).toBeLessThanOrEqual(50);
    expect(head.progress).toBe(0);
  });
});

describe("drawHead", () => {
  it("draws bottom to top: opening, brain, girl, lid, outlined lid, hand", () => {
    const calls = [];
    const translations = [];
    const rotations = [];
    const ctx = {
      canvas: { width: 800, height: 600 },
      setTransform: (...a) => calls.push(["setTransform", ...a]),
      clearRect: () => calls.push(["clear"]),
      save: () => {},
      restore: () => {},
      translate: (...args) => translations.push(args),
      rotate: (angle) => rotations.push(angle),
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
    head.handTurn = 3;
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
    // Rotation occurs at the tip; the photo's local tip is exactly (0, 0).
    expect(translations.at(-1)).toEqual([1500, 300]);
    expect(rotations.at(-1)).toBeCloseTo((3 * Math.PI) / 180);
    const hand = calls.at(-1);
    expect(hand[2]).toBeCloseTo(-20 * 1.2);
    expect(hand[3]).toBeCloseTo(-874 * 1.2);
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
    expect(turns).toEqual([0, 0]);
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
