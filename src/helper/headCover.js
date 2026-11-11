/*
 * The "open the head" cover (OPENBRAIN-171): the History opener as Sonia
 * and Maura delivered it on 10 Nov 2026 (layers plus a working page). A
 * girl writes, looping at 12 frames a second. A hand holding a tool comes
 * in with the pointer from the upper right; rubbing it back and forth over
 * her head (four strokes) slides the top of her head off and the brain
 * rises out. Moving off the head puts it back.
 *
 * This file is their page's logic with the browser taken out, so it can be
 * tested: where the drawing sits in a box, how the pointer's strokes are
 * counted, the lid's and the brain's positions (keyframes they measured
 * from the artist's gif), and the drawing itself. HeadCover.vue feeds it
 * the pointer and a canvas. The numbers are theirs; where one of ours
 * differs, the comment says so.
 *
 * Coordinates are pixels of the artwork (`spec.size`, 2680 × 1732) unless
 * a name says otherwise. The artwork-specific numbers (boxes, the hand's
 * zone, the head's ellipse, the keyframes) are the cover's record in
 * helper/chapterCover.js; the feel of the interaction is MOTION below.
 */

/** How the interaction feels. From the delivered page, except `lidOver`. */
export const MOTION = Object.freeze({
  /** Strokes (a move and its reverse) that open the head fully. */
  steps: 4,
  /** A stroke is at least this long, and counts once it reverses this far. */
  minStroke: 140,
  back: 70,
  /** Strokes only count this long after the hand has come in, in ms. */
  settleMs: 250,
  /** Left alone this long, a half-open head starts to sink back, in ms. */
  idleMs: 2500,
  sinkPerSec: 0.1,
  /** Key positions a second: opening is quick, closing is slower. */
  openSpeed: 30,
  closeSpeed: 12,
  /** How fast the hand fades in and out, and how long a stroke's bump lasts. */
  handFade: 16,
  kickDecay: 5,
  /** The right edge of the hand photograph fades over this many of its px. */
  handFadePx: 260,
  /**
   * The lid passes in front of the hand as it comes off (Anton, 11 Nov): the
   * tool works on top of a closed head and reaches in under a lifted one.
   * Between these two distances of lid travel (|dx| + |dy|, artwork px) the
   * hand's part over the lid fades out.
   */
  lidOver: [40, 200],
});

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

/**
 * Where the artwork sits in a box of `width` × `height` CSS px: `fit`
 * ([x, y, w, h], the part of the artwork that must always show) is centred
 * and as large as fits, less a small margin. Returns CSS px per artwork px
 * and the artwork's origin in the box.
 */
export function sceneFit({ width = 0, height = 0 } = {}, fit, margin = 0.97) {
  const [x, y, w, h] = fit;
  if (!(width > 0 && height > 0 && w > 0 && h > 0))
    return { scale: 0, left: 0, top: 0 };
  const scale = Math.min(width / w, height / h) * margin;
  return {
    scale,
    left: width / 2 - (x + w / 2) * scale,
    top: height / 2 - (y + h / 2) * scale,
  };
}

/** Even-odd test: is (x, y) inside the polygon [[x, y], …]? */
export function inPolygon(x, y, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    if (
      a[1] > y !== b[1] > y &&
      x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]
    )
      inside = !inside;
  }
  return inside;
}

/** Is (x, y) inside the ellipse { x, y, rx, ry }? */
export function inEllipse(x, y, e) {
  return Math.hypot((x - e.x) / e.rx, (y - e.y) / e.ry) <= 1;
}

/**
 * The lid's and the brain's offsets at key position `at`, between `first`
 * (closed) and `first + keys.length - 1` (open). Each key is
 * [lid dx, lid dy, lid rotation in degrees, brain dx, brain dy].
 */
export function lidPose(at, keys, first) {
  const last = first + keys.length - 1;
  const f = clamp(at, first, last - 0.001);
  const k = Math.floor(f);
  const t = f - k;
  const a = keys[k - first];
  const b = keys[k - first + 1];
  const mix = (i) => a[i] + (b[i] - a[i]) * t;
  return {
    lidX: mix(0),
    lidY: mix(1),
    lidTurn: mix(2),
    brainX: mix(3),
    brainY: mix(4),
  };
}

/** A new, closed head. `now` is the clock stepHead will be given, in ms. */
export function createHead(spec, now = 0) {
  return {
    last: now,
    frame: 0, // which body frame
    frameClock: 0,
    inside: false, // the pointer is in the hand's zone
    enteredAt: 0,
    hand: { x: 0, y: 0 },
    handAlpha: 0,
    anchor: { x: 0, y: 0 }, // where the current stroke began
    reach: { x: 0, y: 0 }, // the furthest it has got from there
    progress: 0, // 0 closed … 1 open
    latched: false, // fully open: stays so until the hand leaves the head
    kick: 0, // 1 at a stroke, decaying: the lid's small bump
    lastMove: now,
    at: spec.keys.first, // the shown key position
  };
}

/**
 * One frame. `pointer` is { present, x, y } in artwork px (present: over the
 * cover at all). Changes `head` in place and returns it. This is the
 * delivered page's frame() without the drawing.
 */
export function stepHead(head, pointer, now, spec, motion = MOTION) {
  const dt = Math.min(0.05, Math.max(0, (now - head.last) / 1000));
  head.last = now;

  // The girl writes on, whatever the hand does.
  const fps = spec.body.fps;
  head.frameClock += dt;
  while (head.frameClock >= 1 / fps) {
    head.frameClock -= 1 / fps;
    head.frame = (head.frame + 1) % spec.body.frames.length;
  }

  // The hand is glued to the pointer, and shows only in its zone.
  const was = head.inside;
  head.inside = !!pointer.present && inPolygon(pointer.x, pointer.y, spec.zone);
  if (pointer.present) {
    head.hand.x = pointer.x;
    head.hand.y = pointer.y;
  }
  if (head.inside && !was) {
    head.enteredAt = now;
    head.anchor = { ...head.hand };
    head.reach = { ...head.hand };
  }
  head.handAlpha +=
    ((head.inside ? 1 : 0) - head.handAlpha) *
    Math.min(1, dt * motion.handFade);

  // Strokes: out from the anchor, then back. Each one is a clear step.
  const onHead = head.inside && inEllipse(head.hand.x, head.hand.y, spec.head);
  if (!onHead) {
    // Off the head: it closes.
    head.latched = false;
    head.progress = 0;
    head.kick = 0;
    head.lastMove = now;
    head.anchor = { ...head.hand };
    head.reach = { ...head.hand };
  } else if (now - head.enteredAt >= motion.settleMs && !head.latched) {
    const out = dist(head.hand, head.anchor);
    const furthest = dist(head.reach, head.anchor);
    const back = dist(head.hand, head.reach);
    if (out > furthest) {
      head.reach = { ...head.hand }; // still travelling outward
      head.lastMove = now;
    } else if (furthest >= motion.minStroke && back >= motion.back) {
      head.progress = Math.min(1, head.progress + 1 / motion.steps);
      head.kick = 1;
      head.lastMove = now;
      head.anchor = { ...head.reach };
      head.reach = { ...head.hand };
      if (head.progress >= 1) head.latched = true;
    } else if (back > motion.back && furthest < motion.minStroke) {
      head.anchor = { ...head.hand }; // a jitter: start again
      head.reach = { ...head.hand };
    }
    if (now - head.lastMove > motion.idleMs && !head.latched)
      head.progress = Math.max(0, head.progress - dt * motion.sinkPerSec);
  }
  head.kick = Math.max(0, head.kick - dt * motion.kickDecay);

  // The shown position follows: quickly open, slowly shut.
  const { first, open, keys } = spec.keys;
  const span = keys.length - 2.5; // the opening's keys, as in the page
  const goal = head.latched
    ? open
    : head.progress < 0.01
      ? first
      : first + 1 + (1 - (1 - head.progress) ** 2) * span;
  const step = (goal > head.at ? motion.openSpeed : motion.closeSpeed) * dt;
  head.at =
    goal > head.at
      ? Math.min(goal, head.at + step)
      : Math.max(goal, head.at - step);
  return head;
}

/**
 * The hand photograph with its right edge faded out, so the forearm runs
 * off softly where the photograph ends. Drawn once, to a canvas.
 */
export function fadedHand(image, spec, makeCanvas, motion = MOTION) {
  const [w, h] = spec.hand.size;
  const canvas = makeCanvas(w, h);
  const g = canvas.getContext("2d");
  g.drawImage(image, 0, 0, w, h);
  g.globalCompositeOperation = "destination-in";
  const solid = (w - motion.handFadePx) / w;
  const fade = g.createLinearGradient(0, 0, w, 0);
  fade.addColorStop(0, "rgba(0,0,0,1)");
  fade.addColorStop(solid, "rgba(0,0,0,1)");
  for (let i = 1; i <= 10; i++) {
    const u = i / 10;
    fade.addColorStop(
      solid + u * (1 - solid),
      `rgba(0,0,0,${1 - u * u * (3 - 2 * u)})`
    );
  }
  g.fillStyle = fade;
  g.fillRect(0, 0, w, h);
  return canvas;
}

/**
 * Draw the scene. `view` is sceneFit's result plus `dpr`; `images` has
 * oval, brain, body (an array), lid, lidOutline and hand (fadedHand's
 * canvas). Bottom to top: the dark opening, the brain, the girl, the hand,
 * the lid, and the hand once more for as long as the lid is still on (see
 * MOTION.lidOver): a canvas has no z-index, so the order is the stacking.
 */
export function drawHead(ctx, images, spec, head, view, motion = MOTION) {
  const { scale, left, top, dpr = 1 } = view;
  const pose = lidPose(head.at, spec.keys.keys, spec.keys.first);
  const bump = Math.sin(head.kick * Math.PI);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.setTransform(scale * dpr, 0, 0, scale * dpr, left * dpr, top * dpr);
  ctx.drawImage(images.oval, spec.oval.at[0], spec.oval.at[1]);
  ctx.drawImage(
    images.brain,
    spec.brain.at[0] + pose.brainX,
    spec.brain.at[1] + pose.brainY
  );
  ctx.drawImage(images.body[head.frame], spec.body.at[0], spec.body.at[1]);

  // How far the lid has come off decides which side of it the hand is on.
  const [near, far] = motion.lidOver;
  const u = clamp(
    (Math.abs(pose.lidX) + Math.abs(pose.lidY) - near) / (far - near),
    0,
    1
  );
  const under = u * u * (3 - 2 * u);
  const shown = head.handAlpha > 0.01 ? head.handAlpha : 0;
  const drawHand = (alpha) => {
    if (alpha <= 0.004) return;
    const [w, h] = spec.hand.size;
    const s = spec.hand.scale * (1 - 0.05 * bump);
    ctx.globalAlpha = alpha;
    ctx.drawImage(
      images.hand,
      head.hand.x - spec.hand.tip[0] * s,
      head.hand.y - spec.hand.tip[1] * s,
      w * s,
      h * s
    );
    ctx.globalAlpha = 1;
  };
  // Two copies, one each side of the lid. Away from the lid they add up to
  // the hand's own opacity, so its fade in and out shows no seam at the
  // lid's edge; over the lid only the top copy shows.
  const over = shown * (1 - under);
  drawHand(over < 1 ? 1 - (1 - shown) / (1 - over) : 0);

  const [px, py] = spec.lid.pivot;
  ctx.save();
  ctx.translate(px + pose.lidX, py + pose.lidY + bump * 10);
  ctx.rotate(((pose.lidTurn + bump * 1.2) * Math.PI) / 180);
  ctx.translate(-px, -py);
  ctx.drawImage(images.lid, spec.lid.at[0], spec.lid.at[1]);
  // The outlined lid fades in as soon as it lifts.
  ctx.globalAlpha = Math.min(
    1,
    (Math.abs(pose.lidX) + Math.abs(pose.lidY)) / 25
  );
  ctx.drawImage(images.lidOutline, spec.lid.at[0], spec.lid.at[1]);
  ctx.globalAlpha = 1;
  ctx.restore();

  drawHand(over);
}
