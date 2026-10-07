import { figureImages } from "./figureCycle";

/** Static History plates need a reading interval, rather than disappearing at
 * the last line of a short caption-bearing paragraph. Keep them until the next
 * authored visual, a full-width breakout/widget, or the section boundary.
 * Retina/Lottie timing and the authored switch points are left intact.
 * Called by ScrollTrigger on refresh so font/image/viewport reflow is measured.
 */
export function historyFigureEnd(trigger, triggers, records, win = window) {
  const key = trigger.id.replace(/^trigger/i, "");
  const record = records.find(
    (item) => item.id.toLowerCase() === key.toLowerCase()
  );
  if (
    !/^animationFoundationsFig\d+$/i.test(key) ||
    !figureImages(record).length ||
    record.fullscreen ||
    record.scroll ||
    record.isTransition ||
    record.widgetId
  ) {
    return `bottom ${win.innerHeight / 2}`;
  }
  const section = trigger.closest("section");
  if (!section) return `bottom ${win.innerHeight / 2}`;
  const top = trigger.getBoundingClientRect().top;
  const boundaries = [section.getBoundingClientRect().bottom];
  for (const candidate of triggers) {
    if (candidate === trigger || candidate.closest("section") !== section)
      continue;
    const nextTop = candidate.getBoundingClientRect().top;
    if (nextTop > top) boundaries.push(nextTop);
  }
  for (const barrier of section.querySelectorAll(".fb-slot, .wb")) {
    const barrierTop = barrier.getBoundingClientRect().top;
    if (barrierTop > top) boundaries.push(barrierTop);
  }
  return (
    Math.max(top + 1, Math.min(...boundaries)) +
    win.scrollY -
    win.innerHeight / 2
  );
}
