/*
 * Which opening is the pointer on? (OPENBRAIN-173.) Each method has an
 * elliptical zone over its opening and its numbered disc, some of them
 * turned. Where two zones meet (the grooved and the drilled openings' do,
 * just), the spot goes to the opening it is nearer to. Pure, in the stage's
 * own units.
 */

/** Is (x, y) inside the zone { x, y, rx, ry, turn } (degrees clockwise)? */
export function inZone(x, y, zone) {
  const a = ((zone.turn || 0) * Math.PI) / 180;
  const dx = x - zone.x;
  const dy = y - zone.y;
  const lx = dx * Math.cos(a) + dy * Math.sin(a);
  const ly = -dx * Math.sin(a) + dy * Math.cos(a);
  return (lx / zone.rx) ** 2 + (ly / zone.ry) ** 2 <= 1;
}

/**
 * The index of the method whose zone holds (x, y), or null. Among several,
 * the one whose opening (`at`) is nearest.
 */
export function openingAt(x, y, methods) {
  let best = null;
  let bestDistance = Infinity;
  methods.forEach((m, i) => {
    if (!inZone(x, y, m.zone)) return;
    const d = Math.hypot(x - m.at.x, y - m.at.y);
    if (d < bestDistance) {
      best = i;
      bestDistance = d;
    }
  });
  return best;
}
