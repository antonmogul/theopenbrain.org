/*
 * History's "open the head" cover (OPENBRAIN-40/41, following 171/198).
 * The tool pries at the back end of the skull's cut, rocking about its tip.
 * A desktop pointer rocks the hand around that contact point; three
 * back-and-forth mouse strokes ease the lid off. Phones play the same sequence, rest,
 * close and repeat without needing a finger on the drawing.
 *
 * All positions are artwork pixels (2680 × 1732), never viewport pixels.
 * HeadCover.vue supplies the canvas, decoded layers and a visible clock.
 */

/** How the interaction feels. */
export const MOTION = Object.freeze({
  /** Pointer nudges settle gently within the tiny contact region. */
  follow: 6,
  maxSpeed: 20,
  /** Three full back-and-forth rocks, pivoting about the tool's tip. */
  steps: 3,
  rockMs: 1600,
  rockDegrees: 3,
  maxTurnSpeed: 12,
  settleMs: 350,
  /** Mobile: pause, pry/lift/hold, then give the lid time to close. */
  loopPauseMs: 1000,
  loopActiveMs: 11000,
  loopRestMs: 6000,
  /**
   * How far each completed rock takes the lid: progress to this power,
   * over the keys. Below 1 the first rock loosens the lid, and the slide
   * itself comes with the third.
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
/** Phones and coarse pointers play without touch-and-hold. */
export function headAutoplays(width, coarse = false) {
  return width < 1024 || coarse;
}

/** The phone's visible-time loop; a neutral pointer cannot drag the tip. */
export function loopPointer(elapsed, motion = MOTION) {
  const period = motion.loopPauseMs + motion.loopActiveMs + motion.loopRestMs;
  const at = elapsed % period;
  return {
    present:
      at >= motion.loopPauseMs && at < motion.loopPauseMs + motion.loopActiveMs,
    u: 0.5,
    v: 0.5,
  };
}

/** Rock around a fixed tip; only completed rocks loosen the lid. */
export function pryPose(elapsed, motion = MOTION) {
  const at = Math.max(0, elapsed - motion.settleMs);
  const rocks = Math.min(motion.steps, at / motion.rockMs);
  return {
    turn:
      rocks >= motion.steps
        ? 0
        : Math.sin(rocks * Math.PI * 2) * motion.rockDegrees,
    progress: Math.floor(rocks) / motion.steps,
  };
}

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
 * cover: the same place in the small ellipse `work` at the cut, so the
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
    pointerTurn: 0, // previous mouse target, degrees
    pryTravel: 0, // accumulated mouse rocking, degrees
    workClock: 0, // visible time spent prying, in ms
    loopClock: 0, // phone loop pauses while offscreen
    handTurn: 0, // degrees about the tip
    hand: { x: spec.work.x, y: spec.work.y }, // the tool's tip
    handAlpha: 0,
    progress: 0, // 0 closed … 1 open
    latched: false, // fully open: stays so until the pointer leaves
    at: spec.keys.first, // the shown key position
    atSpeed: 0, // and how fast it is changing, keys a second
  };
}

/**
 * One visible frame. `pointer` is { present, u, v } (0 to 1 across the
 * cover), or { automatic: true } on phones. Changes `head` in place.
 * A bounded dt means a suspended frame never skips the whole sequence.
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

  // Phones use visible time; desktop prying advances only with the mouse.
  head.loopClock += dt * 1000;
  const automatic = !!pointer.automatic;
  if (automatic) pointer = loopPointer(head.loopClock, motion);
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
    head.workClock = was ? head.workClock + dt * 1000 : 0;
  }
  head.handAlpha +=
    ((head.inside ? 1 : 0) - head.handAlpha) *
    Math.min(1, dt * motion.handFade);

  // Either horizontal or vertical strokes can work the tool; diagonal
  // strokes stay within the same improved range about the cut-line pivot.
  const mouseTurn =
    clamp((pointer.u + pointer.v - 1) * 2, -1, 1) * motion.rockDegrees;
  if (!head.inside) head.pryTravel = 0;
  else if (!automatic && was) {
    head.pryTravel += Math.abs(mouseTurn - head.pointerTurn);
  }
  head.pointerTurn = mouseTurn;
  const pry = automatic
    ? pryPose(head.workClock, motion)
    : {
        turn: mouseTurn,
        progress: Math.min(
          1,
          head.pryTravel / (4 * motion.rockDegrees * motion.steps)
        ),
      };
  head.progress = head.inside ? pry.progress : 0;
  head.latched = head.progress === 1;
  if (!head.inside) head.workClock = 0;
  const turn = head.inside ? pry.turn : 0;
  const change = (turn - head.handTurn) * Math.min(1, dt * motion.follow);
  head.handTurn += clamp(
    change,
    -motion.maxTurnSpeed * dt,
    motion.maxTurnSpeed * dt
  );
  if (Math.abs(turn - head.handTurn) < 0.001) head.handTurn = turn;

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
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(head.hand.x, head.hand.y);
    ctx.rotate((head.handTurn * Math.PI) / 180);
    ctx.drawImage(
      images.hand,
      -spec.hand.tip[0] * s,
      -spec.hand.tip[1] * s,
      w * s,
      h * s
    );
    ctx.restore();
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
