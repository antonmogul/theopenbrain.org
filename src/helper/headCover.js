/*
 * The "open the head" cover (OPENBRAIN-171): the History opener as Sonia
 * and Maura delivered it on 10 Nov 2026 (layers plus a working page). A
 * girl writes, looping at 12 frames a second. A hand holding a tool rests
 * on the crown of her head while the pointer is over the cover; working it
 * to and fro there slides the top of her head off and the brain rises out.
 * Leaving the cover puts it back.
 *
 * The hand is careful (OPENBRAIN-198, Stuart, 14 Nov: "restrict the
 * movement of the hand to a really small region ... very carefully opening
 * her skull", not "violently smashing her head"). In the delivered page
 * the tool was glued to the pointer, so it swung across the whole drawing
 * and each stroke bumped the lid. Now the pointer's place on the cover is
 * mapped into a small ellipse on the crown (`spec.work`), the tool glides
 * towards that spot instead of jumping, and the lid slides at a slow, eased
 * pace however fast the reader moves.
 *
 * This file is the page's logic with the browser taken out, so it can be
 * tested: where the drawing sits in a box, where the tool goes, how its
 * strokes are counted, the lid's and the brain's positions (keyframes the
 * designers measured from the artist's gif), and the drawing itself.
 * HeadCover.vue feeds it the pointer and a canvas.
 *
 * Coordinates are pixels of the artwork (`spec.size`, 2680 × 1732) unless
 * a name says otherwise. The artwork-specific numbers (boxes, the tool's
 * region, the keyframes) are the cover's record in helper/chapterCover.js;
 * the feel of the interaction is MOTION below.
 */

/** How the interaction feels. */
export const MOTION = Object.freeze({
  /**
   * The tool glides to its spot: each second it covers `follow` times the
   * distance left, and never more than `maxSpeed` artwork px. A shake of
   * the mouse is smoothed away; a slow pass is followed.
   */
  follow: 6,
  maxSpeed: 150,
  /** Strokes (a move and its reverse) that open the head fully. */
  steps: 6,
  /**
   * A stroke of the tool is at least this long, and counts once it has
   * come back this far. In artwork px of the tool's own small travel:
   * about a tenth of the cover's width under the pointer.
   */
  minStroke: 9,
  back: 4.5,
  /** Strokes only count this long after the hand has come in, in ms. */
  settleMs: 250,
  /** Left alone this long, a half-open head starts to sink back, in ms. */
  idleMs: 2500,
  sinkPerSec: 0.1,
  /**
   * How far each stroke takes the lid: progress to this power, over the
   * keys. Below 1 the first stroke already shows (the lid loosens), and
   * the slide itself comes with the third.
   */
  liftCurve: 0.8,
  /**
   * The lid's pace, in key positions a second. It starts and stops softly
   * (`lidAccel`, `lidEase`: per second) and is never faster than
   * `openSpeed` going up or `closeSpeed` coming down, so the whole lift
   * takes about five seconds. The delivered page ran at 30 and 12.
   */
  openSpeed: 2.5,
  closeSpeed: 4,
  lidEase: 3,
  lidAccel: 6,
  /** How fast the hand fades in and out. */
  handFade: 6,
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

/**
 * Where the tool's tip goes for a pointer at (u, v), each 0 to 1 across the
 * cover: the same place in the small ellipse `work` on the crown, so the
 * whole cover's width is the ellipse's width. Corners are pulled in to the
 * ellipse's edge.
 */
export function toolSpot(u, v, work) {
  let x = clamp(u, 0, 1) * 2 - 1;
  let y = clamp(v, 0, 1) * 2 - 1;
  const r = Math.hypot(x, y);
  if (r > 1) {
    x /= r;
    y /= r;
  }
  return { x: work.x + x * work.rx, y: work.y + y * work.ry };
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
    inside: false, // the pointer is over the cover
    enteredAt: 0,
    hand: { x: spec.work.x, y: spec.work.y }, // the tool's tip
    handAlpha: 0,
    anchor: { x: spec.work.x, y: spec.work.y }, // where the stroke began
    reach: { x: spec.work.x, y: spec.work.y }, // the furthest it has got
    progress: 0, // 0 closed … 1 open
    latched: false, // fully open: stays so until the pointer leaves
    lastMove: now,
    at: spec.keys.first, // the shown key position
    atSpeed: 0, // and how fast it is changing, keys a second
  };
}

/**
 * One frame. `pointer` is { present, u, v }: over the cover at all, and
 * where across it (0 to 1 each way). Changes `head` in place and returns
 * it.
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

  // The tool keeps to its small region on the crown and glides there.
  const was = head.inside;
  head.inside = !!pointer.present;
  if (head.inside) {
    const spot = toolSpot(pointer.u, pointer.v, spec.work);
    if (!was && head.handAlpha < 0.02) {
      head.hand = spot; // not on show yet: it comes in where it belongs
    } else {
      const dx = spot.x - head.hand.x;
      const dy = spot.y - head.hand.y;
      const d = Math.hypot(dx, dy);
      if (d < 0.05) head.hand = spot;
      else {
        const go = Math.min(
          d * Math.min(1, dt * motion.follow),
          motion.maxSpeed * dt
        );
        head.hand = {
          x: head.hand.x + (dx / d) * go,
          y: head.hand.y + (dy / d) * go,
        };
      }
    }
    if (!was) {
      head.enteredAt = now;
      head.anchor = { ...head.hand };
      head.reach = { ...head.hand };
    }
  }
  head.handAlpha +=
    ((head.inside ? 1 : 0) - head.handAlpha) *
    Math.min(1, dt * motion.handFade);

  // Strokes: out from the anchor, then back. Each one is a step.
  if (!head.inside) {
    // The pointer has left: the head closes.
    head.latched = false;
    head.progress = 0;
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
      head.lastMove = now;
      head.anchor = { ...head.reach };
      head.reach = { ...head.hand };
      if (head.progress > 1 - 1e-9) {
        head.progress = 1;
        head.latched = true;
      }
    } else if (back > motion.back && furthest < motion.minStroke) {
      head.anchor = { ...head.hand }; // a jitter: start again
      head.reach = { ...head.hand };
    }
    if (now - head.lastMove > motion.idleMs && !head.latched)
      head.progress = Math.max(0, head.progress - dt * motion.sinkPerSec);
  }

  // The lid follows slowly: it picks up speed, slides, and settles.
  const { first, open } = spec.keys;
  const goal = head.latched
    ? open
    : head.progress < 0.01
      ? first
      : first + head.progress ** motion.liftCurve * (open - first);
  const left = goal - head.at;
  const cap = left > 0 ? motion.openSpeed : motion.closeSpeed;
  const want = clamp(left * motion.lidEase, -cap, cap);
  head.atSpeed += (want - head.atSpeed) * Math.min(1, dt * motion.lidAccel);
  const next = head.at + head.atSpeed * dt;
  if (Math.abs(goal - next) < 0.002 || (goal - next) * left < 0) {
    head.at = goal; // arrived (or would pass it)
    head.atSpeed = 0;
  } else head.at = next;
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
    const s = spec.hand.scale;
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
  ctx.translate(px + pose.lidX, py + pose.lidY);
  ctx.rotate((pose.lidTurn * Math.PI) / 180);
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
