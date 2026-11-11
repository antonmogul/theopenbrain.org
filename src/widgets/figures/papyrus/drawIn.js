/*
 * When each sign of a papyrus part starts to draw (OPENBRAIN-176). The art
 * is lines of signs; the draw-in runs through them in reading order, line by
 * line and left to right, as one sweep. Pure, in the art's own units.
 */

/** How long one sign takes to draw, in seconds. */
export const SIGN_SECONDS = 0.42;

/**
 * The whole part's time for `rows` lines: a short part is quick, a long one
 * never takes much more than a second.
 */
export function drawSeconds(rows) {
  return Math.min(1.4, 0.7 + 0.12 * rows);
}

/**
 * Sorts boxes ({ x, y, width, height }) into lines: a box starts a new line
 * when it begins more than `gap` below everything before it. The small
 * numerals over a line sit closer than that, so they stay with their line.
 * Returns, for each box, its line's index.
 */
export function lineOf(boxes, gap = 6) {
  const order = boxes.map((_, i) => i).sort((a, b) => boxes[a].y - boxes[b].y);
  const lines = new Array(boxes.length).fill(0);
  let line = -1;
  let bottom = -Infinity;
  for (const i of order) {
    const b = boxes[i];
    if (b.y > bottom + gap) line += 1;
    bottom = Math.max(bottom, b.y + b.height);
    lines[i] = Math.max(line, 0);
  }
  return lines;
}

/**
 * The delay before each box starts, in seconds, and the time the whole
 * sweep takes: { delays, total }. A line's signs start across its share of
 * the sweep, by their centre's place between the art's left and right.
 */
export function drawDelays(boxes) {
  if (!boxes.length) return { delays: [], total: 0 };
  const lines = lineOf(boxes);
  const rows = Math.max(...lines) + 1;
  const left = Math.min(...boxes.map((b) => b.x));
  const right = Math.max(...boxes.map((b) => b.x + b.width));
  const width = right - left || 1;
  const total = drawSeconds(rows);
  const sweep = total - SIGN_SECONDS;
  const delays = boxes.map((b, i) => {
    const across = (b.x + b.width / 2 - left) / width;
    return Number((((lines[i] + across) / rows) * sweep).toFixed(3));
  });
  return { delays, total };
}
