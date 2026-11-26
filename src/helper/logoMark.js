/*
 * The brain in the book's logo, as its own outline (OPENBRAIN-92).
 *
 * The designers' logo.svg draws the mark as the regions Illustrator's shape
 * builder left: each path is a piece of page, bounded partly by the book's
 * straight edges and partly by the brain's curve. Nothing in the file is
 * "the brain", so the brain cannot be given its own stroke.
 *
 * At the size of an icon that matters. The book is three nested pages, so
 * its lines sit close together and read dark; the brain is one line in the
 * open and reads thin beside it. BookLogo draws this outline over the
 * artwork so the brain's line can be a little heavier than the book's
 * (`--logo-brain-stroke`), which is what makes the two weigh the same.
 *
 * The rule: in the mark, every curve is brain and every straight line is
 * book. Runs of curves are kept, lines are dropped, and the specks the shape
 * builder left along the spine (curves a fraction of a unit long) go too.
 * Derived from the file on load, so a new logo brings its own brain; an
 * artwork this cannot read gives "", and the logo is drawn as before.
 */

const COMMAND = /([MmLlHhVvCcSsZz])([^MmLlHhVvCcSsZz]*)/g;
const NUMBER = /-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?/gi;
// Numbers a command takes each time it repeats.
const ARITY = { m: 2, l: 2, h: 1, v: 1, c: 6, s: 4, z: 0 };
// A run of curves shorter than this (artwork units, corner to corner of its
// box) is a speck, not a piece of the brain.
const MIN_RUN = 3;

const round = (n) => Math.round(n * 100) / 100;

/**
 * The runs of curves in one path's `d`, each as an absolute path string.
 * @param {string} d
 * @returns {string[]}
 */
export function curveRuns(d) {
  const runs = [];
  let run = null;
  let x = 0;
  let y = 0;
  let startX = 0;
  let startY = 0;
  // The last curve's second control point, for a following S.
  let ctrl = null;

  const end = () => {
    if (run) {
      const w = run.maxX - run.minX;
      const h = run.maxY - run.minY;
      if (Math.hypot(w, h) >= MIN_RUN) runs.push(run.d.join(""));
    }
    run = null;
  };
  const curve = (x1, y1, x2, y2, x3, y3) => {
    if (!run) {
      run = {
        d: [`M${round(x)},${round(y)}`],
        minX: x,
        maxX: x,
        minY: y,
        maxY: y,
      };
    }
    run.d.push(
      `C${[x1, y1, x2, y2, x3, y3].map(round).join(",").replace(/,-/g, "-")}`
    );
    run.minX = Math.min(run.minX, x3);
    run.maxX = Math.max(run.maxX, x3);
    run.minY = Math.min(run.minY, y3);
    run.maxY = Math.max(run.maxY, y3);
    ctrl = [x2, y2];
    x = x3;
    y = y3;
  };

  for (const [, letter, rest] of String(d || "").matchAll(COMMAND)) {
    const cmd = letter.toLowerCase();
    const rel = letter === cmd;
    const nums = (rest.match(NUMBER) || []).map(Number);
    const step = ARITY[cmd];
    if (cmd === "z") {
      end();
      x = startX;
      y = startY;
      ctrl = null;
      continue;
    }
    for (let i = 0; i + step <= nums.length; i += step) {
      const n = nums.slice(i, i + step);
      const ox = rel ? x : 0;
      const oy = rel ? y : 0;
      if (cmd === "c") {
        curve(ox + n[0], oy + n[1], ox + n[2], oy + n[3], ox + n[4], oy + n[5]);
        continue;
      }
      if (cmd === "s") {
        const [cx, cy] = ctrl ? [2 * x - ctrl[0], 2 * y - ctrl[1]] : [x, y];
        curve(cx, cy, ox + n[0], oy + n[1], ox + n[2], oy + n[3]);
        continue;
      }
      // A straight line or a move: the book's, and the end of a run.
      end();
      ctrl = null;
      if (cmd === "h") x = ox + n[0];
      else if (cmd === "v") y = oy + n[0];
      else {
        x = ox + n[0];
        y = oy + n[1];
      }
      // After the first pair an M goes on as lines; only that pair moves.
      if (cmd === "m" && i === 0) {
        startX = x;
        startY = y;
      }
    }
  }
  end();
  return runs;
}

/**
 * One path string for the brain's outline in the logo's mark, or "".
 * @param {string} svg the logo file's text
 * @param {{ maxX?: number }} [options] the mark ends here (the words follow)
 */
export function brainOutline(svg, { maxX = 125 } = {}) {
  const out = [];
  for (const [, d] of String(svg || "").matchAll(
    /<path\b[^>]*?\sd="([^"]*)"/g
  )) {
    // The words beside the mark are curves too.
    const first = d.match(NUMBER);
    if (!first || Number(first[0]) > maxX) continue;
    out.push(...curveRuns(d));
  }
  return out.join("");
}
